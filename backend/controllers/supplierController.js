const supplierService = require('../services/supplierService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class SupplierController {
  // Get all suppliers
  getSuppliers = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      country,
      sort = 'name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      country,
      sort,
      order
    };

    const result = await supplierService.getSuppliers(filters);

    res.status(200).json(formatResponse(result, 'Suppliers retrieved successfully'));
  });

  // Get single supplier
  getSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const supplier = await supplierService.getSupplierById(id);

    res.status(200).json(formatResponse(supplier, 'Supplier retrieved successfully'));
  });

  // Create new supplier
  createSupplier = asyncHandler(async (req, res) => {
    const supplierData = req.body;
    const userId = req.user.id;

    const supplier = await supplierService.createSupplier(supplierData, userId);

    res.status(201).json(formatResponse(supplier, 'Supplier created successfully'));
  });

  // Update supplier
  updateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const supplier = await supplierService.updateSupplier(id, updateData, userId);

    res.status(200).json(formatResponse(supplier, 'Supplier updated successfully'));
  });

  // Delete supplier
  deleteSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await supplierService.deleteSupplier(id, userId);

    res.status(200).json(formatResponse(null, 'Supplier deleted successfully'));
  });

  // Get supplier products
  getSupplierProducts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      category,
      sort = 'name',
      order = 'asc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      sort,
      order
    };

    const result = await supplierService.getSupplierProducts(id, filters);

    res.status(200).json(formatResponse(result, 'Supplier products retrieved successfully'));
  });

  // Get supplier contacts
  getSupplierContacts = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const contacts = await supplierService.getSupplierContacts(id);

    res.status(200).json(formatResponse(contacts, 'Supplier contacts retrieved successfully'));
  });

  // Add supplier contact
  addSupplierContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contactData = req.body;
    const userId = req.user.id;

    const contact = await supplierService.addSupplierContact(id, contactData, userId);

    res.status(201).json(formatResponse(contact, 'Supplier contact added successfully'));
  });

  // Update supplier contact
  updateSupplierContact = asyncHandler(async (req, res) => {
    const { id, contactId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const contact = await supplierService.updateSupplierContact(contactId, updateData, userId);

    res.status(200).json(formatResponse(contact, 'Supplier contact updated successfully'));
  });

  // Delete supplier contact
  deleteSupplierContact = asyncHandler(async (req, res) => {
    const { id, contactId } = req.params;
    const userId = req.user.id;

    await supplierService.deleteSupplierContact(contactId, userId);

    res.status(200).json(formatResponse(null, 'Supplier contact deleted successfully'));
  });

  // Get supplier purchase orders
  getSupplierPurchaseOrders = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate,
      sort,
      order
    };

    const result = await supplierService.getSupplierPurchaseOrders(id, filters);

    res.status(200).json(formatResponse(result, 'Supplier purchase orders retrieved successfully'));
  });

  // Get supplier performance metrics
  getSupplierPerformance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = '90d' } = req.query;

    const performance = await supplierService.getSupplierPerformance(id, period);

    res.status(200).json(formatResponse(performance, 'Supplier performance retrieved successfully'));
  });
}

module.exports = new SupplierController();