const express = require('express');
const { body, param, query } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createCategoryValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Category name is required and must be less than 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('Valid parent category ID required'),
  body('image_url').optional().isURL().withMessage('Valid image URL required'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  handleValidationErrors
];

const updateCategoryValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Category name must be less than 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('Valid parent category ID required'),
  body('image_url').optional().isURL().withMessage('Valid image URL required'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  handleValidationErrors
];

const getCategoriesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
  query('parent').optional().isInt({ min: 1 }).withMessage('Valid parent category ID required'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('sort').optional().isIn(['name', 'sort_order', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const getCategoryProductsValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['name', 'sku', 'price', 'created_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const reorderCategoriesValidation = [
  body('categories').isArray({ min: 1 }).withMessage('Categories array is required'),
  body('categories.*.id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('categories.*.sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  handleValidationErrors
];

// Routes

// GET /api/v1/categories - Get all categories with filters
router.get('/', getCategoriesValidation, categoryController.getCategories);

// GET /api/v1/categories/tree - Get category tree structure
router.get('/tree', categoryController.getCategoryTree);

// GET /api/v1/categories/:id - Get single category
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  handleValidationErrors
], categoryController.getCategory);

// GET /api/v1/categories/:id/products - Get products in category
router.get('/:id/products', getCategoryProductsValidation, categoryController.getCategoryProducts);

// POST /api/v1/categories - Create new category
router.post('/',
  requireRole(['admin', 'manager']),
  createCategoryValidation,
  categoryController.createCategory
);

// POST /api/v1/categories/reorder - Reorder categories
router.post('/reorder',
  requireRole(['admin', 'manager']),
  reorderCategoriesValidation,
  categoryController.reorderCategories
);

// PUT /api/v1/categories/:id - Update category
router.put('/:id',
  requireRole(['admin', 'manager']),
  updateCategoryValidation,
  categoryController.updateCategory
);

// DELETE /api/v1/categories/:id - Delete category
router.delete('/:id',
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    handleValidationErrors
  ],
  categoryController.deleteCategory
);

module.exports = router;