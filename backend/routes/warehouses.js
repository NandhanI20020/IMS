const express = require('express');
const { body, param, query } = require('express-validator');
const warehouseController = require('../controllers/warehouseController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createWarehouseValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Warehouse name is required and must be less than 255 characters'),
  body('code').trim().isLength({ min: 1, max: 50 }).withMessage('Warehouse code is required and must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be less than 255 characters'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('manager_id').optional().isUUID().withMessage('Valid manager ID required'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a non-negative integer'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
  handleValidationErrors
];

const updateWarehouseValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Warehouse name must be less than 255 characters'),
  body('code').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Warehouse code must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be less than 255 characters'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('manager_id').optional().isUUID().withMessage('Valid manager ID required'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a non-negative integer'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
  handleValidationErrors
];

const getWarehousesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
  query('sort').optional().isIn(['name', 'code', 'location', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const getWarehouseInventoryValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('category').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  query('lowStock').optional().isBoolean().withMessage('Low stock must be true or false'),
  query('sort').optional().isIn(['product_name', 'current_stock', 'reorder_level', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const createLocationValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  body('zone').trim().isLength({ min: 1, max: 50 }).withMessage('Zone is required and must be less than 50 characters'),
  body('aisle').trim().isLength({ min: 1, max: 50 }).withMessage('Aisle is required and must be less than 50 characters'),
  body('shelf').trim().isLength({ min: 1, max: 50 }).withMessage('Shelf is required and must be less than 50 characters'),
  body('bin').optional().trim().isLength({ max: 50 }).withMessage('Bin must be less than 50 characters'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a non-negative integer'),
  body('location_type').optional().isIn(['storage', 'picking', 'receiving', 'shipping']).withMessage('Invalid location type'),
  handleValidationErrors
];

const updateLocationValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  param('locationId').isInt({ min: 1 }).withMessage('Valid location ID is required'),
  body('zone').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Zone must be less than 50 characters'),
  body('aisle').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Aisle must be less than 50 characters'),
  body('shelf').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Shelf must be less than 50 characters'),
  body('bin').optional().trim().isLength({ max: 50 }).withMessage('Bin must be less than 50 characters'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a non-negative integer'),
  body('location_type').optional().isIn(['storage', 'picking', 'receiving', 'shipping']).withMessage('Invalid location type'),
  handleValidationErrors
];

// Routes

// GET /api/v1/warehouses - Get all warehouses with filters
router.get('/', getWarehousesValidation, warehouseController.getWarehouses);

// GET /api/v1/warehouses/:id - Get single warehouse
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  handleValidationErrors
], warehouseController.getWarehouse);

// GET /api/v1/warehouses/:id/inventory - Get warehouse inventory
router.get('/:id/inventory', getWarehouseInventoryValidation, warehouseController.getWarehouseInventory);

// GET /api/v1/warehouses/:id/analytics - Get warehouse analytics
router.get('/:id/analytics',
  requireRole(['admin', 'manager']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
    query('period').optional().isIn(['30d', '90d', '365d']).withMessage('Invalid period'),
    handleValidationErrors
  ],
  warehouseController.getWarehouseAnalytics
);

// GET /api/v1/warehouses/:id/locations - Get warehouse locations
router.get('/:id/locations', [
  param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  handleValidationErrors
], warehouseController.getWarehouseLocations);

// POST /api/v1/warehouses - Create new warehouse
router.post('/',
  requireRole(['admin']),
  createWarehouseValidation,
  warehouseController.createWarehouse
);

// POST /api/v1/warehouses/:id/locations - Create warehouse location
router.post('/:id/locations',
  requireRole(['admin', 'manager']),
  createLocationValidation,
  warehouseController.createWarehouseLocation
);

// PUT /api/v1/warehouses/:id - Update warehouse
router.put('/:id',
  requireRole(['admin', 'manager']),
  updateWarehouseValidation,
  warehouseController.updateWarehouse
);

// PUT /api/v1/warehouses/:id/locations/:locationId - Update warehouse location
router.put('/:id/locations/:locationId',
  requireRole(['admin', 'manager']),
  updateLocationValidation,
  warehouseController.updateWarehouseLocation
);

// DELETE /api/v1/warehouses/:id - Delete warehouse
router.delete('/:id',
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
    handleValidationErrors
  ],
  warehouseController.deleteWarehouse
);

// DELETE /api/v1/warehouses/:id/locations/:locationId - Delete warehouse location
router.delete('/:id/locations/:locationId',
  requireRole(['admin', 'manager']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
    param('locationId').isInt({ min: 1 }).withMessage('Valid location ID is required'),
    handleValidationErrors
  ],
  warehouseController.deleteWarehouseLocation
);

module.exports = router;