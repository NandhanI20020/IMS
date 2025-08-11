const warehouseService = require('../services/warehouseService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class WarehouseController {
  // Get all warehouses
  getWarehouses = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sort = 'name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      sort,
      order
    };

    const result = await warehouseService.getWarehouses(filters);

    res.status(200).json(formatResponse(result, 'Warehouses retrieved successfully'));
  });

  // Get single warehouse
  getWarehouse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const warehouse = await warehouseService.getWarehouseById(id);

    res.status(200).json(formatResponse(warehouse, 'Warehouse retrieved successfully'));
  });

  // Create new warehouse
  createWarehouse = asyncHandler(async (req, res) => {
    const warehouseData = req.body;
    const userId = req.user.id;

    const warehouse = await warehouseService.createWarehouse(warehouseData, userId);

    res.status(201).json(formatResponse(warehouse, 'Warehouse created successfully'));
  });

  // Update warehouse
  updateWarehouse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const warehouse = await warehouseService.updateWarehouse(id, updateData, userId);

    res.status(200).json(formatResponse(warehouse, 'Warehouse updated successfully'));
  });

  // Delete warehouse
  deleteWarehouse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await warehouseService.deleteWarehouse(id, userId);

    res.status(200).json(formatResponse(null, 'Warehouse deleted successfully'));
  });

  // Get warehouse inventory
  getWarehouseInventory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      category,
      lowStock = false,
      sort = 'product_name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      lowStock: lowStock === 'true',
      sort,
      order
    };

    const result = await warehouseService.getWarehouseInventory(id, filters);

    res.status(200).json(formatResponse(result, 'Warehouse inventory retrieved successfully'));
  });

  // Get warehouse analytics
  getWarehouseAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    const analytics = await warehouseService.getWarehouseAnalytics(id, period);

    res.status(200).json(formatResponse(analytics, 'Warehouse analytics retrieved successfully'));
  });

  // Get warehouse locations/zones
  getWarehouseLocations = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const locations = await warehouseService.getWarehouseLocations(id);

    res.status(200).json(formatResponse(locations, 'Warehouse locations retrieved successfully'));
  });

  // Create warehouse location
  createWarehouseLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const locationData = req.body;
    const userId = req.user.id;

    const location = await warehouseService.createWarehouseLocation(id, locationData, userId);

    res.status(201).json(formatResponse(location, 'Warehouse location created successfully'));
  });

  // Update warehouse location
  updateWarehouseLocation = asyncHandler(async (req, res) => {
    const { id, locationId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const location = await warehouseService.updateWarehouseLocation(locationId, updateData, userId);

    res.status(200).json(formatResponse(location, 'Warehouse location updated successfully'));
  });

  // Delete warehouse location
  deleteWarehouseLocation = asyncHandler(async (req, res) => {
    const { id, locationId } = req.params;
    const userId = req.user.id;

    await warehouseService.deleteWarehouseLocation(locationId, userId);

    res.status(200).json(formatResponse(null, 'Warehouse location deleted successfully'));
  });
}

module.exports = new WarehouseController();