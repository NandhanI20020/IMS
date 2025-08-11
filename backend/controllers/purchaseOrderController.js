const purchaseOrderService = require('../services/purchaseOrderService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class PurchaseOrderController {
  // Get all purchase orders
  getPurchaseOrders = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      supplier,
      warehouse,
      startDate,
      endDate,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      supplier,
      warehouse,
      startDate,
      endDate,
      sort,
      order
    };

    const result = await purchaseOrderService.getPurchaseOrders(filters);

    res.status(200).json(formatResponse(result, 'Purchase orders retrieved successfully'));
  });

  // Get single purchase order
  getPurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id);

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order retrieved successfully'));
  });

  // Create new purchase order
  createPurchaseOrder = asyncHandler(async (req, res) => {
    const orderData = req.body;
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.createPurchaseOrder(orderData, userId);

    res.status(201).json(formatResponse(purchaseOrder, 'Purchase order created successfully'));
  });

  // Update purchase order
  updatePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(id, updateData, userId);

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order updated successfully'));
  });

  // Delete purchase order
  deletePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await purchaseOrderService.deletePurchaseOrder(id, userId);

    res.status(200).json(formatResponse(null, 'Purchase order deleted successfully'));
  });

  // Send purchase order to supplier (replaces submit workflow)
  sendPurchaseOrderToSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, message } = req.body;
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.sendPurchaseOrderToSupplier(id, userId, { email, message });

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order sent to supplier successfully'));
  });

  // Confirm purchase order (supplier confirms)
  confirmPurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const confirmationData = req.body; // { notes, supplierReference, expectedDeliveryDate }
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.confirmPurchaseOrder(id, userId, confirmationData);

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order confirmed successfully'));
  });

  // Complete purchase order (close and archive)
  completePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.completePurchaseOrder(id, userId, notes);

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order completed successfully'));
  });

  // Send purchase order to supplier
  sendPurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, message } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.sendPurchaseOrder(id, email, message, userId);

    res.status(200).json(formatResponse(result, 'Purchase order sent to supplier'));
  });

  // Receive purchase order (mark as received)
  receivePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items, notes } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.receivePurchaseOrder(id, items, userId, notes);

    res.status(200).json(formatResponse(result, 'Purchase order received successfully'));
  });

  // Partially receive purchase order
  partiallyReceivePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items, notes } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.partiallyReceivePurchaseOrder(id, items, userId, notes);

    res.status(200).json(formatResponse(result, 'Purchase order partially received'));
  });

  // Cancel purchase order
  cancelPurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const purchaseOrder = await purchaseOrderService.cancelPurchaseOrder(id, userId, reason);

    res.status(200).json(formatResponse(purchaseOrder, 'Purchase order cancelled'));
  });

  // Get purchase order status history
  getPurchaseOrderHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const history = await purchaseOrderService.getPurchaseOrderHistory(id);

    res.status(200).json(formatResponse(history, 'Purchase order history retrieved successfully'));
  });

  // Get purchase order PDF
  getPurchaseOrderPDF = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const pdfBuffer = await purchaseOrderService.generatePurchaseOrderPDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${id}.pdf`);
    res.status(200).send(pdfBuffer);
  });

  // Duplicate purchase order
  duplicatePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const newPurchaseOrder = await purchaseOrderService.duplicatePurchaseOrder(id, userId);

    res.status(201).json(formatResponse(newPurchaseOrder, 'Purchase order duplicated successfully'));
  });

  // Get purchase order analytics
  getPurchaseOrderAnalytics = asyncHandler(async (req, res) => {
    const { period = '30d', supplier, status } = req.query;

    const analytics = await purchaseOrderService.getPurchaseOrderAnalytics({
      period,
      supplier,
      status
    });

    res.status(200).json(formatResponse(analytics, 'Purchase order analytics retrieved successfully'));
  });

  // Get purchase order status history
  getPurchaseOrderStatusHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const history = await purchaseOrderService.getPurchaseOrderStatusHistory(id);

    res.status(200).json(formatResponse(history, 'Purchase order status history retrieved successfully'));
  });

  // Bulk update purchase orders
  bulkUpdatePurchaseOrders = asyncHandler(async (req, res) => {
    const { orderIds, updateData } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.bulkUpdatePurchaseOrders(orderIds, updateData, userId);

    res.status(200).json(formatResponse(result, `${result.length} purchase orders updated successfully`));
  });

  // Bulk send purchase orders to suppliers
  bulkSendPurchaseOrders = asyncHandler(async (req, res) => {
    const { orderIds, emailTemplate } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.bulkSendPurchaseOrders(orderIds, userId, emailTemplate);

    res.status(200).json(formatResponse(result, `Bulk send operation completed: ${result.successes.length} successful, ${result.errors.length} failed`));
  });

  // Bulk cancel purchase orders
  bulkCancelPurchaseOrders = asyncHandler(async (req, res) => {
    const { orderIds, reason } = req.body;
    const userId = req.user.id;

    const result = await purchaseOrderService.bulkCancelPurchaseOrders(orderIds, userId, reason);

    res.status(200).json(formatResponse(result, `Bulk cancel operation completed: ${result.successes.length} successful, ${result.errors.length} failed`));
  });

  // Export purchase orders
  exportPurchaseOrders = asyncHandler(async (req, res) => {
    const filters = req.query;
    const { format = 'csv' } = req.query;

    const exportResult = await purchaseOrderService.exportPurchaseOrders(filters, format);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${exportResult.filename}`);
    
    res.status(200).json(formatResponse(exportResult, 'Purchase orders exported successfully'));
  });
}

module.exports = new PurchaseOrderController();