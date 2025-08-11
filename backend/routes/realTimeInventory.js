const express = require('express');
const { body, param, query } = require('express-validator');
const realTimeInventoryController = require('../controllers/realTimeInventoryController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas for real-time inventory operations
const updateStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('quantity_change').isInt().withMessage('Quantity change must be an integer'),
  body('movement_type').isIn([
    'purchase_receive', 'sale', 'transfer_in', 'transfer_out', 
    'adjustment_increase', 'adjustment_decrease', 'count_increase', 
    'count_decrease', 'return', 'damage', 'expired'
  ]).withMessage('Invalid movement type'),
  body('unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be a non-negative number'),
  body('reference').optional().trim().isLength({ max: 255 }).withMessage('Reference must be less than 255 characters'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  body('costing_method').optional().isIn(['FIFO', 'LIFO', 'AVERAGE']).withMessage('Invalid costing method'),
  body('prevent_negative').optional().isBoolean().withMessage('Prevent negative must be boolean'),
  handleValidationErrors
];

const transferStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('from_warehouse_id').isUUID().withMessage('Valid source warehouse ID is required'),
  body('to_warehouse_id').isUUID().withMessage('Valid destination warehouse ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  body('reference').optional().trim().isLength({ max: 255 }).withMessage('Reference must be less than 255 characters'),
  body('costing_method').optional().isIn(['FIFO', 'LIFO', 'AVERAGE']).withMessage('Invalid costing method'),
  handleValidationErrors
];

const bulkUpdateValidation = [
  body('updates').isArray({ min: 1, max: 1000 }).withMessage('Updates array is required (max 1000 items)'),
  body('updates.*.product_id').isUUID().withMessage('Valid product ID is required for each update'),
  body('updates.*.warehouse_id').isUUID().withMessage('Valid warehouse ID is required for each update'),
  body('updates.*.quantity_change').isInt().withMessage('Quantity change must be an integer for each update'),
  body('updates.*.movement_type').isIn([
    'purchase_receive', 'sale', 'transfer_in', 'transfer_out', 
    'adjustment_increase', 'adjustment_decrease', 'count_increase', 
    'count_decrease', 'return', 'damage', 'expired'
  ]).withMessage('Invalid movement type for each update'),
  body('updates.*.unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be non-negative'),
  body('updates.*.costing_method').optional().isIn(['FIFO', 'LIFO', 'AVERAGE']).withMessage('Invalid costing method'),
  handleValidationErrors
];

const adjustStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('adjustment_type').isIn(['increase', 'decrease']).withMessage('Adjustment type must be increase or decrease'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be less than 500 characters'),
  body('reference').optional().trim().isLength({ max: 255 }).withMessage('Reference must be less than 255 characters'),
  body('unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be non-negative'),
  body('costing_method').optional().isIn(['FIFO', 'LIFO', 'AVERAGE']).withMessage('Invalid costing method'),
  handleValidationErrors
];

const reserveStockValidation = [
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('warehouse_id').isUUID().withMessage('Valid warehouse ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reference').trim().isLength({ min: 1, max: 255 }).withMessage('Reference is required and must be less than 255 characters'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  handleValidationErrors
];

const getRealTimeStatusValidation = [
  query('warehouse_id').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('product_id').optional().isUUID().withMessage('Valid product ID required'),
  query('low_stock_only').optional().isBoolean().withMessage('Low stock only must be boolean'),
  query('include_reserved').optional().isBoolean().withMessage('Include reserved must be boolean'),
  handleValidationErrors
];

const getStockMovementsValidation = [
  param('productId').isUUID().withMessage('Valid product ID is required'),
  query('warehouse_id').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('movement_type').optional().isIn([
    'purchase_receive', 'sale', 'transfer_in', 'transfer_out', 
    'adjustment_increase', 'adjustment_decrease', 'count_increase', 
    'count_decrease', 'return', 'damage', 'expired'
  ]).withMessage('Invalid movement type'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const getValuationValidation = [
  query('warehouse_id').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('costing_method').optional().isIn(['FIFO', 'LIFO', 'AVERAGE']).withMessage('Invalid costing method'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getLowStockValidation = [
  query('warehouse_id').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('alert_type').optional().isIn(['low_stock', 'out_of_stock']).withMessage('Invalid alert type'),
  query('status').optional().isIn(['pending', 'acknowledged', 'resolved']).withMessage('Invalid status'),
  handleValidationErrors
];

const updateAlertValidation = [
  param('alertId').isUUID().withMessage('Valid alert ID is required'),
  body('status').isIn(['pending', 'acknowledged', 'resolved']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

const getAnalyticsValidation = [
  query('warehouse_id').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
  handleValidationErrors
];

// Real-time inventory routes

// GET /api/v1/inventory/realtime/health - Health check
router.get('/health', realTimeInventoryController.healthCheck);

// GET /api/v1/inventory/realtime/status - Get real-time inventory status
router.get('/status', getRealTimeStatusValidation, realTimeInventoryController.getRealTimeStatus);

// PUT /api/v1/inventory/realtime/update-stock - Real-time stock update
router.put('/update-stock',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  updateStockValidation,
  realTimeInventoryController.updateStock
);

// POST /api/v1/inventory/realtime/transfer - Stock transfer between warehouses
router.post('/transfer',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  transferStockValidation,
  realTimeInventoryController.transferStock
);

// POST /api/v1/inventory/realtime/bulk-update - Bulk stock updates
router.post('/bulk-update',
  requireRole(['admin', 'manager']),
  bulkUpdateValidation,
  realTimeInventoryController.bulkUpdateStock
);

// POST /api/v1/inventory/realtime/adjustment - Stock adjustment
router.post('/adjustment',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  adjustStockValidation,
  realTimeInventoryController.adjustStock
);

// POST /api/v1/inventory/realtime/reserve - Reserve stock
router.post('/reserve',
  requireRole(['admin', 'manager', 'sales_staff']),
  reserveStockValidation,
  realTimeInventoryController.reserveStock
);

// DELETE /api/v1/inventory/realtime/reserve/:reservationId - Release reserved stock
router.delete('/reserve/:reservationId',
  requireRole(['admin', 'manager', 'sales_staff']),
  [
    param('reservationId').isUUID().withMessage('Valid reservation ID is required'),
    handleValidationErrors
  ],
  realTimeInventoryController.releaseReservedStock
);

// GET /api/v1/inventory/realtime/movements/:productId - Get stock movements for product
router.get('/movements/:productId',
  getStockMovementsValidation,
  realTimeInventoryController.getStockMovements
);

// GET /api/v1/inventory/realtime/valuation - Get inventory valuation with different costing methods
router.get('/valuation',
  requireRole(['admin', 'manager']),
  getValuationValidation,
  realTimeInventoryController.getInventoryValuation
);

// GET /api/v1/inventory/realtime/alerts - Get low stock alerts
router.get('/alerts',
  getLowStockValidation,
  realTimeInventoryController.getLowStockAlerts
);

// PUT /api/v1/inventory/realtime/alerts/:alertId - Update reorder alert status
router.put('/alerts/:alertId',
  requireRole(['admin', 'manager']),
  updateAlertValidation,
  realTimeInventoryController.updateReorderAlert
);

// GET /api/v1/inventory/realtime/analytics - Get inventory analytics
router.get('/analytics',
  requireRole(['admin', 'manager']),
  getAnalyticsValidation,
  realTimeInventoryController.getInventoryAnalytics
);

module.exports = router;