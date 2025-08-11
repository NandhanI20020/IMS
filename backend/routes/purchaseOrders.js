const express = require('express');
const { body, param, query } = require('express-validator');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createPurchaseOrderValidation = [
  body('supplier_id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  body('warehouse_id').isInt({ min: 1 }).withMessage('Valid warehouse ID is required'),
  body('reference').optional().trim().isLength({ max: 255 }).withMessage('Reference must be less than 255 characters'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
  body('items.*.product_id').isUUID().withMessage('Valid product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer for each item'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number for each item'),
  body('shipping_cost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be a non-negative number'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
  handleValidationErrors
];

const updatePurchaseOrderValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('supplier_id').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  body('warehouse_id').optional().isInt({ min: 1 }).withMessage('Valid warehouse ID required'),
  body('reference').optional().trim().isLength({ max: 255 }).withMessage('Reference must be less than 255 characters'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('items').optional().isArray({ min: 1 }).withMessage('Items array must contain at least one item'),
  body('items.*.product_id').optional().isUUID().withMessage('Valid product ID is required for each item'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer for each item'),
  body('items.*.unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number for each item'),
  body('shipping_cost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be a non-negative number'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
  handleValidationErrors
];

const getPurchaseOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('status').optional().isIn(['draft', 'sent', 'confirmed', 'partially_received', 'received', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('supplier').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  query('warehouse').optional().isInt({ min: 1 }).withMessage('Valid warehouse ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('sort').optional().isIn(['created_at', 'order_number', 'total_amount', 'status', 'expected_delivery_date', 'priority']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const sendPurchaseOrderValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('email').trim().isEmail().withMessage('Valid email address is required'),
  body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message must be less than 1000 characters'),
  handleValidationErrors
];

const receivePurchaseOrderValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must contain at least one item'),
  body('items.*.product_id').isUUID().withMessage('Valid product ID is required for each item'),
  body('items.*.received_quantity').isInt({ min: 0 }).withMessage('Received quantity must be a non-negative integer for each item'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

const approveRejectValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

const rejectValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason is required and must be less than 500 characters'),
  handleValidationErrors
];

const cancelValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters'),
  handleValidationErrors
];

const getAnalyticsValidation = [
  query('period').optional().isIn(['30d', '90d', '365d']).withMessage('Invalid period'),
  query('supplier').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  query('status').optional().isIn(['draft', 'sent', 'confirmed', 'partially_received', 'received', 'completed', 'cancelled']).withMessage('Invalid status'),
  handleValidationErrors
];

const confirmPurchaseOrderValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('supplierReference').optional().trim().isLength({ max: 255 }).withMessage('Supplier reference must be less than 255 characters'),
  body('expectedDeliveryDate').optional().isISO8601().withMessage('Valid expected delivery date required'),
  handleValidationErrors
];

const completePurchaseOrderValidation = [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

const bulkUpdateValidation = [
  body('orderIds').isArray({ min: 1 }).withMessage('Order IDs array is required and must contain at least one ID'),
  body('orderIds.*').isUUID().withMessage('All order IDs must be valid UUIDs'),
  body('updateData').isObject().withMessage('Update data object is required'),
  body('updateData.priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('updateData.expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('updateData.notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

const bulkSendValidation = [
  body('orderIds').isArray({ min: 1 }).withMessage('Order IDs array is required and must contain at least one ID'),
  body('orderIds.*').isUUID().withMessage('All order IDs must be valid UUIDs'),
  body('emailTemplate').optional().isObject().withMessage('Email template must be an object'),
  body('emailTemplate.subject').optional().trim().isLength({ max: 255 }).withMessage('Email subject must be less than 255 characters'),
  body('emailTemplate.message').optional().trim().isLength({ max: 2000 }).withMessage('Email message must be less than 2000 characters'),
  handleValidationErrors
];

const bulkCancelValidation = [
  body('orderIds').isArray({ min: 1 }).withMessage('Order IDs array is required and must contain at least one ID'),
  body('orderIds.*').isUUID().withMessage('All order IDs must be valid UUIDs'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Cancellation reason must be less than 500 characters'),
  handleValidationErrors
];

// Routes

// GET /api/v1/purchase-orders - Get all purchase orders with filters
router.get('/', getPurchaseOrdersValidation, purchaseOrderController.getPurchaseOrders);

// GET /api/v1/purchase-orders/analytics - Get purchase order analytics
router.get('/analytics',
  requireRole(['admin', 'manager']),
  getAnalyticsValidation,
  purchaseOrderController.getPurchaseOrderAnalytics
);

// GET /api/v1/purchase-orders/:id - Get single purchase order
router.get('/:id', [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  handleValidationErrors
], purchaseOrderController.getPurchaseOrder);

// GET /api/v1/purchase-orders/:id/history - Get purchase order status history
router.get('/:id/history', [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  handleValidationErrors
], purchaseOrderController.getPurchaseOrderHistory);

// GET /api/v1/purchase-orders/:id/pdf - Get purchase order PDF
router.get('/:id/pdf',
  requireRole(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Valid purchase order ID is required'),
    handleValidationErrors
  ],
  purchaseOrderController.getPurchaseOrderPDF
);

// POST /api/v1/purchase-orders - Create new purchase order
router.post('/',
  requireRole(['admin', 'manager', 'purchaser']),
  createPurchaseOrderValidation,
  purchaseOrderController.createPurchaseOrder
);

// POST /api/v1/purchase-orders/:id/send - Send purchase order to supplier
router.post('/:id/send',
  requireRole(['admin', 'manager', 'purchaser']),
  sendPurchaseOrderValidation,
  purchaseOrderController.sendPurchaseOrderToSupplier
);

// POST /api/v1/purchase-orders/:id/confirm - Confirm purchase order (supplier confirms)
router.post('/:id/confirm',
  requireRole(['admin', 'manager']),
  confirmPurchaseOrderValidation,
  purchaseOrderController.confirmPurchaseOrder
);

// POST /api/v1/purchase-orders/:id/complete - Complete purchase order
router.post('/:id/complete',
  requireRole(['admin', 'manager']),
  completePurchaseOrderValidation,
  purchaseOrderController.completePurchaseOrder
);

// POST /api/v1/purchase-orders/:id/send - Send purchase order to supplier
router.post('/:id/send',
  requireRole(['admin', 'manager']),
  sendPurchaseOrderValidation,
  purchaseOrderController.sendPurchaseOrder
);

// POST /api/v1/purchase-orders/:id/receive - Receive purchase order (full)
router.post('/:id/receive',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  receivePurchaseOrderValidation,
  purchaseOrderController.receivePurchaseOrder
);

// POST /api/v1/purchase-orders/:id/partial-receive - Partially receive purchase order
router.post('/:id/partial-receive',
  requireRole(['admin', 'manager', 'warehouse_staff']),
  receivePurchaseOrderValidation,
  purchaseOrderController.partiallyReceivePurchaseOrder
);

// POST /api/v1/purchase-orders/:id/cancel - Cancel purchase order
router.post('/:id/cancel',
  requireRole(['admin', 'manager']),
  cancelValidation,
  purchaseOrderController.cancelPurchaseOrder
);

// POST /api/v1/purchase-orders/:id/duplicate - Duplicate purchase order
router.post('/:id/duplicate',
  requireRole(['admin', 'manager', 'purchaser']),
  [
    param('id').isUUID().withMessage('Valid purchase order ID is required'),
    handleValidationErrors
  ],
  purchaseOrderController.duplicatePurchaseOrder
);

// PUT /api/v1/purchase-orders/:id - Update purchase order
router.put('/:id',
  requireRole(['admin', 'manager', 'purchaser']),
  updatePurchaseOrderValidation,
  purchaseOrderController.updatePurchaseOrder
);

// DELETE /api/v1/purchase-orders/:id - Delete purchase order
router.delete('/:id',
  requireRole(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Valid purchase order ID is required'),
    handleValidationErrors
  ],
  purchaseOrderController.deletePurchaseOrder
);

// GET /api/v1/purchase-orders/:id/status-history - Get purchase order status history
router.get('/:id/status-history', [
  param('id').isUUID().withMessage('Valid purchase order ID is required'),
  handleValidationErrors
], purchaseOrderController.getPurchaseOrderStatusHistory);

// GET /api/v1/purchase-orders/export - Export purchase orders
router.get('/export',
  requireRole(['admin', 'manager']),
  getPurchaseOrdersValidation,
  purchaseOrderController.exportPurchaseOrders
);

// POST /api/v1/purchase-orders/bulk-update - Bulk update purchase orders
router.post('/bulk-update',
  requireRole(['admin', 'manager']),
  bulkUpdateValidation,
  purchaseOrderController.bulkUpdatePurchaseOrders
);

// POST /api/v1/purchase-orders/bulk-send - Bulk send purchase orders
router.post('/bulk-send',
  requireRole(['admin', 'manager']),
  bulkSendValidation,
  purchaseOrderController.bulkSendPurchaseOrders
);

// POST /api/v1/purchase-orders/bulk-cancel - Bulk cancel purchase orders
router.post('/bulk-cancel',
  requireRole(['admin', 'manager']),
  bulkCancelValidation,
  purchaseOrderController.bulkCancelPurchaseOrders
);

module.exports = router;