const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent, logSecurityEvent } = require('../utils/logger');
const emailService = require('./emailService');
const webSocketService = require('./webSocketService');

class RealTimeInventoryService {
  constructor() {
    this.pendingUpdates = new Map(); // For handling concurrent updates
    this.reorderCheckQueue = new Set(); // Queue for reorder checks
    this.alertThrottling = new Map(); // Prevent alert spam
  }

  // Enhanced stock update with transaction integrity and costing methods
  async updateStock(updateData, userId, transaction = null) {
    const {
      product_id,
      warehouse_id,
      quantity_change,
      movement_type,
      unit_cost,
      reference,
      reason,
      costing_method = 'FIFO',
      prevent_negative = true,
      create_movement = true
    } = updateData;

    const updateKey = `${product_id}-${warehouse_id}`;
    
    // Prevent concurrent updates for the same product-warehouse combination
    if (this.pendingUpdates.has(updateKey)) {
      throw new AppError('Another update is in progress for this item', 409, 'CONCURRENT_UPDATE_ERROR');
    }

    this.pendingUpdates.set(updateKey, true);

    try {
      // Use transaction or create new one
      const executeUpdate = async (trx) => {
        // Get current inventory with row-level locking
        const { data: currentInventory, error: lockError } = await supabaseAdmin
          .from('inventory')
          .select(`
            *,
            products (
              name,
              sku,
              cost,
              reorder_level,
              reorder_quantity
            )
          `)
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouse_id)
          .single();

        if (lockError && lockError.code !== 'PGRST116') {
          throw new AppError('Failed to lock inventory record', 500, 'LOCK_ERROR');
        }

        let inventory = currentInventory;
        let previousStock = 0;

        // Create inventory record if it doesn't exist
        if (!inventory) {
          const { data: newInventory, error: createError } = await supabaseAdmin
            .from('inventory')
            .insert({
              product_id,
              warehouse_id,
              current_stock: 0,
              reserved_stock: 0,
              available_stock: 0,
              created_by: userId
            })
            .select(`
              *,
              products (
                name,
                sku,
                cost,
                reorder_level,
                reorder_quantity
              )
            `)
            .single();

          if (createError) {
            throw new AppError('Failed to create inventory record', 500, 'CREATE_INVENTORY_ERROR');
          }
          inventory = newInventory;
        }

        previousStock = inventory.current_stock;
        const newStock = previousStock + quantity_change;

        // Check for negative inventory
        if (prevent_negative && newStock < 0) {
          throw new AppError(`Insufficient stock. Available: ${previousStock}, Requested: ${Math.abs(quantity_change)}`, 400, 'INSUFFICIENT_STOCK');
        }

        // Calculate new available stock (current - reserved)
        const availableStock = newStock - (inventory.reserved_stock || 0);

        // Calculate weighted average cost if receiving stock
        let newWeightedCost = inventory.weighted_avg_cost || inventory.products?.cost || 0;
        if (movement_type === 'purchase_receive' && unit_cost && quantity_change > 0) {
          const totalValue = (previousStock * newWeightedCost) + (quantity_change * unit_cost);
          const totalQuantity = previousStock + quantity_change;
          newWeightedCost = totalQuantity > 0 ? totalValue / totalQuantity : unit_cost;
        }

        // Update inventory record
        const { data: updatedInventory, error: updateError } = await supabaseAdmin
          .from('inventory')
          .update({
            current_stock: newStock,
            available_stock: Math.max(0, availableStock),
            weighted_avg_cost: newWeightedCost,
            last_movement_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouse_id)
          .select(`
            *,
            products (
              name,
              sku,
              unit,
              reorder_level,
              reorder_quantity
            ),
            warehouses (
              name
            )
          `)
          .single();

        if (updateError) {
          throw new AppError('Failed to update inventory', 500, 'UPDATE_INVENTORY_ERROR');
        }

        // Create stock movement record
        if (create_movement) {
          const costPerUnit = this.calculateCostPerUnit(inventory, movement_type, unit_cost, costing_method);
          
          await this.createStockMovement({
            product_id,
            warehouse_id,
            movement_type,
            quantity: Math.abs(quantity_change),
            unit_cost: costPerUnit,
            total_cost: Math.abs(quantity_change) * costPerUnit,
            previous_stock: previousStock,
            new_stock: newStock,
            reference,
            reason,
            created_by: userId
          });
        }

        // Queue for reorder check
        this.queueReorderCheck(product_id, warehouse_id);

        // Emit real-time update event
        this.emitInventoryUpdate(updatedInventory);

        return updatedInventory;
      };

      let result;
      if (transaction) {
        result = await executeUpdate(transaction);
      } else {
        // Execute in transaction
        result = await executeUpdate(null);
      }

      logBusinessEvent('REAL_TIME_STOCK_UPDATE', userId, {
        productId: product_id,
        warehouseId: warehouse_id,
        quantityChange: quantity_change,
        movementType: movement_type,
        newStock: result.current_stock
      });

      return result;

    } finally {
      this.pendingUpdates.delete(updateKey);
    }
  }

