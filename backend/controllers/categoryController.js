const categoryService = require('../services/categoryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class CategoryController {
  // Get all categories
  getCategories = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      search,
      parent,
      status,
      sort = 'name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      parent,
      status,
      sort,
      order
    };

    const result = await categoryService.getCategories(filters);

    res.status(200).json(formatResponse(result, 'Categories retrieved successfully'));
  });

  // Get category tree
  getCategoryTree = asyncHandler(async (req, res) => {
    const tree = await categoryService.getCategoryTree();

    res.status(200).json(formatResponse(tree, 'Category tree retrieved successfully'));
  });

  // Get single category
  getCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id);

    res.status(200).json(formatResponse(category, 'Category retrieved successfully'));
  });

  // Create new category
  createCategory = asyncHandler(async (req, res) => {
    const categoryData = req.body;
    const userId = req.user.id;

    const category = await categoryService.createCategory(categoryData, userId);

    res.status(201).json(formatResponse(category, 'Category created successfully'));
  });

  // Update category
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const category = await categoryService.updateCategory(id, updateData, userId);

    res.status(200).json(formatResponse(category, 'Category updated successfully'));
  });

  // Delete category
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await categoryService.deleteCategory(id, userId);

    res.status(200).json(formatResponse(null, 'Category deleted successfully'));
  });

  // Get products in category
  getCategoryProducts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      sort = 'name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order
    };

    const result = await categoryService.getCategoryProducts(id, filters);

    res.status(200).json(formatResponse(result, 'Category products retrieved successfully'));
  });

  // Reorder categories
  reorderCategories = asyncHandler(async (req, res) => {
    const { categories } = req.body;
    const userId = req.user.id;

    const result = await categoryService.reorderCategories(categories, userId);

    res.status(200).json(formatResponse(result, 'Categories reordered successfully'));
  });
}

module.exports = new CategoryController();