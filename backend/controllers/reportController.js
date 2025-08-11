const reportService = require('../services/reportService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class ReportController {
  // Get dashboard overview
  getDashboard = asyncHandler(async (req, res) => {
    const { period = '30d', warehouse } = req.query;

    // Check if user is authenticated, but don't require it
    const isAuthenticated = req.user && req.user.id;
    
    if (!isAuthenticated) {
      console.log('Dashboard accessed without authentication - using public access');
    }

    const dashboard = await reportService.getDashboardData(period, warehouse);

    res.status(200).json(formatResponse(dashboard, 'Dashboard data retrieved successfully'));
  });

  // Get inventory valuation report
  getInventoryValuation = asyncHandler(async (req, res) => {
    const { warehouse, date, format = 'json' } = req.query;

    const report = await reportService.getInventoryValuation(warehouse, date);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-valuation.csv');
      const csvData = await reportService.generateInventoryValuationCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Inventory valuation report retrieved successfully'));
  });

  // Get low stock report
  getLowStockReport = asyncHandler(async (req, res) => {
    const { warehouse, threshold, format = 'json' } = req.query;

    const report = await reportService.getLowStockReport(warehouse, threshold);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=low-stock-report.csv');
      const csvData = await reportService.generateLowStockCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Low stock report retrieved successfully'));
  });

  // Get sales report
  getSalesReport = asyncHandler(async (req, res) => {
    const {
      startDate,
      endDate,
      warehouse,
      product,
      category,
      period = 'daily',
      format = 'json'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      warehouse,
      product,
      category,
      period
    };

    const report = await reportService.getSalesReport(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      const csvData = await reportService.generateSalesReportCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Sales report retrieved successfully'));
  });

  // Get stock movement report
  getStockMovementReport = asyncHandler(async (req, res) => {
    const {
      startDate,
      endDate,
      warehouse,
      product,
      type,
      format = 'json'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      warehouse,
      product,
      type
    };

    const report = await reportService.getStockMovementReport(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-movement-report.csv');
      const csvData = await reportService.generateStockMovementCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Stock movement report retrieved successfully'));
  });

  // Get purchase order report
  getPurchaseOrderReport = asyncHandler(async (req, res) => {
    const {
      startDate,
      endDate,
      supplier,
      status,
      warehouse,
      format = 'json'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      supplier,
      status,
      warehouse
    };

    const report = await reportService.getPurchaseOrderReport(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=purchase-order-report.csv');
      const csvData = await reportService.generatePurchaseOrderCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Purchase order report retrieved successfully'));
  });

  // Get supplier performance report
  getSupplierPerformanceReport = asyncHandler(async (req, res) => {
    const {
      startDate,
      endDate,
      supplier,
      metrics = 'all',
      format = 'json'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      supplier,
      metrics
    };

    const report = await reportService.getSupplierPerformanceReport(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier-performance-report.csv');
      const csvData = await reportService.generateSupplierPerformanceCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Supplier performance report retrieved successfully'));
  });

  // Get ABC analysis report
  getABCAnalysisReport = asyncHandler(async (req, res) => {
    const { warehouse, period = '90d', format = 'json' } = req.query;

    const report = await reportService.getABCAnalysisReport(warehouse, period);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=abc-analysis-report.csv');
      const csvData = await reportService.generateABCAnalysisCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'ABC analysis report retrieved successfully'));
  });

  // Get inventory aging report
  getInventoryAgingReport = asyncHandler(async (req, res) => {
    const { warehouse, format = 'json' } = req.query;

    const report = await reportService.getInventoryAgingReport(warehouse);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-aging-report.csv');
      const csvData = await reportService.generateInventoryAgingCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Inventory aging report retrieved successfully'));
  });

  // Get custom report
  getCustomReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { parameters, format = 'json' } = req.query;

    const report = await reportService.getCustomReport(reportId, parameters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=custom-report-${reportId}.csv`);
      const csvData = await reportService.generateCustomReportCSV(report);
      return res.status(200).send(csvData);
    }

    res.status(200).json(formatResponse(report, 'Custom report retrieved successfully'));
  });

  // Schedule report
  scheduleReport = asyncHandler(async (req, res) => {
    const { reportType, schedule, parameters, recipients } = req.body;
    const userId = req.user.id;

    const scheduledReport = await reportService.scheduleReport({
      reportType,
      schedule,
      parameters,
      recipients,
      userId
    });

    res.status(201).json(formatResponse(scheduledReport, 'Report scheduled successfully'));
  });

  // Get scheduled reports
  getScheduledReports = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const reports = await reportService.getScheduledReports(userId);

    res.status(200).json(formatResponse(reports, 'Scheduled reports retrieved successfully'));
  });

  // Update scheduled report
  updateScheduledReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const report = await reportService.updateScheduledReport(id, updateData, userId);

    res.status(200).json(formatResponse(report, 'Scheduled report updated successfully'));
  });

  // Delete scheduled report
  deleteScheduledReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await reportService.deleteScheduledReport(id, userId);

    res.status(200).json(formatResponse(null, 'Scheduled report deleted successfully'));
  });
}

module.exports = new ReportController();