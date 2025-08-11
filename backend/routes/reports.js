const express = require('express');
const { body, param, query } = require('express-validator');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const getDashboardValidation = [
  query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  handleValidationErrors
];

const getInventoryValuationValidation = [
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('date').optional().isISO8601().withMessage('Valid date required'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getLowStockValidation = [
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('threshold').optional().isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getSalesReportValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('product').optional().isUUID().withMessage('Valid product ID required'),
  query('category').optional().isUUID().withMessage('Valid category ID required'),
  query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getStockMovementValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('product').optional().isUUID().withMessage('Valid product ID required'),
  query('type').optional().isIn(['purchase_receive', 'sale', 'transfer_in', 'transfer_out', 'adjustment_increase', 'adjustment_decrease', 'count_increase', 'count_decrease']).withMessage('Invalid movement type'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getPurchaseOrderReportValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('supplier').optional().isUUID().withMessage('Valid supplier ID required'),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'sent', 'received', 'cancelled', 'partially_received', 'rejected']).withMessage('Invalid status'),
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getSupplierPerformanceValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('supplier').optional().isUUID().withMessage('Valid supplier ID required'),
  query('metrics').optional().isIn(['all', 'delivery', 'quality', 'pricing']).withMessage('Invalid metrics filter'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getABCAnalysisValidation = [
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('period').optional().isIn(['30d', '90d', '365d']).withMessage('Invalid period'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getInventoryAgingValidation = [
  query('warehouse').optional().isUUID().withMessage('Valid warehouse ID required'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const getCustomReportValidation = [
  param('reportId').isUUID().withMessage('Valid report ID is required'),
  query('parameters').optional().isJSON().withMessage('Parameters must be valid JSON'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  handleValidationErrors
];

const scheduleReportValidation = [
  body('reportType').isIn(['inventory_valuation', 'low_stock', 'sales', 'stock_movement', 'purchase_order', 'supplier_performance', 'abc_analysis', 'inventory_aging']).withMessage('Invalid report type'),
  body('schedule').isObject().withMessage('Schedule configuration is required'),
  body('schedule.frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid schedule frequency'),
  body('schedule.time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('schedule.dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
  body('schedule.dayOfMonth').optional().isInt({ min: 1, max: 31 }).withMessage('Day of month must be 1-31'),
  body('parameters').optional().isObject().withMessage('Parameters must be an object'),
  body('recipients').isArray({ min: 1 }).withMessage('Recipients array is required'),
  body('recipients.*').isEmail().withMessage('All recipients must be valid email addresses'),
  handleValidationErrors
];

const updateScheduledReportValidation = [
  param('id').isUUID().withMessage('Valid scheduled report ID is required'),
  body('reportType').optional().isIn(['inventory_valuation', 'low_stock', 'sales', 'stock_movement', 'purchase_order', 'supplier_performance', 'abc_analysis', 'inventory_aging']).withMessage('Invalid report type'),
  body('schedule').optional().isObject().withMessage('Schedule configuration must be an object'),
  body('schedule.frequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid schedule frequency'),
  body('schedule.time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('schedule.dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
  body('schedule.dayOfMonth').optional().isInt({ min: 1, max: 31 }).withMessage('Day of month must be 1-31'),
  body('parameters').optional().isObject().withMessage('Parameters must be an object'),
  body('recipients').optional().isArray({ min: 1 }).withMessage('Recipients must be an array'),
  body('recipients.*').optional().isEmail().withMessage('All recipients must be valid email addresses'),
  body('is_active').optional().isBoolean().withMessage('Is active must be true or false'),
  handleValidationErrors
];

// Routes

// GET /api/v1/reports/dashboard - Get dashboard overview (no auth required for testing)
router.get('/dashboard', getDashboardValidation, reportController.getDashboard);

// GET /api/v1/reports/dashboard/public - Public dashboard endpoint (no auth required)
router.get('/dashboard/public', getDashboardValidation, reportController.getDashboard);

// GET /api/v1/reports/dashboard/test - Test endpoint (no auth required)
router.get('/dashboard/test', reportController.getDashboard);

// GET /api/v1/reports/inventory-valuation - Get inventory valuation report
router.get('/inventory-valuation',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getInventoryValuationValidation,
  reportController.getInventoryValuation
);

// GET /api/v1/reports/low-stock - Get low stock report
router.get('/low-stock', 
  authenticateToken,
  getLowStockValidation, 
  reportController.getLowStockReport
);

// GET /api/v1/reports/sales - Get sales report
router.get('/sales',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getSalesReportValidation,
  reportController.getSalesReport
);

// GET /api/v1/reports/stock-movement - Get stock movement report
router.get('/stock-movement',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getStockMovementValidation,
  reportController.getStockMovementReport
);

// GET /api/v1/reports/purchase-orders - Get purchase order report
router.get('/purchase-orders',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getPurchaseOrderReportValidation,
  reportController.getPurchaseOrderReport
);

// GET /api/v1/reports/supplier-performance - Get supplier performance report
router.get('/supplier-performance',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getSupplierPerformanceValidation,
  reportController.getSupplierPerformanceReport
);

// GET /api/v1/reports/abc-analysis - Get ABC analysis report
router.get('/abc-analysis',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getABCAnalysisValidation,
  reportController.getABCAnalysisReport
);

// GET /api/v1/reports/inventory-aging - Get inventory aging report
router.get('/inventory-aging',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getInventoryAgingValidation,
  reportController.getInventoryAgingReport
);

// GET /api/v1/reports/custom/:reportId - Get custom report
router.get('/custom/:reportId',
  authenticateToken,
  requireRole(['admin', 'manager']),
  getCustomReportValidation,
  reportController.getCustomReport
);

// GET /api/v1/reports/scheduled - Get scheduled reports
router.get('/scheduled',
  authenticateToken,
  requireRole(['admin', 'manager']),
  reportController.getScheduledReports
);

// POST /api/v1/reports/schedule - Schedule a report
router.post('/schedule',
  authenticateToken,
  requireRole(['admin', 'manager']),
  scheduleReportValidation,
  reportController.scheduleReport
);

// PUT /api/v1/reports/scheduled/:id - Update scheduled report
router.put('/scheduled/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  updateScheduledReportValidation,
  reportController.updateScheduledReport
);

// DELETE /api/v1/reports/scheduled/:id - Delete scheduled report
router.delete('/scheduled/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Valid scheduled report ID is required'),
    handleValidationErrors
  ],
  reportController.deleteScheduledReport
);

module.exports = router;