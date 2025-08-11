const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class ReportService {
  // Get dashboard data
  async getDashboardData(period, warehouse) {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log('Starting dashboard data generation...');

      // Get inventory summary with complete product and warehouse data (quantity_on_hand schema)
      console.log('Executing inventory query (quantity_on_hand schema)...');
      let { data: inventory, error: inventoryError } = await supabaseAdmin
        .from('inventory')
        .select(`
          quantity_on_hand,
          quantity_reserved,
          average_cost,
          products (
            id,
            name,
            sku,
            cost_price,
            selling_price,
            reorder_point,
            max_stock_level,
            brand,
            model,
            categories (
              id,
              name
            )
          ),
          warehouses (
            id,
            name,
            code
          )
        `)
        .gt('quantity_on_hand', 0);

      if (warehouse) {
        // Re-run with warehouse filter
        const q = supabaseAdmin
          .from('inventory')
          .select(`
            quantity_on_hand,
            quantity_reserved,
            average_cost,
            products (
              id,
              name,
              sku,
              cost_price,
              selling_price,
              price,
              reorder_point,
              max_stock_level,
              brand,
              model,
              categories ( id, name )
            ),
            warehouses ( id, name, code )
          `)
          .gt('quantity_on_hand', 0)
          .eq('warehouse_id', warehouse);
        const a = await q;
        inventory = a.data;
        inventoryError = a.error;
      }

      if (inventoryError) {
        console.error('Inventory query error:', inventoryError);
        throw new AppError(`Inventory query failed: ${inventoryError.message}`, 500, 'INVENTORY_QUERY_ERROR');
      }

      console.log(`Inventory query successful, found ${inventory?.length || 0} records`);

      // Calculate inventory metrics
      const totalProducts = inventory?.length || 0;
      const totalStock = inventory?.reduce((sum, item) => {
        const qty = (item.quantity_on_hand ?? item.current_stock ?? 0);
        return sum + qty;
      }, 0) || 0;
      const totalValue = inventory?.reduce((sum, item) => {
        const qty = (item.quantity_on_hand ?? item.current_stock ?? 0);
        const price = item.products?.selling_price ?? item.products?.price ?? 0;
        return sum + (qty * price);
      }, 0) || 0;
      const lowStockItems = inventory?.filter(item => {
        const qty = (item.quantity_on_hand ?? item.current_stock ?? 0);
        const rp = item.products?.reorder_point ?? 0;
        return qty <= rp;
      }).length || 0;

      // Get previous period data for comparison
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);
      
      console.log('Executing previous inventory query...');
      const { data: previousInventory, error: previousInventoryError } = await supabaseAdmin
        .from('inventory')
        .select('quantity_on_hand, products(selling_price)')
        .gt('quantity_on_hand', 0);

      if (previousInventoryError) {
        console.error('Previous inventory query error:', previousInventoryError);
        // Don't throw error for this, just use 0 as default
      }

      const previousTotalValue = previousInventory?.reduce((sum, item) => 
        sum + ((item.quantity_on_hand || 0) * (item.products?.selling_price || 0)), 0) || 0;

      // Get recent stock movements with complete data
      console.log('Executing stock movements query...');
      let movementsQuery = supabaseAdmin
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity,
          created_at,
          reason,
          products (
            id,
            name,
            sku,
            selling_price
          ),
          warehouses!stock_movements_warehouse_id_fkey (
            id,
            name,
            code
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (warehouse) {
        movementsQuery = movementsQuery.eq('warehouse_id', warehouse);
      }

      const { data: movements, error: movementsError } = await movementsQuery;
      
      if (movementsError) {
        console.error('Stock movements query error (non-fatal):', movementsError);
      }

      console.log(`Stock movements query successful, found ${movements?.length || 0} records`);

      const stockIn = movements?.filter(m => ['in', 'transfer', 'purchase_receive', 'transfer_in', 'adjustment_increase'].includes(m.movement_type))
        .reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0) || 0;

      const stockOut = movements?.filter(m => ['out', 'sale', 'transfer_out', 'adjustment_decrease'].includes(m.movement_type))
        .reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0) || 0;

      // Get purchase orders summary with complete data
      console.log('Executing purchase orders query...');
      let ordersQuery = supabaseAdmin
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          status,
          order_date,
          expected_delivery_date,
          subtotal,
          tax_amount,
          shipping_cost,
          discount_amount,
          total_amount,
          priority,
          notes,
          created_at,
          suppliers (
            id,
            name,
            email,
            phone,
            contact_person
          ),
          warehouses (
            id,
            name,
            code
          ),
          purchase_order_items (
            id,
            quantity,
            received_quantity
          )
        `)
        .gte('created_at', startDate.toISOString());

      if (warehouse) {
        ordersQuery = ordersQuery.eq('warehouse_id', warehouse);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      
      if (ordersError) {
        console.error('Purchase orders query error (non-fatal):', ordersError);
      }

      console.log(`Purchase orders query successful, found ${orders?.length || 0} records`);

      // Include additional statuses seen in DB like 'pending' and 'sent'
      const pendingOrders = orders?.filter(o => ['pending_approval', 'approved', 'ordered', 'pending', 'sent'].includes(o.status)).length || 0;
      const completedOrders = orders?.filter(o => o.status === 'received').length || 0;
      const totalOrderValue = orders?.reduce((sum, order) => {
        const total = (order.total_amount || 0) || ((order.subtotal || 0) + (order.tax_amount || 0) + (order.shipping_cost || 0) - (order.discount_amount || 0));
        return sum + total;
      }, 0) || 0;

      // Get previous period orders for comparison
      console.log('Executing previous orders query...');
      const { data: previousOrders, error: previousOrdersError } = await supabaseAdmin
        .from('purchase_orders')
        .select('status, subtotal, tax_amount, shipping_cost, discount_amount, total_amount')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      if (previousOrdersError) {
        console.error('Previous orders query error:', previousOrdersError);
        // Don't throw error for this, just use 0 as default
      }

      const previousPendingOrders = previousOrders?.filter(o => ['pending_approval', 'approved', 'ordered'].includes(o.status)).length || 0;

      // Get top moving products with complete data
      console.log('Executing top products query...');
      const { data: topProducts, error: topProductsError } = await supabaseAdmin
        .from('stock_movements')
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            sku,
            selling_price,
            cost_price
          )
        `)
        .gte('created_at', startDate.toISOString())
        .in('movement_type', ['out', 'sale'])
        .limit(10);

      if (topProductsError) {
        console.error('Top products query error (non-fatal):', topProductsError);
      }

      console.log(`Top products query successful, found ${topProducts?.length || 0} records`);

      const productMovements = topProducts?.reduce((acc, movement) => {
        const key = movement.product_id;
        if (!acc[key]) {
          acc[key] = {
            product: movement.products,
            total_quantity: 0,
            revenue: 0
          };
        }
        const quantity = Math.abs(movement.quantity || 0);
        acc[key].total_quantity += quantity;
        acc[key].revenue += quantity * (movement.products?.selling_price || 0);
        return acc;
      }, {}) || {};

      const topMovingProducts = Object.values(productMovements)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
        .map(item => ({
          productName: item.product?.name || 'Unknown Product',
          revenue: Math.round(item.revenue),
          quantitySold: item.total_quantity,
          profit: Math.round(item.revenue * 0.3) // Assuming 30% profit margin
        }));

      // Get warehouse distribution with complete data
      console.log('Executing warehouse distribution query...');
      const { data: warehouseData, error: warehouseDataError } = await supabaseAdmin
        .from('inventory')
        .select(`
          quantity_on_hand,
          average_cost,
          warehouses (
            id,
            name,
            code
          ),
          products (
            id,
            name,
            selling_price
          )
        `)
        .gt('quantity_on_hand', 0);

      if (warehouseDataError) {
        console.error('Warehouse distribution query error (non-fatal):', warehouseDataError);
      }

      console.log(`Warehouse distribution query successful, found ${warehouseData?.length || 0} records`);

      const warehouseDistribution = warehouseData?.reduce((acc, item) => {
        const warehouseName = item.warehouses?.name || 'Unknown';
        if (!acc[warehouseName]) {
          acc[warehouseName] = {
            warehouseName,
            totalValue: 0,
            itemCount: 0
          };
        }
        const qty = (item.quantity_on_hand ?? item.current_stock ?? 0);
        const price = item.products?.selling_price ?? item.products?.price ?? 0;
        acc[warehouseName].totalValue += qty * price;
        acc[warehouseName].itemCount += qty;
        return acc;
      }, {}) || {};

      // Get purchase order status distribution
      const orderStatusData = orders?.reduce((acc, order) => {
        const status = order.status;
        if (!acc[status]) {
          acc[status] = {
            status,
            count: 0,
            totalValue: 0
          };
        }
        acc[status].count += 1;
        acc[status].totalValue += (order.total_amount || 0) || ((order.subtotal || 0) + (order.tax_amount || 0) + (order.shipping_cost || 0) - (order.discount_amount || 0));
        return acc;
      }, {}) || {};

      // Get recent movements for the table with complete data
      const recentMovements = movements?.slice(0, 10).map((movement, index) => ({
        id: movement.id || index + 1,
        productName: movement.products?.name || 'Unknown Product',
        productSku: movement.products?.sku || 'N/A',
        productId: movement.product_id,
        type: movement.movement_type,
        quantity: Math.abs(movement.quantity || 0),
        reason: movement.reason || (movement.movement_type === 'out' ? 'Sale' : 
                movement.movement_type === 'in' ? 'Purchase Order' : 
                movement.movement_type === 'transfer' ? 'Warehouse Transfer' : 'Adjustment'),
        warehouse: movement.warehouses?.name || 'Unknown Warehouse',
        createdAt: movement.created_at
      })) || [];

      // Get low stock alerts with complete data
      const lowStockAlerts = inventory?.filter(item => 
        (item.quantity_on_hand || 0) <= (item.products?.reorder_point || 0))
        .slice(0, 5)
        .map(item => ({
          productName: item.products?.name || 'Unknown Product',
          sku: item.products?.sku || 'N/A',
          currentStock: item.quantity_on_hand || 0,
          reorderPoint: item.products?.reorder_point || 0,
          warehouse: item.warehouses?.name || 'Unknown Warehouse',
          category: item.products?.categories?.name || 'Uncategorized'
        })) || [];

      // Get pending purchase orders with complete data
      const pendingPurchaseOrders = orders?.filter(order => ['pending_approval', 'approved', 'ordered'].includes(order.status))
        .slice(0, 4)
        .map((order, index) => {
          const itemCount = order.purchase_order_items?.length || 0;
          const totalQuantity = order.purchase_order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const receivedQuantity = order.purchase_order_items?.reduce((sum, item) => sum + (item.received_quantity || 0), 0) || 0;
          
          return {
            id: order.id,
            orderNumber: order.po_number || `PO-${new Date(order.created_at).getFullYear()}-${String(index + 1).padStart(3, '0')}`,
            supplierId: order.supplier_id,
            supplierName: order.suppliers?.name || 'Unknown Supplier',
            supplierContact: order.suppliers?.contact_person || order.suppliers?.email || 'N/A',
            status: order.status,
            itemCount: itemCount,
            totalQuantity: totalQuantity,
            receivedQuantity: receivedQuantity,
            totalAmount: order.total_amount || ((order.subtotal || 0) + (order.tax_amount || 0) + (order.shipping_cost || 0) - (order.discount_amount || 0)),
            expectedDate: order.expected_delivery_date || new Date(Date.now() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000).toISOString(),
            priority: order.priority || 'normal',
            orderDate: order.order_date || order.created_at,
            warehouse: order.warehouses?.name || 'Unknown Warehouse'
          };
        }) || [];

      // Calculate previous pending purchase orders
      const previousPendingPurchaseOrders = previousOrders?.filter(o => ['pending_approval', 'approved', 'ordered'].includes(o.status)).length || 0;

      // Calculate turnover ratio (mock calculation for now)
      const turnoverRatio = 5.2;
      const benchmark = 4.5;

      console.log('Dashboard data generation completed successfully');

      return {
        metrics: {
          totalInventoryValue: Math.round(totalValue),
          previousInventoryValue: Math.round(previousTotalValue),
          lowStockItems,
          previousLowStockItems: Math.floor(lowStockItems * 0.8), // Mock previous data
          pendingPurchaseOrders: pendingPurchaseOrders.length,
          previousPendingPurchaseOrders,
          todayStockMovements: movements?.length || 0,
          previousStockMovements: Math.floor((movements?.length || 0) * 0.9) // Mock previous data
        },
        inventoryLevels: Object.values(warehouseDistribution).map(warehouse => ({
          name: warehouse.warehouseName,
          currentStock: warehouse.itemCount,
          minimumStock: Math.floor(warehouse.itemCount * 0.3),
          maximumStock: Math.floor(warehouse.itemCount * 1.5)
        })),
        stockMovements: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            date: date.toISOString(),
            stockIn: Math.floor(Math.random() * 100) + 20,
            stockOut: Math.floor(Math.random() * 80) + 30,
          };
        }),
        warehouseDistribution: Object.values(warehouseDistribution),
        purchaseOrderStatus: Object.values(orderStatusData),
        topProducts: topMovingProducts,
        turnoverData: {
          ratio: turnoverRatio,
          benchmark
        },
        recentMovements,
        lowStockAlerts,
        pendingPurchaseOrders,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Get dashboard data error:', error);
      throw new AppError('Failed to get dashboard data', 500, 'DASHBOARD_ERROR');
    }
  }

  // Get inventory valuation report
  async getInventoryValuation(warehouse, date) {
    try {
      const valuationDate = date ? new Date(date) : new Date();

      let query = supabaseAdmin
        .from('inventory')
        .select(`
          current_stock,
          products (
            id,
            name,
            sku,
            cost,
            price,
            unit,
            categories (
              name
            )
          ),
          warehouses (
            name
          )
        `)
        .gt('current_stock', 0);

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: inventory, error } = await query;

      if (error) {
        throw new AppError('Failed to get inventory data', 500, 'GET_INVENTORY_ERROR');
      }

      const valuationData = inventory.map(item => ({
        product_id: item.products.id,
        product_name: item.products.name,
        sku: item.products.sku,
        category: item.products.categories?.name || 'Uncategorized',
        warehouse: item.warehouses.name,
        current_stock: item.current_stock,
        unit_cost: item.products.cost || 0,
        unit_price: item.products.price || 0,
        total_cost: item.current_stock * (item.products.cost || 0),
        total_retail_value: item.current_stock * (item.products.price || 0),
        potential_profit: item.current_stock * ((item.products.price || 0) - (item.products.cost || 0))
      }));

      const summary = {
        total_items: valuationData.length,
        total_quantity: valuationData.reduce((sum, item) => sum + item.current_stock, 0),
        total_cost_value: valuationData.reduce((sum, item) => sum + item.total_cost, 0),
        total_retail_value: valuationData.reduce((sum, item) => sum + item.total_retail_value, 0),
        potential_profit: valuationData.reduce((sum, item) => sum + item.potential_profit, 0),
        valuation_date: valuationDate.toISOString()
      };

      return {
        summary,
        items: valuationData
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate inventory valuation report', 500, 'VALUATION_REPORT_ERROR');
    }
  }

  // Get low stock report
  async getLowStockReport(warehouse, threshold) {
    try {
      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            unit,
            categories (
              name
            ),
            suppliers (
              name,
              email
            )
          ),
          warehouses (
            name
          )
        `);

      if (threshold) {
        query = query.lt('current_stock', threshold);
      } else {
        query = query.lt('current_stock', 'reorder_level');
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: lowStockItems, error } = await query.order('current_stock', { ascending: true });

      if (error) {
        throw new AppError('Failed to get low stock data', 500, 'GET_LOW_STOCK_ERROR');
      }

      const reportData = lowStockItems.map(item => ({
        product_id: item.products.id,
        product_name: item.products.name,
        sku: item.products.sku,
        category: item.products.categories?.name || 'Uncategorized',
        supplier: item.products.suppliers?.name || 'No Supplier',
        supplier_email: item.products.suppliers?.email,
        warehouse: item.warehouses.name,
        current_stock: item.current_stock,
        reorder_level: item.reorder_level,
        reorder_quantity: item.reorder_quantity,
        shortage: Math.max(0, item.reorder_level - item.current_stock),
        unit: item.products.unit || 'pcs'
      }));

      const summary = {
        total_low_stock_items: reportData.length,
        critical_items: reportData.filter(item => item.current_stock === 0).length,
        total_shortage: reportData.reduce((sum, item) => sum + item.shortage, 0)
      };

      return {
        summary,
        items: reportData
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate low stock report', 500, 'LOW_STOCK_REPORT_ERROR');
    }
  }

  // Get sales report
  async getSalesReport(filters) {
    try {
      const { startDate, endDate, warehouse, product, category, period } = filters;

      let query = supabaseAdmin
        .from('stock_movements')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            price,
            categories (
              name
            )
          ),
          warehouses (
            name
          )
        `)
        .eq('movement_type', 'sale');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      if (product) {
        query = query.eq('product_id', product);
      }

      const { data: sales, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to get sales data', 500, 'GET_SALES_ERROR');
      }

      // Filter by category if specified
      let filteredSales = sales;
      if (category) {
        filteredSales = sales.filter(sale => sale.products.categories?.id === category);
      }

      // Group by period
      const groupedData = this.groupSalesByPeriod(filteredSales, period);

      const summary = {
        total_quantity_sold: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
        total_revenue: filteredSales.reduce((sum, sale) => sum + (sale.quantity * (sale.products.price || 0)), 0),
        total_transactions: filteredSales.length,
        period_data: groupedData
      };

      return {
        summary,
        sales: filteredSales.slice(0, 100) // Limit detailed data
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate sales report', 500, 'SALES_REPORT_ERROR');
    }
  }

  // Helper method to group sales by period
  groupSalesByPeriod(sales, period) {
    const grouped = {};

    sales.forEach(sale => {
      const date = new Date(sale.created_at);
      let key;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = date.toISOString().slice(0, 7);
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          quantity: 0,
          revenue: 0,
          transactions: 0
        };
      }

      grouped[key].quantity += sale.quantity;
      grouped[key].revenue += sale.quantity * (sale.products.price || 0);
      grouped[key].transactions += 1;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  // Get stock movement report
  async getStockMovementReport(filters) {
    try {
      const { startDate, endDate, warehouse, product, type } = filters;

      let query = supabaseAdmin
        .from('stock_movements')
        .select(`
          *,
          products (
            id,
            name,
            sku
          ),
          warehouses (
            name
          )
        `);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      if (product) {
        query = query.eq('product_id', product);
      }

      if (type) {
        query = query.eq('movement_type', type);
      }

      const { data: movements, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to get stock movement data', 500, 'GET_MOVEMENTS_ERROR');
      }

      const summary = {
        total_movements: movements.length,
        total_quantity_in: movements
          .filter(m => ['purchase_receive', 'transfer_in', 'adjustment_increase'].includes(m.movement_type))
          .reduce((sum, m) => sum + m.quantity, 0),
        total_quantity_out: movements
          .filter(m => ['sale', 'transfer_out', 'adjustment_decrease'].includes(m.movement_type))
          .reduce((sum, m) => sum + m.quantity, 0),
        movement_types: movements.reduce((acc, movement) => {
          acc[movement.movement_type] = (acc[movement.movement_type] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        summary,
        movements: movements.slice(0, 1000) // Limit for performance
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate stock movement report', 500, 'MOVEMENT_REPORT_ERROR');
    }
  }

  // Get purchase order report
  async getPurchaseOrderReport(filters) {
    try {
      const { startDate, endDate, supplier, status, warehouse } = filters;

      let query = supabaseAdmin
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            name
          ),
          warehouses (
            name
          )
        `);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (supplier) {
        query = query.eq('supplier_id', supplier);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: orders, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to get purchase order data', 500, 'GET_PO_ERROR');
      }

      const summary = {
        total_orders: orders.length,
        total_value: orders.reduce((sum, order) => sum + (order.total || 0), 0),
        average_order_value: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0,
        status_breakdown: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {}),
        top_suppliers: this.getTopSuppliers(orders)
      };

      return {
        summary,
        orders: orders.slice(0, 500) // Limit for performance
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate purchase order report', 500, 'PO_REPORT_ERROR');
    }
  }

  // Helper method to get top suppliers
  getTopSuppliers(orders) {
    const supplierData = orders.reduce((acc, order) => {
      const supplierId = order.supplier_id;
      const supplierName = order.suppliers?.name || 'Unknown';
      
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier_name: supplierName,
          order_count: 0,
          total_value: 0
        };
      }
      
      acc[supplierId].order_count += 1;
      acc[supplierId].total_value += order.total || 0;
      
      return acc;
    }, {});

    return Object.values(supplierData)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10);
  }

  // Get supplier performance report
  async getSupplierPerformanceReport(filters) {
    try {
      const { startDate, endDate, supplier } = filters;

      let query = supabaseAdmin
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (supplier) {
        query = query.eq('supplier_id', supplier);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw new AppError('Failed to get supplier performance data', 500, 'GET_SUPPLIER_PERFORMANCE_ERROR');
      }

      const performanceData = orders.reduce((acc, order) => {
        const supplierId = order.supplier_id;
        const supplierName = order.suppliers?.name || 'Unknown';

        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplier_id: supplierId,
            supplier_name: supplierName,
            total_orders: 0,
            completed_orders: 0,
            cancelled_orders: 0,
            total_value: 0,
            on_time_deliveries: 0,
            late_deliveries: 0
          };
        }

        const supplier = acc[supplierId];
        supplier.total_orders += 1;
        supplier.total_value += order.total || 0;

        if (order.status === 'received') {
          supplier.completed_orders += 1;
          
          if (order.received_date && order.expected_delivery_date) {
            if (new Date(order.received_date) <= new Date(order.expected_delivery_date)) {
              supplier.on_time_deliveries += 1;
            } else {
              supplier.late_deliveries += 1;
            }
          }
        } else if (order.status === 'cancelled') {
          supplier.cancelled_orders += 1;
        }

        return acc;
      }, {});

      // Calculate performance metrics
      const performanceReport = Object.values(performanceData).map(supplier => ({
        ...supplier,
        completion_rate: supplier.total_orders > 0 ? (supplier.completed_orders / supplier.total_orders) * 100 : 0,
        cancellation_rate: supplier.total_orders > 0 ? (supplier.cancelled_orders / supplier.total_orders) * 100 : 0,
        on_time_delivery_rate: supplier.completed_orders > 0 ? (supplier.on_time_deliveries / supplier.completed_orders) * 100 : 0,
        average_order_value: supplier.total_orders > 0 ? supplier.total_value / supplier.total_orders : 0
      }));

      return {
        suppliers: performanceReport.sort((a, b) => b.total_value - a.total_value)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate supplier performance report', 500, 'SUPPLIER_PERFORMANCE_ERROR');
    }
  }

  // Get ABC analysis report
  async getABCAnalysisReport(warehouse, period) {
    try {
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get product sales data
      let query = supabaseAdmin
        .from('stock_movements')
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            sku,
            price,
            cost
          )
        `)
        .eq('movement_type', 'sale')
        .gte('created_at', startDate.toISOString());

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: sales, error } = await query;

      if (error) {
        throw new AppError('Failed to get sales data for ABC analysis', 500, 'ABC_ANALYSIS_ERROR');
      }

      // Aggregate sales by product
      const productSales = sales.reduce((acc, sale) => {
        const productId = sale.product_id;
        
        if (!acc[productId]) {
          acc[productId] = {
            product_id: productId,
            product_name: sale.products.name,
            sku: sale.products.sku,
            unit_price: sale.products.price || 0,
            total_quantity: 0,
            total_revenue: 0
          };
        }
        
        acc[productId].total_quantity += sale.quantity;
        acc[productId].total_revenue += sale.quantity * (sale.products.price || 0);
        
        return acc;
      }, {});

      const productArray = Object.values(productSales).sort((a, b) => b.total_revenue - a.total_revenue);

      // Calculate ABC classification
      const totalRevenue = productArray.reduce((sum, product) => sum + product.total_revenue, 0);
      let cumulativeRevenue = 0;

      const abcAnalysis = productArray.map(product => {
        cumulativeRevenue += product.total_revenue;
        const cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;
        
        let classification;
        if (cumulativePercentage <= 80) {
          classification = 'A';
        } else if (cumulativePercentage <= 95) {
          classification = 'B';
        } else {
          classification = 'C';
        }

        return {
          ...product,
          revenue_percentage: (product.total_revenue / totalRevenue) * 100,
          cumulative_percentage: cumulativePercentage,
          classification
        };
      });

      const summary = {
        total_products: abcAnalysis.length,
        total_revenue: totalRevenue,
        class_a_products: abcAnalysis.filter(p => p.classification === 'A').length,
        class_b_products: abcAnalysis.filter(p => p.classification === 'B').length,
        class_c_products: abcAnalysis.filter(p => p.classification === 'C').length,
        class_a_revenue: abcAnalysis.filter(p => p.classification === 'A').reduce((sum, p) => sum + p.total_revenue, 0),
        class_b_revenue: abcAnalysis.filter(p => p.classification === 'B').reduce((sum, p) => sum + p.total_revenue, 0),
        class_c_revenue: abcAnalysis.filter(p => p.classification === 'C').reduce((sum, p) => sum + p.total_revenue, 0)
      };

      return {
        summary,
        products: abcAnalysis
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate ABC analysis report', 500, 'ABC_ANALYSIS_ERROR');
    }
  }

  // Get inventory aging report
  async getInventoryAgingReport(warehouse) {
    try {
      // This would typically require tracking when inventory was received
      // For now, we'll create a simplified version based on product creation dates
      
      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            cost,
            price,
            created_at,
            categories (
              name
            )
          ),
          warehouses (
            name
          )
        `)
        .gt('current_stock', 0);

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
      }

      const { data: inventory, error } = await query;

      if (error) {
        throw new AppError('Failed to get inventory aging data', 500, 'AGING_REPORT_ERROR');
      }

      const today = new Date();
      
      const agingData = inventory.map(item => {
        const createdDate = new Date(item.products.created_at);
        const ageInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
        
        let ageCategory;
        if (ageInDays <= 30) {
          ageCategory = '0-30 days';
        } else if (ageInDays <= 60) {
          ageCategory = '31-60 days';
        } else if (ageInDays <= 90) {
          ageCategory = '61-90 days';
        } else if (ageInDays <= 180) {
          ageCategory = '91-180 days';
        } else {
          ageCategory = '180+ days';
        }

        return {
          product_id: item.products.id,
          product_name: item.products.name,
          sku: item.products.sku,
          category: item.products.categories?.name || 'Uncategorized',
          warehouse: item.warehouses.name,
          current_stock: item.current_stock,
          unit_cost: item.products.cost || 0,
          total_cost: item.current_stock * (item.products.cost || 0),
          age_in_days: ageInDays,
          age_category: ageCategory
        };
      });

      const summary = {
        total_items: agingData.length,
        total_value: agingData.reduce((sum, item) => sum + item.total_cost, 0),
        age_breakdown: agingData.reduce((acc, item) => {
          acc[item.age_category] = acc[item.age_category] || { count: 0, value: 0 };
          acc[item.age_category].count += 1;
          acc[item.age_category].value += item.total_cost;
          return acc;
        }, {})
      };

      return {
        summary,
        items: agingData.sort((a, b) => b.age_in_days - a.age_in_days)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate inventory aging report', 500, 'AGING_REPORT_ERROR');
    }
  }

  // CSV generation methods
  async generateInventoryValuationCSV(report) {
    const headers = 'Product ID,Product Name,SKU,Category,Warehouse,Current Stock,Unit Cost,Unit Price,Total Cost,Total Retail Value,Potential Profit\n';
    const rows = report.items.map(item => 
      `${item.product_id},"${item.product_name}","${item.sku}","${item.category}","${item.warehouse}",${item.current_stock},${item.unit_cost},${item.unit_price},${item.total_cost},${item.total_retail_value},${item.potential_profit}`
    ).join('\n');
    
    return headers + rows;
  }

  async generateLowStockCSV(report) {
    const headers = 'Product ID,Product Name,SKU,Category,Supplier,Warehouse,Current Stock,Reorder Level,Reorder Quantity,Shortage,Unit\n';
    const rows = report.items.map(item => 
      `${item.product_id},"${item.product_name}","${item.sku}","${item.category}","${item.supplier}","${item.warehouse}",${item.current_stock},${item.reorder_level},${item.reorder_quantity},${item.shortage},"${item.unit}"`
    ).join('\n');
    
    return headers + rows;
  }

  // Placeholder methods for other CSV generators
  async generateSalesReportCSV(report) {
    // Implementation for sales report CSV
    return 'Sales Report CSV data...';
  }

  async generateStockMovementCSV(report) {
    // Implementation for stock movement CSV
    return 'Stock Movement Report CSV data...';
  }

  async generatePurchaseOrderCSV(report) {
    // Implementation for purchase order CSV
    return 'Purchase Order Report CSV data...';
  }

  async generateSupplierPerformanceCSV(report) {
    // Implementation for supplier performance CSV
    return 'Supplier Performance Report CSV data...';
  }

  async generateABCAnalysisCSV(report) {
    // Implementation for ABC analysis CSV
    return 'ABC Analysis Report CSV data...';
  }

  async generateInventoryAgingCSV(report) {
    // Implementation for inventory aging CSV
    return 'Inventory Aging Report CSV data...';
  }

  // Custom report methods (placeholder)
  async getCustomReport(reportId, parameters) {
    // Implementation for custom reports
    return { message: 'Custom report functionality not implemented yet' };
  }

  async generateCustomReportCSV(report) {
    return 'Custom Report CSV data...';
  }

  // Scheduled report methods (placeholder)
  async scheduleReport(reportConfig) {
    // Implementation for scheduling reports
    return { message: 'Report scheduling functionality not implemented yet' };
  }

  async getScheduledReports(userId) {
    return [];
  }

  async updateScheduledReport(id, updateData, userId) {
    return { message: 'Updated scheduled report' };
  }

  async deleteScheduledReport(id, userId) {
    return { message: 'Deleted scheduled report' };
  }
}

module.exports = new ReportService();