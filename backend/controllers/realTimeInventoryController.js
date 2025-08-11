const realTimeInventoryService = require('../services/realTimeInventoryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class RealTimeInventoryController {
  // Real-time stock update endpoint
  updateStock = asyncHandler(async (req, res) => {
    const {
      product_id,
      warehouse_id,
      quantity_change,
      movement_type,
      unit_cost,
      reference,
      reason,
      costing_method = 'FIFO',
      prevent_negative = true
    } = req.body;

    const userId = req.user.id;

    const result = await realTimeInventoryService.updateStock({
      product_id,
      warehouse_id,
      quantity_change: parseInt(quantity_change),
      movement_type,
      unit_cost: parseFloat(unit_cost) || null,
      reference,
      reason,
      costing_method,
      prevent_negative
    }, userId);

    res.status(200).json(formatResponse(result, 'Stock updated successfully'));
  });

  // Enhanced stock transfer with real-time updates
  transferStock = asyncHandler(async (req, res) => {
    const {
      product_id,
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      reason,
      reference,
      costing_method = 'FIFO'
    } = req.body;

    const userId = req.user.id;

    const result = await realTimeInventoryService.transferStock({
      product_id,
      from_warehouse_id,
      to_warehouse_id,
      quantity: parseInt(quantity),
      reason,
      reference,
      costing_method
    }, userId);

    res.status(200).json(formatResponse(result, 'Stock transferred successfully'));
  });

  // Bulk stock update with optimized performance
  bulkUpdateStock = asyncHandler(async (req, res) => {
    const { updates } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json(formatResponse(null, 'Updates array is required', false));
    }

    // Validate each update
    const validatedUpdates = updates.map(update => ({
      ...update,
      quantity_change: parseInt(update.quantity_change),
      unit_cost: parseFloat(update.unit_cost) || null,
      costing_method: update.costing_method || 'FIFO',
      prevent_negative: update.prevent_negative !== false
    }));

    const result = await realTimeInventoryService.bulkUpdateStock(validatedUpdates, userId);

    res.status(200).json(formatResponse(result, 'Bulk stock update completed'));
  });

  // Stock adjustment with audit trail
  adjustStock = asyncHandler(async (req, res) => {
    const {
      product_id,
      warehouse_id,
      adjustment_type,
      quantity,
      reason,
      reference,
      unit_cost,
      costing_method = 'AVERAGE'
    } = req.body;

    const userId = req.user.id;

    const quantityChange = adjustment_type === 'increase' ? parseInt(quantity) : -parseInt(quantity);

    const result = await realTimeInventoryService.updateStock({
      product_id,
      warehouse_id,
      quantity_change: quantityChange,
      movement_type: adjustment_type === 'increase' ? 'adjustment_increase' : 'adjustment_decrease',
      unit_cost: parseFloat(unit_cost) || null,
      reference,
      reason,
      costing_method,
      prevent_negative: true
    }, userId);

    res.status(200).json(formatResponse(result, 'Stock adjustment completed successfully'));
  });

  // Reserve stock for pending orders
  reserveStock = asyncHandler(async (req, res) => {
    const {
      product_id,
      warehouse_id,
      quantity,
      reference,
      reason
    } = req.body;

    const userId = req.user.id;

    const result = await realTimeInventoryService.reserveStock({
      product_id,
      warehouse_id,
      quantity: parseInt(quantity),
      reference,
      reason
    }, userId);

    res.status(200).json(formatResponse(result, 'Stock reserved successfully'));
  });

  // Release reserved stock
  releaseReservedStock = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const userId = req.user.id;

    const result = await realTimeInventoryService.releaseReservedStock(reservationId, userId);

    res.status(200).json(formatResponse(result, 'Reserved stock released successfully'));
  });

  // Get real-time inventory status
  getRealTimeStatus = asyncHandler(async (req, res) => {
    const {
      warehouse_id,
      product_id,
      low_stock_only,
      include_reserved = true
    } = req.query;

    const filters = {
      warehouse_id,
      product_id,
      low_stock_only: low_stock_only === 'true',
      include_reserved: include_reserved === 'true'
    };

    const result = await realTimeInventoryService.getRealTimeInventoryStatus(filters);

    res.status(200).json(formatResponse(result, 'Real-time inventory status retrieved'));
  });

  // Get detailed stock movements for a product
  getStockMovements = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const {
      warehouse_id,
      movement_type,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

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
        ),
        created_by_user:user_profiles!created_by (
          first_name,
          last_name
        )
      `)
      .eq('product_id', productId);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (movement_type) {
      query = query.eq('movement_type', movement_type);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

    const { data: movements, error, count } = await query;

    if (error) {
      throw new AppError('Failed to get stock movements', 500, 'GET_MOVEMENTS_ERROR');
    }

    const result = {
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    };

    res.status(200).json(formatResponse(result, 'Stock movements retrieved successfully'));
  });

  // Get comprehensive inventory valuation with different costing methods
  getInventoryValuation = asyncHandler(async (req, res) => {
    const { warehouse_id, costing_method = 'AVERAGE', format = 'json' } = req.query;

    const result = await realTimeInventoryService.getInventoryValuation(
      warehouse_id,
      costing_method.toUpperCase()
    );

    if (format === 'csv') {
      const csvData = this.generateValuationCSV(result);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-valuation.csv');
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(result, 'Inventory valuation calculated successfully'));
  });

  // Get low stock alerts with real-time data
  getLowStockAlerts = asyncHandler(async (req, res) => {
    const { warehouse_id, alert_type, status = 'pending' } = req.query;

    let query = supabaseAdmin
      .from('reorder_alerts')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          unit,
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
      .eq('status', status);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (alert_type) {
      query = query.eq('alert_type', alert_type);
    }

    const { data: alerts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to get low stock alerts', 500, 'GET_ALERTS_ERROR');
    }

    res.status(200).json(formatResponse(alerts, 'Low stock alerts retrieved successfully'));
  });

  // Update reorder alert status
  updateReorderAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const { data: alert, error } = await supabaseAdmin
      .from('reorder_alerts')
      .update({
        status,
        notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' ? userId : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update reorder alert', 500, 'UPDATE_ALERT_ERROR');
    }

    res.status(200).json(formatResponse(alert, 'Reorder alert updated successfully'));
  });

  // Get inventory analytics with real-time data
  getInventoryAnalytics = asyncHandler(async (req, res) => {
    const { warehouse_id, period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get current inventory snapshot
    let inventoryQuery = supabaseAdmin
      .from('inventory')
      .select(`
        current_stock,
        available_stock,
        reserved_stock,
        weighted_avg_cost,
        products (
          price,
          cost
        )
      `);

    if (warehouse_id) {
      inventoryQuery = inventoryQuery.eq('warehouse_id', warehouse_id);
    }

    const { data: inventory } = await inventoryQuery;

    // Get stock movements for the period
    let movementsQuery = supabaseAdmin
      .from('stock_movements')
      .select('movement_type, quantity, unit_cost, total_cost, created_at')
      .gte('created_at', startDate.toISOString());

    if (warehouse_id) {
      movementsQuery = movementsQuery.eq('warehouse_id', warehouse_id);
    }

    const { data: movements } = await movementsQuery;

    // Calculate analytics
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.current_stock * (item.weighted_avg_cost || item.products?.cost || 0)), 0);
    
    const totalRetailValue = inventory.reduce((sum, item) => 
      sum + (item.current_stock * (item.products?.price || 0)), 0);

    const totalReserved = inventory.reduce((sum, item) => sum + (item.reserved_stock || 0), 0);
    const totalAvailable = inventory.reduce((sum, item) => sum + (item.available_stock || 0), 0);

    const movementsByType = movements.reduce((acc, movement) => {
      acc[movement.movement_type] = (acc[movement.movement_type] || 0) + movement.quantity;
      return acc;
    }, {});

    const inboundMovements = movements.filter(m => 
      ['purchase_receive', 'transfer_in', 'adjustment_increase'].includes(m.movement_type)
    );
    
    const outboundMovements = movements.filter(m => 
      ['sale', 'transfer_out', 'adjustment_decrease'].includes(m.movement_type)
    );

    const analytics = {
      inventory_summary: {
        total_value: totalValue,
        total_retail_value: totalRetailValue,
        total_available: totalAvailable,
        total_reserved: totalReserved,
        potential_profit: totalRetailValue - totalValue
      },
      movement_summary: {
        total_inbound: inboundMovements.reduce((sum, m) => sum + m.quantity, 0),
        total_outbound: outboundMovements.reduce((sum, m) => sum + m.quantity, 0),
        movements_by_type: movementsByType,
        inbound_value: inboundMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0),
        outbound_value: outboundMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0)
      },
      period: `${days} days`,
      generated_at: new Date().toISOString()
    };

    res.status(200).json(formatResponse(analytics, 'Inventory analytics retrieved successfully'));
  });

  // Generate CSV for inventory valuation
  generateValuationCSV(valuationData) {
    const headers = [
      'Product ID', 'Product Name', 'SKU', 'Category', 'Warehouse',
      'Current Stock', 'Available Stock', 'Reserved Stock',
      'Unit Cost', 'Unit Price', 'Total Cost', 'Total Retail Value',
      'Potential Profit', 'Last Movement Date'
    ].join(',') + '\n';

    const rows = valuationData.items.map(item => [
      item.product_id,
      `"${item.product_name}"`,
      `"${item.sku}"`,
      `"${item.category}"`,
      `"${item.warehouse}"`,
      item.current_stock,
      item.available_stock,
      item.reserved_stock,
      item.unit_cost.toFixed(2),
      item.unit_price.toFixed(2),
      item.total_cost.toFixed(2),
      item.total_retail_value.toFixed(2),
      item.potential_profit.toFixed(2),
      item.last_movement_date || ''
    ].join(','));

    return headers + rows.join('\n');
  }

  // Health check for real-time inventory system
  healthCheck = asyncHandler(async (req, res) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        real_time_updates: 'healthy',
        reorder_alerts: 'healthy',
        bulk_operations: 'healthy'
      },
      performance: {
        pending_updates: realTimeInventoryService.pendingUpdates.size,
        reorder_queue_size: realTimeInventoryService.reorderCheckQueue.size,
        alert_throttling_active: realTimeInventoryService.alertThrottling.size
      }
    };

    res.status(200).json(formatResponse(healthStatus, 'Real-time inventory system is healthy'));
  });
}

module.exports = new RealTimeInventoryController();