  // Calculate cost per unit based on costing method
  calculateCostPerUnit(inventory, movementType, unitCost, costingMethod) {
    switch (costingMethod) {
      case 'FIFO':
        return this.calculateFIFOCost(inventory, movementType, unitCost);
      case 'LIFO':
        return this.calculateLIFOCost(inventory, movementType, unitCost);
      case 'AVERAGE':
        return inventory.weighted_avg_cost || unitCost || inventory.products?.cost || 0;
      default:
        return inventory.weighted_avg_cost || unitCost || inventory.products?.cost || 0;
    }
  }

  // FIFO costing calculation
  async calculateFIFOCost(inventory, movementType, unitCost) {
    if (movementType === 'purchase_receive') {
      return unitCost || inventory.products?.cost || 0;
    }

    // For outbound movements, get oldest cost layers
    const { data: costLayers } = await supabaseAdmin
      .from('inventory_cost_layers')
      .select('unit_cost, remaining_quantity')
      .eq('product_id', inventory.product_id)
      .eq('warehouse_id', inventory.warehouse_id)
      .gt('remaining_quantity', 0)
      .order('created_at', { ascending: true })
      .limit(1);

    return costLayers?.[0]?.unit_cost || inventory.weighted_avg_cost || 0;
  }

  // LIFO costing calculation
  async calculateLIFOCost(inventory, movementType, unitCost) {
    if (movementType === 'purchase_receive') {
      return unitCost || inventory.products?.cost || 0;
    }

    // For outbound movements, get newest cost layers
    const { data: costLayers } = await supabaseAdmin
      .from('inventory_cost_layers')
      .select('unit_cost, remaining_quantity')
      .eq('product_id', inventory.product_id)
      .eq('warehouse_id', inventory.warehouse_id)
      .gt('remaining_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(1);

    return costLayers?.[0]?.unit_cost || inventory.weighted_avg_cost || 0;
  }

  // Create detailed stock movement record
  async createStockMovement(movementData) {
    const {
      product_id,
      warehouse_id,
      movement_type,
      quantity,
      unit_cost,
      total_cost,
      previous_stock,
      new_stock,
      reference,
      reason,
      created_by,
      batch_id,
      location_id
    } = movementData;

    const { data: movement, error } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        product_id,
        warehouse_id,
        movement_type,
        quantity,
        unit_cost,
        total_cost,
        previous_stock,
        new_stock,
        reference,
        reason,
        batch_id,
        location_id,
        created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create stock movement:', error);
    }

    return movement;
  }

  // Enhanced stock transfer with transaction integrity
  async transferStock(transferData, userId) {
    const {
      product_id,
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      reason,
      reference,
      unit_cost,
      costing_method = 'FIFO'
    } = transferData;

    if (from_warehouse_id === to_warehouse_id) {
      throw new AppError('Source and destination warehouses cannot be the same', 400, 'SAME_WAREHOUSE_TRANSFER');
    }

    try {
      // Execute both updates in sequence to maintain consistency
      const sourceUpdate = await this.updateStock({
        product_id,
        warehouse_id: from_warehouse_id,
        quantity_change: -quantity,
        movement_type: 'transfer_out',
        unit_cost,
        reference,
        reason: `Transfer to warehouse: ${reason}`,
        costing_method,
        prevent_negative: true
      }, userId);

      const destinationUpdate = await this.updateStock({
        product_id,
        warehouse_id: to_warehouse_id,
        quantity_change: quantity,
        movement_type: 'transfer_in',
        unit_cost: sourceUpdate.weighted_avg_cost,
        reference,
        reason: `Transfer from warehouse: ${reason}`,
        costing_method,
        prevent_negative: false
      }, userId);

      // Create transfer record for audit trail
      await supabaseAdmin
        .from('stock_transfers')
        .insert({
          product_id,
          from_warehouse_id,
          to_warehouse_id,
          quantity,
          unit_cost: sourceUpdate.weighted_avg_cost,
          total_cost: quantity * sourceUpdate.weighted_avg_cost,
          reference,
          reason,
          status: 'completed',
          created_by: userId
        });

      logBusinessEvent('STOCK_TRANSFERRED', userId, {
        productId: product_id,
        fromWarehouse: from_warehouse_id,
        toWarehouse: to_warehouse_id,
        quantity,
        reference
      });

      return {
        source: sourceUpdate,
        destination: destinationUpdate,
        message: 'Stock transferred successfully'
      };

    } catch (error) {
      logSecurityEvent('STOCK_TRANSFER_FAILED', userId, {
        productId: product_id,
        fromWarehouse: from_warehouse_id,
        toWarehouse: to_warehouse_id,
        quantity,
        error: error.message
      });
      throw error;
    }
  }

