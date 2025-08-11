const inventoryService = require('../services/inventoryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class InventoryController {
  // Get inventory levels
  getInventory = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      warehouse,
      product,
      status,
      lowStock = false,
      sort = 'updated_at',
      order = 'desc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      warehouse,
      product,
      status,
      lowStock: lowStock === 'true',
      sort,
      order
    };

    const result = await inventoryService.getInventory(filters);

    res.status(200).json(formatResponse(result, 'Inventory retrieved successfully'));
  });

  // Get inventory for specific product
  getProductInventory = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const inventory = await inventoryService.getProductInventory(productId);

    res.status(200).json(formatResponse(inventory, 'Product inventory retrieved successfully'));
  });

  // Update inventory levels
  updateInventory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const inventory = await inventoryService.updateInventory(id, updateData, userId);

    res.status(200).json(formatResponse(inventory, 'Inventory updated successfully'));
  });

  // Adjust stock levels
  adjustStock = asyncHandler(async (req, res) => {
    const adjustmentData = req.body;
    const userId = req.user.id;

    const result = await inventoryService.adjustStock(adjustmentData, userId);

    res.status(200).json(formatResponse(result, 'Stock adjusted successfully'));
  });

  // Transfer stock between warehouses
  transferStock = asyncHandler(async (req, res) => {
    const transferData = req.body;
    const userId = req.user.id;

    const result = await inventoryService.transferStock(transferData, userId);

    res.status(200).json(formatResponse(result, 'Stock transferred successfully'));
  });

  // Get stock movements/history
  getStockMovements = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      product,
      warehouse,
      type,
      startDate,
      endDate,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      product,
      warehouse,
      type,
      startDate,
      endDate,
      sort,
      order
    };

    const result = await inventoryService.getStockMovements(filters);

    res.status(200).json(formatResponse(result, 'Stock movements retrieved successfully'));
  });

  // Get low stock alerts
  getLowStockAlerts = asyncHandler(async (req, res) => {
    const { warehouse } = req.query;

    const alerts = await inventoryService.getLowStockAlerts(warehouse);

    res.status(200).json(formatResponse(alerts, 'Low stock alerts retrieved successfully'));
  });

  // Set reorder levels
  setReorderLevels = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { warehouse_id, reorder_level, reorder_quantity } = req.body;
    const userId = req.user.id;

    const result = await inventoryService.setReorderLevels(
      productId,
      warehouse_id,
      reorder_level,
      reorder_quantity,
      userId
    );

    res.status(200).json(formatResponse(result, 'Reorder levels set successfully'));
  });

  // Get inventory valuation
  getInventoryValuation = asyncHandler(async (req, res) => {
    const { warehouse, date } = req.query;

    const valuation = await inventoryService.getInventoryValuation(warehouse, date);

    res.status(200).json(formatResponse(valuation, 'Inventory valuation retrieved successfully'));
  });

  // Perform stock count
  performStockCount = asyncHandler(async (req, res) => {
    const { warehouse_id, products } = req.body;
    const userId = req.user.id;

    const result = await inventoryService.performStockCount(warehouse_id, products, userId);

    res.status(200).json(formatResponse(result, 'Stock count completed successfully'));
  });
}

module.exports = new InventoryController();