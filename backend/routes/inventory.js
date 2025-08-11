const express = require('express');
const { body, param, query } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const getInventoryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('product').optional().isUUID().withMessage('Valid product ID required'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('lowStock').optional().isBoolean().withMessage('Low stock must be true or false'),
  query('sort').optional().isIn(['current_stock', 'reorder_level', 'updated_at', 'product_name']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const updateInventoryValidation = [
  param('id').isUUID().withMessage('Valid inventory ID is required'),
  body('current_stock').optional().isInt({ min: 0 }).withMessage('Current stock must be a non-negative integer'),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
  body('reorder_quantity').optional().isInt({ min: 1 }).withMessage('Reorder quantity must be a positive integer'),
  body('max_stock').optional().isInt({ min: 1 }).withMessage('Max stock must be a positive integer'),
  body('location_id').optional().isUUID().withMessage('Valid location ID required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  handleValidationErrors
];

const adjustStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('adjustment_type').isIn(['increase', 'decrease']).withMessage('Adjustment type must be increase or decrease'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').trim().isLength({ min: 1, max: 255 }).withMessage('Reason is required and must be less than 255 characters'),
  body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference must be less than 100 characters'),
  handleValidationErrors
];

const transferStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('from_warehouse_id').isUUID().withMessage('Valid source warehouse ID is required'),
  body('to_warehouse_id').isUUID().withMessage('Valid destination warehouse ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').optional().trim().isLength({ max: 255 }).withMessage('Reason must be less than 255 characters'),
  body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference must be less than 100 characters'),
  handleValidationErrors
];

const getStockMovementsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('product').optional().isUUID().withMessage('Valid product ID required'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('type').optional().isIn(['purchase_receive', 'sale', 'transfer_in', 'transfer_out', 'adjustment_increase', 'adjustment_decrease', 'count_increase', 'count_decrease']).withMessage('Invalid movement type'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('sort').optional().isIn(['created_at', 'quantity', 'movement_type']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const setReorderLevelsValidation = [
  param('productId').isUUID().withMessage('Valid product ID is required'),
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('reorder_level').isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
  body('reorder_quantity').isInt({ min: 1 }).withMessage('Reorder quantity must be a positive integer'),
  handleValidationErrors
];

const stockCountValidation = [
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('products').isArray({ min: 1 }).withMessage('Products array is required'),
  body('products.*.product_id').isUUID().withMessage('Valid product ID is required'),
  body('products.*.counted_quantity').isInt({ min: 0 }).withMessage('Counted quantity must be a non-negative integer'),
  handleValidationErrors
];

// Routes

// GET /api/v1/inventory - Get inventory with filters
router.get('/', getInventoryValidation, inventoryController.getInventory);

// GET /api/v1/inventory/low-stock - Get low stock alerts
router.get('/low-stock', [
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  handleValidationErrors
], inventoryController.getLowStockAlerts);

// GET /api/v1/inventory/valuation - Get inventory valuation
router.get('/valuation',
  requireRole(['admin', 'manager']),
  [
    query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
    query('date').optional().isISO8601().withMessage('Valid date required'),
    handleValidationErrors
  ],
  inventoryController.getInventoryValuation
);

// GET /api/v1/inventory/movements - Get stock movements
router.get('/movements', getStockMovementsValidation, inventoryController.getStockMovements);

// GET /api/v1/inventory/product/:productId - Get inventory for specific product
router.get('/product/:productId', [
  param('productId').isUUID().withMessage('Valid product ID is required'),
  handleValidationErrors
], inventoryController.getProductInventory);

// PUT /api/v1/inventory/:id - Update inventory
router.put('/:id',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  updateInventoryValidation,
  inventoryController.updateInventory
);

// POST /api/v1/inventory/adjust - Adjust stock levels
router.post('/adjust',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  adjustStockValidation,
  inventoryController.adjustStock
);

// POST /api/v1/inventory/transfer - Transfer stock between warehouses
router.post('/transfer',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  transferStockValidation,
  inventoryController.transferStock
);

// POST /api/v1/inventory/reorder-levels/:productId - Set reorder levels
router.post('/reorder-levels/:productId',
  requireRole(['admin', 'manager']),
  setReorderLevelsValidation,
  inventoryController.setReorderLevels
);

// POST /api/v1/inventory/stock-count - Perform stock count
router.post('/stock-count',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  stockCountValidation,
  inventoryController.performStockCount
);

module.exports = router;