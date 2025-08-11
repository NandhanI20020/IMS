const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class InventoryService {
  // Get inventory with filters
  async getInventory(filters) {
    try {
      const {
        page,
        limit,
        warehouse,
        product,
        status,
        lowStock,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            price,
            cost,
            unit
          ),
          warehouses (
            id,
            name,
            location
          )
        `);

      // Apply filters
      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      if (product) {
        query = query.eq('product_id', product);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (lowStock) {
        query = query.lt('current_stock', 'reorder_level');
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: inventory, error, count } = await query;

      if (error) {
        console.error('Get inventory error:', error);
        throw new AppError('Failed to retrieve inventory', 500, 'GET_INVENTORY_ERROR');
      }

      return {
        data: inventory,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Inventory service error:', error);
      throw new AppError('Failed to get inventory', 500, 'INVENTORY_SERVICE_ERROR');
    }
  }

  // Get inventory for specific product
  async getProductInventory(productId) {
    try {
      const { data: inventory, error } = await supabaseAdmin
        .from('inventory')
        .select(`
          *,
          warehouses (
            id,
            name,
            location
          )
        `)
        .eq('product_id', productId);

      if (error) {
        console.error('Get product inventory error:', error);
        throw new AppError('Failed to get product inventory', 500, 'GET_PRODUCT_INVENTORY_ERROR');
      }

      return inventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get product inventory', 500, 'GET_PRODUCT_INVENTORY_ERROR');
    }
  }

  // Update inventory levels
  async updateInventory(id, updateData, userId) {
    try {
      const { data: inventory, error } = await supabaseAdmin
        .from('inventory')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select(`
          *,
          products (name, sku),
          warehouses (name)
        `)
        .single();

      if (error) {
        console.error('Update inventory error:', error);
        throw new AppError('Failed to update inventory', 500, 'UPDATE_INVENTORY_ERROR');
      }

      logBusinessEvent('INVENTORY_UPDATED', userId, { inventoryId: id, changes: updateData });

      return inventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update inventory', 500, 'UPDATE_INVENTORY_ERROR');
    }
  }

  // Adjust stock levels
  async adjustStock(adjustmentData, userId) {
    try {
      const {
        product_id,
        warehouse_id,
        adjustment_type,
        quantity,
        reason,
        reference
      } = adjustmentData;

      // Get current inventory
      const { data: currentInventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .single();

      if (!currentInventory) {
        throw new AppError('Inventory record not found', 404, 'INVENTORY_NOT_FOUND');
      }

      const currentStock = currentInventory.current_stock;
      const adjustmentQuantity = adjustment_type === 'increase' ? quantity : -quantity;
      const newStock = currentStock + adjustmentQuantity;

      if (newStock < 0) {
        throw new AppError('Insufficient stock for adjustment', 400, 'INSUFFICIENT_STOCK');
      }

      // Update inventory
      const { data: updatedInventory, error: updateError } = await supabaseAdmin
        .from('inventory')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to update inventory', 500, 'UPDATE_INVENTORY_ERROR');
      }

      // Create stock movement record
      const { error: movementError } = await supabaseAdmin
        .from('stock_movements')
        .insert({
          product_id,
          warehouse_id,
          movement_type: adjustment_type,
          quantity: Math.abs(adjustmentQuantity),
          previous_stock: currentStock,
          new_stock: newStock,
          reason,
          reference,
          created_by: userId
        });

      if (movementError) {
        console.error('Create stock movement error:', movementError);
      }

      logBusinessEvent('STOCK_ADJUSTED', userId, {
        productId: product_id,
        warehouseId: warehouse_id,
        adjustmentType: adjustment_type,
        quantity,
        reason
      });

      return updatedInventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to adjust stock', 500, 'ADJUST_STOCK_ERROR');
    }
  }

  // Transfer stock between warehouses
  async transferStock(transferData, userId) {
    try {
      const {
        product_id,
        from_warehouse_id,
        to_warehouse_id,
        quantity,
        reason,
        reference
      } = transferData;

      if (from_warehouse_id === to_warehouse_id) {
        throw new AppError('Cannot transfer to the same warehouse', 400, 'SAME_WAREHOUSE_TRANSFER');
      }

      // Start transaction by checking source inventory
      const { data: sourceInventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('product_id', product_id)
        .eq('warehouse_id', from_warehouse_id)
        .single();

      if (!sourceInventory || sourceInventory.current_stock < quantity) {
        throw new AppError('Insufficient stock for transfer', 400, 'INSUFFICIENT_STOCK');
      }

      // Update source warehouse
      const newSourceStock = sourceInventory.current_stock - quantity;
      await supabaseAdmin
        .from('inventory')
        .update({
          current_stock: newSourceStock,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('product_id', product_id)
        .eq('warehouse_id', from_warehouse_id);

      // Update destination warehouse
      const { data: destInventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('product_id', product_id)
        .eq('warehouse_id', to_warehouse_id)
        .single();

      const newDestStock = (destInventory?.current_stock || 0) + quantity;

      if (destInventory) {
        await supabaseAdmin
          .from('inventory')
          .update({
            current_stock: newDestStock,
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('product_id', product_id)
          .eq('warehouse_id', to_warehouse_id);
      } else {
        // Create new inventory record for destination warehouse
        await supabaseAdmin
          .from('inventory')
          .insert({
            product_id,
            warehouse_id: to_warehouse_id,
            current_stock: quantity,
            created_by: userId
          });
      }

      // Create stock movement records
      const movements = [
        {
          product_id,
          warehouse_id: from_warehouse_id,
          movement_type: 'transfer_out',
          quantity,
          previous_stock: sourceInventory.current_stock,
          new_stock: newSourceStock,
          reason,
          reference,
          created_by: userId
        },
        {
          product_id,
          warehouse_id: to_warehouse_id,
          movement_type: 'transfer_in',
          quantity,
          previous_stock: destInventory?.current_stock || 0,
          new_stock: newDestStock,
          reason,
          reference,
          created_by: userId
        }
      ];

      await supabaseAdmin
        .from('stock_movements')
        .insert(movements);

      logBusinessEvent('STOCK_TRANSFERRED', userId, {
        productId: product_id,
        fromWarehouse: from_warehouse_id,
        toWarehouse: to_warehouse_id,
        quantity,
        reason
      });

      return { message: 'Stock transferred successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to transfer stock', 500, 'TRANSFER_STOCK_ERROR');
    }
  }

  // Get stock movements
  async getStockMovements(filters) {
    try {
      const {
        page,
        limit,
        product,
        warehouse,
        type,
        startDate,
        endDate,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('stock_movements')
        .select(`
          *,
          products (
            id,
            name,
            sku
          ),
          warehouses (
            id,
            name
          )
        `);

      // Apply filters
      if (product) {
        query = query.eq('product_id', product);
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      if (type) {
        query = query.eq('movement_type', type);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: movements, error, count } = await query;

      if (error) {
        console.error('Get stock movements error:', error);
        throw new AppError('Failed to get stock movements', 500, 'GET_MOVEMENTS_ERROR');
      }

      return {
        data: movements,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get stock movements', 500, 'GET_MOVEMENTS_ERROR');
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(warehouse) {
    try {
      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            unit
          ),
          warehouses (
            id,
            name
          )
        `)
        .lt('current_stock', 'reorder_level')
        .eq('status', 'active');

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: alerts, error } = await query.order('current_stock', { ascending: true });

      if (error) {
        console.error('Get low stock alerts error:', error);
        throw new AppError('Failed to get low stock alerts', 500, 'GET_ALERTS_ERROR');
      }

      return alerts;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get low stock alerts', 500, 'GET_ALERTS_ERROR');
    }
  }

  // Set reorder levels
  async setReorderLevels(productId, warehouseId, reorderLevel, reorderQuantity, userId) {
    try {
      const { data: inventory, error } = await supabaseAdmin
        .from('inventory')
        .update({
          reorder_level: reorderLevel,
          reorder_quantity: reorderQuantity,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .select()
        .single();

      if (error) {
        console.error('Set reorder levels error:', error);
        throw new AppError('Failed to set reorder levels', 500, 'SET_REORDER_ERROR');
      }

      logBusinessEvent('REORDER_LEVELS_SET', userId, {
        productId,
        warehouseId,
        reorderLevel,
        reorderQuantity
      });

      return inventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to set reorder levels', 500, 'SET_REORDER_ERROR');
    }
  }

  // Get inventory valuation
  async getInventoryValuation(warehouse, date) {
    try {
      let query = supabaseAdmin
        .from('inventory')
        .select(`
          current_stock,
          products (
            cost,
            price,
            name,
            sku
          ),
          warehouses (
            name
          )
        `)
        .gt('current_stock', 0);

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: inventory, error } = await query;

      if (error) {
        console.error('Get inventory valuation error:', error);
        throw new AppError('Failed to get inventory valuation', 500, 'GET_VALUATION_ERROR');
      }

      const valuation = inventory.map(item => ({
        ...item,
        total_cost: item.current_stock * (item.products.cost || 0),
        total_value: item.current_stock * (item.products.price || 0)
      }));

      const summary = {
        total_items: inventory.length,
        total_quantity: inventory.reduce((sum, item) => sum + item.current_stock, 0),
        total_cost_value: valuation.reduce((sum, item) => sum + item.total_cost, 0),
        total_retail_value: valuation.reduce((sum, item) => sum + item.total_value, 0)
      };

      return {
        summary,
        items: valuation
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get inventory valuation', 500, 'GET_VALUATION_ERROR');
    }
  }

  // Perform stock count
  async performStockCount(warehouseId, products, userId) {
    try {
      const stockCountResults = [];

      for (const countItem of products) {
        const { product_id, counted_quantity } = countItem;

        // Get current inventory
        const { data: currentInventory } = await supabaseAdmin
          .from('inventory')
          .select('current_stock')
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouseId)
          .single();

        if (!currentInventory) {
          continue;
        }

        const variance = counted_quantity - currentInventory.current_stock;

        if (variance !== 0) {
          // Update inventory
          await supabaseAdmin
            .from('inventory')
            .update({
              current_stock: counted_quantity,
              updated_at: new Date().toISOString(),
              updated_by: userId
            })
            .eq('product_id', product_id)
            .eq('warehouse_id', warehouseId);

          // Create stock movement
          await supabaseAdmin
            .from('stock_movements')
            .insert({
              product_id,
              warehouse_id: warehouseId,
              movement_type: variance > 0 ? 'count_increase' : 'count_decrease',
              quantity: Math.abs(variance),
              previous_stock: currentInventory.current_stock,
              new_stock: counted_quantity,
              reason: 'Stock count adjustment',
              created_by: userId
            });
        }

        stockCountResults.push({
          product_id,
          previous_stock: currentInventory.current_stock,
          counted_stock: counted_quantity,
          variance
        });
      }

      logBusinessEvent('STOCK_COUNT_PERFORMED', userId, {
        warehouseId,
        productsCount: products.length,
        adjustments: stockCountResults.filter(r => r.variance !== 0).length
      });

      return {
        message: 'Stock count completed successfully',
        results: stockCountResults
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to perform stock count', 500, 'STOCK_COUNT_ERROR');
    }
  }
}

module.exports = new InventoryService();