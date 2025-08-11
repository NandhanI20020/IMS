const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createProductValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required and must be less than 255 characters'),
  body('sku').trim().isLength({ min: 1, max: 100 }).withMessage('SKU is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('supplier_id').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('reorder_point').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 1 }).withMessage('Max stock level must be a positive integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  handleValidationErrors
];

const updateProductValidation = [
  param('id').isUUID().withMessage('Valid product ID is required'),
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Product name must be less than 255 characters'),
  body('sku').optional().trim().isLength({ min: 1, max: 100 }).withMessage('SKU must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('supplier_id').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  body('selling_price').optional().isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('reorder_point').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 1 }).withMessage('Max stock level must be a positive integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  handleValidationErrors
];

const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('category').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  query('supplier').optional().isInt({ min: 1 }).withMessage('Valid supplier ID required'),
  query('warehouse').optional().isInt({ min: 1 }).withMessage('Valid warehouse ID required'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('sort').optional().isIn(['name', 'sku', 'selling_price', 'cost_price', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

// Routes

// GET /api/v1/products - Get all products with filters
router.get('/', getProductsValidation, productController.getProducts);

// GET /api/v1/products/export - Export products to CSV
router.get('/export', 
  requireRole(['admin', 'manager']),
  getProductsValidation,
  productController.exportProducts
);

// GET /api/v1/products/:id - Get single product
router.get('/:id', [
  param('id').isUUID().withMessage('Valid product ID is required'),
  handleValidationErrors
], productController.getProduct);

// GET /api/v1/products/:id/variants - Get product variants
router.get('/:id/variants', [
  param('id').isUUID().withMessage('Valid product ID is required'),
  handleValidationErrors
], productController.getProductVariants);

// POST /api/v1/products - Create new product
router.post('/', 
  requireRole(['admin', 'manager']),
  createProductValidation,
  productController.createProduct
);

// POST /api/v1/products/import - Import products from CSV
router.post('/import',
  requireRole(['admin', 'manager']),
  upload.single('csv'),
  productController.importProducts
);

// POST /api/v1/products/bulk-update - Bulk update products
router.post('/bulk-update',
  requireRole(['admin', 'manager']),
  [
    body('products').isArray({ min: 1 }).withMessage('Products array is required'),
    body('products.*.id').isUUID().withMessage('Valid product ID is required'),
    handleValidationErrors
  ],
  productController.bulkUpdateProducts
);

// PUT /api/v1/products/:id - Update product
router.put('/:id',
  requireRole(['admin', 'manager']),
  updateProductValidation,
  productController.updateProduct
);

// DELETE /api/v1/products/:id - Delete product
router.delete('/:id',
  requireRole(['admin']),
  [
    param('id').isUUID().withMessage('Valid product ID is required'),
    handleValidationErrors
  ],
  productController.deleteProduct
);

module.exports = router;