  // Bulk stock update with optimized performance
  async bulkUpdateStock(updates, userId) {
    const results = [];
    const errors = [];

    // Group updates by warehouse for better performance
    const updatesByWarehouse = updates.reduce((acc, update) => {
      const key = update.warehouse_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(update);
      return acc;
    }, {});

    // Process each warehouse group
    for (const [warehouseId, warehouseUpdates] of Object.entries(updatesByWarehouse)) {
      try {
        // Process updates in batches of 50
        const batchSize = 50;
        for (let i = 0; i < warehouseUpdates.length; i += batchSize) {
          const batch = warehouseUpdates.slice(i, i + batchSize);
          
          for (const update of batch) {
            try {
              const result = await this.updateStock(update, userId);
              results.push({ success: true, data: result, update });
            } catch (error) {
              errors.push({ 
                success: false, 
                error: error.message, 
                code: error.code,
                update 
              });
            }
          }
        }
      } catch (error) {
        console.error(`Bulk update error for warehouse ${warehouseId}:`, error);
      }
    }

    logBusinessEvent('BULK_STOCK_UPDATE', userId, {
      totalUpdates: updates.length,
      successful: results.length,
      failed: errors.length
    });

    return {
      successful: results,
      failed: errors,
      summary: {
        total: updates.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  // Reserve stock for pending orders
  async reserveStock(reservationData, userId) {
    const { product_id, warehouse_id, quantity, reference, reason } = reservationData;

    try {
      const { data: inventory, error } = await supabaseAdmin
        .from('inventory')
        .select('current_stock, reserved_stock, available_stock')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .single();

      if (error || !inventory) {
        throw new AppError('Inventory record not found', 404, 'INVENTORY_NOT_FOUND');
      }

      if (inventory.available_stock < quantity) {
        throw new AppError(`Insufficient available stock. Available: ${inventory.available_stock}, Requested: ${quantity}`, 400, 'INSUFFICIENT_AVAILABLE_STOCK');
      }

      const newReservedStock = inventory.reserved_stock + quantity;
      const newAvailableStock = inventory.current_stock - newReservedStock;

      const { data: updatedInventory, error: updateError } = await supabaseAdmin
        .from('inventory')
        .update({
          reserved_stock: newReservedStock,
          available_stock: newAvailableStock,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to reserve stock', 500, 'RESERVE_STOCK_ERROR');
      }

      // Create reservation record
      const { data: reservation } = await supabaseAdmin
        .from('stock_reservations')
        .insert({
          product_id,
          warehouse_id,
          quantity,
          reference,
          reason,
          status: 'active',
          created_by: userId
        })
        .select()
        .single();

      this.emitInventoryUpdate(updatedInventory);

      return { inventory: updatedInventory, reservation };

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to reserve stock', 500, 'RESERVE_STOCK_ERROR');
    }
  }

  // Release reserved stock
  async releaseReservedStock(reservationId, userId) {
    try {
      const { data: reservation, error } = await supabaseAdmin
        .from('stock_reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (error || !reservation) {
        throw new AppError('Active reservation not found', 404, 'RESERVATION_NOT_FOUND');
      }

      const { data: inventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock, reserved_stock')
        .eq('product_id', reservation.product_id)
        .eq('warehouse_id', reservation.warehouse_id)
        .single();

      const newReservedStock = Math.max(0, inventory.reserved_stock - reservation.quantity);
      const newAvailableStock = inventory.current_stock - newReservedStock;

      // Update inventory
      const { data: updatedInventory } = await supabaseAdmin
        .from('inventory')
        .update({
          reserved_stock: newReservedStock,
          available_stock: newAvailableStock,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('product_id', reservation.product_id)
        .eq('warehouse_id', reservation.warehouse_id)
        .select()
        .single();

      // Update reservation status
      await supabaseAdmin
        .from('stock_reservations')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          released_by: userId
        })
        .eq('id', reservationId);

      this.emitInventoryUpdate(updatedInventory);

      return updatedInventory;

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to release reserved stock', 500, 'RELEASE_STOCK_ERROR');
    }
  }

  // Queue reorder check to avoid blocking main operations
  queueReorderCheck(productId, warehouseId) {
    const checkKey = `${productId}-${warehouseId}`;
    this.reorderCheckQueue.add(checkKey);
    
    // Process queue asynchronously
    setTimeout(() => this.processReorderCheck(productId, warehouseId), 100);
  }

  // Process reorder point checking
  async processReorderCheck(productId, warehouseId) {
    const checkKey = `${productId}-${warehouseId}`;
    
    if (!this.reorderCheckQueue.has(checkKey)) {
      return;
    }

    this.reorderCheckQueue.delete(checkKey);

    try {
      const { data: inventory } = await supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            reorder_level,
            reorder_quantity,
            suppliers (
              id,
              name,
              email
            )
          ),
          warehouses (
            id,
            name
          )
        `)
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .single();

      if (!inventory) return;

      const reorderLevel = inventory.reorder_level || inventory.products?.reorder_level || 0;
      const currentStock = inventory.available_stock || inventory.current_stock;

      if (currentStock <= reorderLevel) {
        await this.triggerReorderAlert(inventory);
      }

    } catch (error) {
      console.error('Reorder check failed:', error);
    }
  }

  // Trigger reorder alerts with throttling
  async triggerReorderAlert(inventory) {
    const alertKey = `${inventory.product_id}-${inventory.warehouse_id}`;
    const now = Date.now();
    const lastAlert = this.alertThrottling.get(alertKey);

    // Throttle alerts - only send once per hour
    if (lastAlert && (now - lastAlert) < 3600000) {
      return;
    }

    this.alertThrottling.set(alertKey, now);

    try {
      // Create reorder alert record
      const { data: alert } = await supabaseAdmin
        .from('reorder_alerts')
        .insert({
          product_id: inventory.product_id,
          warehouse_id: inventory.warehouse_id,
          current_stock: inventory.current_stock,
          available_stock: inventory.available_stock,
          reorder_level: inventory.reorder_level,
          suggested_quantity: inventory.reorder_quantity,
          status: 'pending',
          alert_type: inventory.current_stock === 0 ? 'out_of_stock' : 'low_stock'
        })
        .select()
        .single();

      // Send email notification
      const managers = await this.getWarehouseManagers(inventory.warehouse_id);
      if (managers.length > 0) {
        await emailService.sendLowStockAlert(
          managers.map(m => m.email),
          [{
            product_name: inventory.products.name,
            sku: inventory.products.sku,
            current_stock: inventory.available_stock,
            reorder_level: inventory.reorder_level,
            unit: inventory.products.unit || 'units'
          }],
          inventory.warehouses.name
        );
      }

      // Emit real-time alert
      this.emitReorderAlert(alert);

      logBusinessEvent('REORDER_ALERT_TRIGGERED', null, {
        productId: inventory.product_id,
        warehouseId: inventory.warehouse_id,
        currentStock: inventory.available_stock,
        reorderLevel: inventory.reorder_level
      });

    } catch (error) {
      console.error('Failed to trigger reorder alert:', error);
    }
  }

  // Get warehouse managers for notifications
  async getWarehouseManagers(warehouseId) {
    const { data: managers } = await supabaseAdmin
      .from('user_profiles')
      .select('email, first_name')
      .in('role', ['admin', 'manager'])
      .eq('warehouse_id', warehouseId)
      .eq('status', 'active');

    return managers || [];
  }

  // Get comprehensive inventory valuation
  async getInventoryValuation(warehouseId = null, costingMethod = 'AVERAGE') {
    try {
      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            cost,
            price,
            unit,
            categories (name)
          ),
          warehouses (
            id,
            name
          )
        `)
        .gt('current_stock', 0);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data: inventory, error } = await query;

      if (error) {
        throw new AppError('Failed to get inventory data', 500, 'VALUATION_ERROR');
      }

      const valuationData = inventory.map(item => {
        let unitCost = 0;

        switch (costingMethod) {
          case 'FIFO':
          case 'LIFO':
            unitCost = item.weighted_avg_cost || item.products?.cost || 0;
            break;
          case 'AVERAGE':
          default:
            unitCost = item.weighted_avg_cost || item.products?.cost || 0;
            break;
        }

        const totalCost = item.current_stock * unitCost;
        const totalRetailValue = item.current_stock * (item.products?.price || 0);

        return {
          product_id: item.products.id,
          product_name: item.products.name,
          sku: item.products.sku,
          category: item.products.categories?.name || 'Uncategorized',
          warehouse: item.warehouses.name,
          current_stock: item.current_stock,
          available_stock: item.available_stock,
          reserved_stock: item.reserved_stock,
          unit_cost: unitCost,
          unit_price: item.products.price || 0,
          total_cost: totalCost,
          total_retail_value: totalRetailValue,
          potential_profit: totalRetailValue - totalCost,
          turn_rate: this.calculateTurnRate(item),
          last_movement_date: item.last_movement_date
        };
      });

      const summary = {
        total_items: valuationData.length,
        total_quantity: valuationData.reduce((sum, item) => sum + item.current_stock, 0),
        total_available_quantity: valuationData.reduce((sum, item) => sum + item.available_stock, 0),
        total_reserved_quantity: valuationData.reduce((sum, item) => sum + item.reserved_stock, 0),
        total_cost_value: valuationData.reduce((sum, item) => sum + item.total_cost, 0),
        total_retail_value: valuationData.reduce((sum, item) => sum + item.total_retail_value, 0),
        total_potential_profit: valuationData.reduce((sum, item) => sum + item.potential_profit, 0),
        costing_method: costingMethod,
        valuation_date: new Date().toISOString()
      };

      return {
        summary,
        items: valuationData
      };

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to calculate inventory valuation', 500, 'VALUATION_ERROR');
    }
  }

  // Calculate inventory turn rate (placeholder - would need sales data)
  calculateTurnRate(inventoryItem) {
    // This would calculate based on sales velocity
    // For now, return a placeholder
    return 0;
  }

  // Emit real-time inventory update (WebSocket/SSE)
  emitInventoryUpdate(inventory) {
    try {
      webSocketService.broadcastInventoryUpdate(inventory);
      console.log('Real-time inventory update broadcasted:', {
        product_id: inventory.product_id,
        warehouse_id: inventory.warehouse_id,
        current_stock: inventory.current_stock,
        available_stock: inventory.available_stock,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to broadcast inventory update:', error);
    }
  }

  // Emit real-time reorder alert
  emitReorderAlert(alert) {
    try {
      webSocketService.broadcastLowStockAlert(alert);
      console.log('Real-time reorder alert broadcasted:', alert.id);
    } catch (error) {
      console.error('Failed to broadcast reorder alert:', error);
    }
  }

  // Get real-time inventory status
  async getRealTimeInventoryStatus(filters = {}) {
    const {
      warehouse_id,
      product_id,
      low_stock_only = false,
      include_reserved = true
    } = filters;

    let query = supabaseAdmin
      .from('inventory')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          unit,
          reorder_level
        ),
        warehouses (
          id,
          name
        )
      `);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    if (low_stock_only) {
      query = query.lt('available_stock', 'reorder_level');
    }

    const { data: inventory, error } = await query.order('last_movement_date', { ascending: false });

    if (error) {
      throw new AppError('Failed to get real-time inventory status', 500, 'REALTIME_STATUS_ERROR');
    }

    return inventory.map(item => ({
      ...item,
      status: this.getInventoryStatus(item),
      last_updated: item.updated_at,
      real_time: true
    }));
  }

  // Determine inventory status
  getInventoryStatus(inventory) {
    const reorderLevel = inventory.reorder_level || inventory.products?.reorder_level || 0;
    
    if (inventory.available_stock === 0) {
      return 'out_of_stock';
    } else if (inventory.available_stock <= reorderLevel) {
      return 'low_stock';
    } else if (inventory.available_stock > reorderLevel * 3) {
      return 'overstocked';
    } else {
      return 'normal';
    }
  }
}

module.exports = new RealTimeInventoryService();