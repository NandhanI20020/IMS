const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', formattedErrors));
  }
  next();
};

// Common validation rules
const commonValidations = {
  id: param('id').isUUID().withMessage('Valid UUID required'),
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  search: query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be 1-100 characters'),
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  password: body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  phone: body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  name: body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be 1-255 characters'),
  description: body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
};

// Authentication validations
const authValidations = {
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    handleValidationErrors
  ],

  refreshToken: [
    body('refresh_token').notEmpty().withMessage('Refresh token is required'),
    handleValidationErrors
  ]
};

// Product validations
const productValidations = {
  create: [
    body('sku').trim().isLength({ min: 1, max: 100 }).withMessage('SKU is required and must be 1-100 characters'),
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required'),
    body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
    body('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer'),
    body('brand').optional().isLength({ max: 100 }).withMessage('Brand must be less than 100 characters'),
    body('cost_price').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('reorder_point').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
    body('max_stock_level').optional().isInt({ min: 1 }).withMessage('Max stock level must be a positive integer'),
    handleValidationErrors
  ],

  update: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Product name must be 1-255 characters'),
    body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('selling_price').optional().isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('reorder_point').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
    handleValidationErrors
  ],

  list: [
    commonValidations.page,
    commonValidations.limit,
    commonValidations.search,
    query('category_id').optional().isInt().withMessage('Category ID must be an integer'),
    query('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer'),
    query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    handleValidationErrors
  ]
};

// Category validations
const categoryValidations = {
  create: [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Category name is required'),
    body('code').trim().isLength({ min: 1, max: 20 }).withMessage('Category code is required'),
    body('parent_id').optional().isInt().withMessage('Parent ID must be an integer'),
    commonValidations.description,
    handleValidationErrors
  ],

  update: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category name must be 1-100 characters'),
    body('parent_id').optional().isInt().withMessage('Parent ID must be an integer'),
    handleValidationErrors
  ]
};

// Supplier validations
const supplierValidations = {
  create: [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Supplier name is required'),
    body('code').trim().isLength({ min: 1, max: 50 }).withMessage('Supplier code is required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('payment_terms').optional().isInt({ min: 0 }).withMessage('Payment terms must be a non-negative integer'),
    body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a positive number'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    handleValidationErrors
  ],

  update: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Supplier name must be 1-255 characters'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    handleValidationErrors
  ]
};

// Warehouse validations
const warehouseValidations = {
  create: [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Warehouse name is required'),
    body('code').trim().isLength({ min: 1, max: 20 }).withMessage('Warehouse code is required'),
    body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
    body('city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required'),
    body('state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required'),
    body('postal_code').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    handleValidationErrors
  ],

  update: [
    commonValidations.id,
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Warehouse name must be 1-100 characters'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    handleValidationErrors
  ]
};

// Purchase Order validations
const purchaseOrderValidations = {
  create: [
    body('supplier_id').isInt().withMessage('Supplier ID is required'),
    body('warehouse_id').isInt().withMessage('Warehouse ID is required'),
    body('expected_delivery_date').optional().isISO8601().withMessage('Valid delivery date required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isUUID().withMessage('Valid product ID required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.unit_cost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
    handleValidationErrors
  ],

  update: [
    commonValidations.id,
    body('status').optional().isIn(['draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'])
      .withMessage('Invalid status'),
    body('expected_delivery_date').optional().isISO8601().withMessage('Valid delivery date required'),
    handleValidationErrors
  ],

  receive: [
    commonValidations.id,
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.id').isUUID().withMessage('Valid item ID required'),
    body('items.*.received_quantity').isInt({ min: 0 }).withMessage('Received quantity must be non-negative'),
    handleValidationErrors
  ]
};

// Inventory validations
const inventoryValidations = {
  adjust: [
    body('product_id').isUUID().withMessage('Valid product ID required'),
    body('warehouse_id').isInt().withMessage('Warehouse ID is required'),
    body('quantity').isInt().withMessage('Quantity must be an integer'),
    body('reason').trim().isLength({ min: 1 }).withMessage('Reason is required'),
    handleValidationErrors
  ],

  transfer: [
    body('product_id').isUUID().withMessage('Valid product ID required'),
    body('from_warehouse_id').isInt().withMessage('From warehouse ID is required'),
    body('to_warehouse_id').isInt().withMessage('To warehouse ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('reason').optional().trim().isLength({ max: 255 }).withMessage('Reason must be less than 255 characters'),
    handleValidationErrors
  ]
};

module.exports = {
  commonValidations,
  authValidations,
  productValidations,
  categoryValidations,
  supplierValidations,
  warehouseValidations,
  purchaseOrderValidations,
  inventoryValidations,
  handleValidationErrors
};