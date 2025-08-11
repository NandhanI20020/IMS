const productService = require('../services/productService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class ProductController {
  // Get all products with search, filter, and pagination
  getProducts = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      supplier,
      warehouse,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      status,
      supplier,
      warehouse,
      sort,
      order
    };

    const result = await productService.getProducts(filters);

    res.status(200).json(formatResponse(result, 'Products retrieved successfully'));
  });

  // Get single product by ID
  getProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await productService.getProductById(id);

    res.status(200).json(formatResponse(product, 'Product retrieved successfully'));
  });

  // Create new product
  createProduct = asyncHandler(async (req, res) => {
    const productData = req.body;
    const userId = req.user.id;

    const product = await productService.createProduct(productData, userId);

    res.status(201).json(formatResponse(product, 'Product created successfully'));
  });

  // Update product
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const product = await productService.updateProduct(id, updateData, userId);

    res.status(200).json(formatResponse(product, 'Product updated successfully'));
  });

  // Delete product
  deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await productService.deleteProduct(id, userId);

    res.status(200).json(formatResponse(null, 'Product deleted successfully'));
  });

  // Get product variants
  getProductVariants = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const variants = await productService.getProductVariants(id);

    res.status(200).json(formatResponse(variants, 'Product variants retrieved successfully'));
  });

  // Bulk update products
  bulkUpdateProducts = asyncHandler(async (req, res) => {
    const { products } = req.body;
    const userId = req.user.id;

    const result = await productService.bulkUpdateProducts(products, userId);

    res.status(200).json(formatResponse(result, 'Products updated successfully'));
  });

  // Import products from CSV
  importProducts = asyncHandler(async (req, res) => {
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json(formatResponse(null, 'CSV file is required', false));
    }

    const result = await productService.importProductsFromCSV(file, userId);

    res.status(200).json(formatResponse(result, 'Products imported successfully'));
  });

  // Export products to CSV
  exportProducts = asyncHandler(async (req, res) => {
    const filters = req.query;

    const csvData = await productService.exportProductsToCSV(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.status(200).send(csvData);
  });
}

module.exports = new ProductController();