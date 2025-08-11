const express = require('express');
const { body, param, query } = require('express-validator');
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createSupplierValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Supplier name is required and must be less than 255 characters'),
  body('company_code').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Company code must be less than 50 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('website').optional().trim().isURL().withMessage('Valid website URL required'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('state').optional().trim().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('postal_code').optional().trim().isLength({ max: 20 }).withMessage('Postal code must be less than 20 characters'),
  body('country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('tax_id').optional().trim().isLength({ max: 50 }).withMessage('Tax ID must be less than 50 characters'),
  body('payment_terms').optional().trim().isLength({ max: 100 }).withMessage('Payment terms must be less than 100 characters'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a non-negative number'),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  handleValidationErrors
];

const updateSupplierValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Supplier name must be less than 255 characters'),
  body('company_code').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Company code must be less than 50 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('website').optional().trim().isURL().withMessage('Valid website URL required'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('state').optional().trim().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('postal_code').optional().trim().isLength({ max: 20 }).withMessage('Postal code must be less than 20 characters'),
  body('country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('tax_id').optional().trim().isLength({ max: 50 }).withMessage('Tax ID must be less than 50 characters'),
  body('payment_terms').optional().trim().isLength({ max: 100 }).withMessage('Payment terms must be less than 100 characters'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a non-negative number'),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  handleValidationErrors
];

const getSuppliersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  query('country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  query('sort').optional().isIn(['name', 'company_code', 'email', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const getSupplierProductsValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('category').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  query('sort').optional().isIn(['name', 'sku', 'price', 'created_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const createContactValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Contact name is required and must be less than 255 characters'),
  body('position').optional().trim().isLength({ max: 100 }).withMessage('Position must be less than 100 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('mobile').optional().trim().isMobilePhone().withMessage('Valid mobile number required'),
  body('is_primary').optional().isBoolean().withMessage('Is primary must be true or false'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  handleValidationErrors
];

const updateContactValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  param('contactId').isInt({ min: 1 }).withMessage('Valid contact ID is required'),
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Contact name must be less than 255 characters'),
  body('position').optional().trim().isLength({ max: 100 }).withMessage('Position must be less than 100 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number required'),
  body('mobile').optional().trim().isMobilePhone().withMessage('Valid mobile number required'),
  body('is_primary').optional().isBoolean().withMessage('Is primary must be true or false'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  handleValidationErrors
];

const getPurchaseOrdersValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'sent', 'received', 'cancelled', 'partially_received']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('sort').optional().isIn(['created_at', 'total', 'status', 'order_number']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

// Routes

// GET /api/v1/suppliers - Get all suppliers with filters
router.get('/', getSuppliersValidation, supplierController.getSuppliers);

// GET /api/v1/suppliers/:id - Get single supplier
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  handleValidationErrors
], supplierController.getSupplier);

// GET /api/v1/suppliers/:id/products - Get supplier products
router.get('/:id/products', getSupplierProductsValidation, supplierController.getSupplierProducts);

// GET /api/v1/suppliers/:id/contacts - Get supplier contacts
router.get('/:id/contacts', [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  handleValidationErrors
], supplierController.getSupplierContacts);

// GET /api/v1/suppliers/:id/purchase-orders - Get supplier purchase orders
router.get('/:id/purchase-orders', getPurchaseOrdersValidation, supplierController.getSupplierPurchaseOrders);

// GET /api/v1/suppliers/:id/performance - Get supplier performance metrics
router.get('/:id/performance',
  requireRole(['admin', 'manager']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
    query('period').optional().isIn(['30d', '90d', '365d']).withMessage('Invalid period'),
    handleValidationErrors
  ],
  supplierController.getSupplierPerformance
);

// POST /api/v1/suppliers - Create new supplier
router.post('/',
  requireRole(['admin', 'manager']),
  createSupplierValidation,
  supplierController.createSupplier
);

// POST /api/v1/suppliers/:id/contacts - Add supplier contact
router.post('/:id/contacts',
  requireRole(['admin', 'manager']),
  createContactValidation,
  supplierController.addSupplierContact
);

// PUT /api/v1/suppliers/:id - Update supplier
router.put('/:id',
  requireRole(['admin', 'manager']),
  updateSupplierValidation,
  supplierController.updateSupplier
);

// PUT /api/v1/suppliers/:id/contacts/:contactId - Update supplier contact
router.put('/:id/contacts/:contactId',
  requireRole(['admin', 'manager']),
  updateContactValidation,
  supplierController.updateSupplierContact
);

// DELETE /api/v1/suppliers/:id - Delete supplier
router.delete('/:id',
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
    handleValidationErrors
  ],
  supplierController.deleteSupplier
);

// DELETE /api/v1/suppliers/:id/contacts/:contactId - Delete supplier contact
router.delete('/:id/contacts/:contactId',
  requireRole(['admin', 'manager']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
    param('contactId').isInt({ min: 1 }).withMessage('Valid contact ID is required'),
    handleValidationErrors
  ],
  supplierController.deleteSupplierContact
);

module.exports = router;