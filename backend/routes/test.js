const express = require('express');
const reportService = require('../services/reportService');
const productService = require('../services/productService');
const categoryService = require('../services/categoryService');
const supplierService = require('../services/supplierService');
const { supabaseAdmin } = require('../config/database');

const router = express.Router();

// Test endpoint for dashboard data (no auth required)
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30d', warehouse } = req.query;
    console.log('Test dashboard called with:', { period, warehouse });
    const dashboard = await reportService.getDashboardData(period, warehouse);
    res.json({ success: true, data: dashboard, message: 'Dashboard data retrieved successfully' });
  } catch (error) {
    console.error('Test dashboard error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for products (no auth required)
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, supplier, status, sort = 'created_at', order = 'desc' } = req.query;
    console.log('Test products called with:', { page, limit, search, category, supplier, status, sort, order });
    
    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      supplier,
      status,
      sort,
      order
    };
    
    const result = await productService.getProducts(filters);
    res.json({ success: true, data: result, message: 'Products retrieved successfully' });
  } catch (error) {
    console.error('Test products error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for single product (no auth required)
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Test get product called with id:', id);
    
    const product = await productService.getProductById(id);
    res.json({ success: true, data: product, message: 'Product retrieved successfully' });
  } catch (error) {
    console.error('Test get product error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for creating product (no auth required)
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    console.log('Test create product called with:', productData);
    
    const product = await productService.createProduct(productData, 'test-user-id');
    res.json({ success: true, data: product, message: 'Product created successfully' });
  } catch (error) {
    console.error('Test create product error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for updating product (no auth required)
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log('Test update product called with id:', id, 'data:', updateData);
    
    const product = await productService.updateProduct(id, updateData, 'test-user-id');
    res.json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Test update product error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for deleting product (no auth required)
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Test delete product called with id:', id);
    
    await productService.deleteProduct(id, 'test-user-id');
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Test delete product error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for categories (no auth required)
router.get('/categories', async (req, res) => {
  try {
    console.log('Test categories called');
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Categories query error:', error);
      throw new Error(`Categories query failed: ${error.message}`);
    }

    res.json({ success: true, data: categories, message: 'Categories retrieved successfully' });
  } catch (error) {
    console.error('Test categories error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for creating category (no auth required)
router.post('/categories', async (req, res) => {
  try {
    const categoryData = req.body;
    console.log('Test create category called with:', categoryData);
    
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      throw new Error(`Category creation failed: ${error.message}`);
    }

    res.json({ success: true, data: category, message: 'Category created successfully' });
  } catch (error) {
    console.error('Test create category error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for updating category (no auth required)
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log('Test update category called with id:', id, 'data:', updateData);
    
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Category update error:', error);
      throw new Error(`Category update failed: ${error.message}`);
    }

    res.json({ success: true, data: category, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Test update category error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for deleting category (no auth required)
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Test delete category called with id:', id);
    
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Category deletion error:', error);
      throw new Error(`Category deletion failed: ${error.message}`);
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Test delete category error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for suppliers (no auth required)
router.get('/suppliers', async (req, res) => {
  try {
    console.log('Test suppliers called');
    const { data: suppliers, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Suppliers query error:', error);
      throw new Error(`Suppliers query failed: ${error.message}`);
    }

    res.json({ success: true, data: suppliers, message: 'Suppliers retrieved successfully' });
  } catch (error) {
    console.error('Test suppliers error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for warehouses (no auth required)
router.get('/warehouses', async (req, res) => {
  try {
    console.log('Test warehouses called');
    const { data: warehouses, error } = await supabaseAdmin
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Warehouses query error:', error);
      throw new Error(`Warehouses query failed: ${error.message}`);
    }

    res.json({ success: true, data: warehouses, message: 'Warehouses retrieved successfully' });
  } catch (error) {
    console.error('Test warehouses error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for purchase orders (no auth required)
router.get('/purchase-orders', async (req, res) => {
  try {
    console.log('Test purchase orders called with query:', req.query);
    const { page = 1, limit = 10, search, status, supplier, warehouse, sort = 'created_at', order = 'desc' } = req.query;
    
    // First, let's check if the purchase_orders table exists and is accessible
    console.log('Checking if purchase_orders table exists...');
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Table check error:', tableError);
      throw new Error(`Table check failed: ${tableError.message}`);
    }

    console.log('Table check successful, table exists and is accessible');
    
    // First, let's check if there are any purchase orders at all
    console.log('Checking for purchase orders in database...');
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count query error:', countError);
      throw new Error(`Count query failed: ${countError.message}`);
    }

    console.log('Total purchase orders in database:', totalCount || 0);
    
    // If no orders found, return empty result
    if (!totalCount || totalCount === 0) {
      console.log('No purchase orders found in database');
      return res.json({ 
        success: true, 
        data: {
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        }, 
        message: 'No purchase orders found' 
      });
    }
    
    console.log('Building query for purchase orders...');
    let query = supabaseAdmin
      .from('purchase_orders')
      .select('*');

    // Apply filters
    if (search) {
      console.log('Applying search filter:', search);
      // Search in order_number, po_number, and reference fields
      query = query.or(`order_number.ilike.%${search}%,po_number.ilike.%${search}%,reference.ilike.%${search}%`);
    }

    if (status) {
      console.log('Applying status filter:', status);
      query = query.eq('status', status);
    }

    if (supplier) {
      console.log('Applying supplier filter:', supplier);
      query = query.eq('supplier_id', supplier);
    }

    if (warehouse) {
      console.log('Applying warehouse filter:', warehouse);
      query = query.eq('warehouse_id', warehouse);
    }

    // Apply sorting
    console.log('Applying sorting:', sort, order);
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    console.log('Applying pagination - offset:', offset, 'limit:', limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    console.log('Executing purchase orders query...');
    const { data: orders, error } = await query;

    if (error) {
      console.error('Purchase orders query error:', error);
      throw new Error(`Purchase orders query failed: ${error.message}`);
    }

    console.log('Purchase orders query result:', { orders: orders?.length, totalCount, error });
    
    // Log a sample order to see the structure
    if (orders && orders.length > 0) {
      console.log('Sample order structure:', JSON.stringify(orders[0], null, 2));
    }

    // If we have orders, try to get supplier and warehouse names
    let ordersWithDetails = orders || [];
    if (orders && orders.length > 0) {
      try {
        console.log('Fetching supplier and warehouse details...');
        // Get unique supplier IDs
        const supplierIds = [...new Set(orders.map(order => order.supplier_id).filter(Boolean))];
        const warehouseIds = [...new Set(orders.map(order => order.warehouse_id).filter(Boolean))];

        console.log('Supplier IDs found:', supplierIds);
        console.log('Warehouse IDs found:', warehouseIds);

        // Fetch suppliers
        let suppliers = [];
        if (supplierIds.length > 0) {
          const { data: suppliersData, error: suppliersError } = await supabaseAdmin
            .from('suppliers')
            .select('id, name, email')
            .in('id', supplierIds);
          
          if (!suppliersError && suppliersData) {
            suppliers = suppliersData;
            console.log('Suppliers fetched:', suppliers.length);
          } else {
            console.warn('Failed to fetch suppliers:', suppliersError);
          }
        }

        // Fetch warehouses
        let warehouses = [];
        if (warehouseIds.length > 0) {
          const { data: warehousesData, error: warehousesError } = await supabaseAdmin
            .from('warehouses')
            .select('id, name')
            .in('id', warehouseIds);
          
          if (!warehousesError && warehousesData) {
            warehouses = warehousesData;
            console.log('Warehouses fetched:', warehouses.length);
          } else {
            console.warn('Failed to fetch warehouses:', warehousesError);
          }
        }

        // Merge the data
        ordersWithDetails = orders.map(order => ({
          ...order,
          suppliers: suppliers.find(s => s.id === order.supplier_id) || null,
          warehouses: warehouses.find(w => w.id === order.warehouse_id) || null
        }));
        
        console.log('Orders with details prepared:', ordersWithDetails.length);
      } catch (joinError) {
        console.warn('Failed to fetch supplier/warehouse details:', joinError);
        // Continue with orders without details
        ordersWithDetails = orders;
      }
    }

    console.log('Final response structure:', {
      success: true,
      data: {
        data: ordersWithDetails?.length || 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
        }
      }
    });

    res.json({ 
      success: true, 
      data: {
        data: ordersWithDetails || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
        }
      }, 
      message: 'Purchase orders retrieved successfully' 
    });
  } catch (error) {
    console.error('Test purchase orders error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for creating supplier (no auth required)
router.post('/suppliers', async (req, res) => {
  try {
    const supplierData = req.body;
    console.log('Test create supplier called with:', supplierData);
    
    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .insert([supplierData])
      .select()
      .single();

    if (error) {
      console.error('Supplier creation error:', error);
      throw new Error(`Supplier creation failed: ${error.message}`);
    }

    res.json({ success: true, data: supplier, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Test create supplier error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for updating supplier (no auth required)
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log('Test update supplier called with id:', id, 'data:', updateData);
    
    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supplier update error:', error);
      throw new Error(`Supplier update failed: ${error.message}`);
    }

    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Test update supplier error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for deleting supplier (no auth required)
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Test delete supplier called with id:', id);
    
    const { error } = await supabaseAdmin
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supplier deletion error:', error);
      throw new Error(`Supplier deletion failed: ${error.message}`);
    }

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Test delete supplier error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Test endpoint for database tables (no auth required)
router.get('/db-test', async (req, res) => {
  try {
    console.log('Test database tables called');
    
    // Test categories table
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('count')
      .limit(1);
    
    // Test suppliers table
    const { data: suppliers, error: suppliersError } = await supabaseAdmin
      .from('suppliers')
      .select('count')
      .limit(1);
    
    // Test products table
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('count')
      .limit(1);
    
    const result = {
      categories: {
        hasData: categories && categories.length > 0,
        error: categoriesError?.message
      },
      suppliers: {
        hasData: suppliers && suppliers.length > 0,
        error: suppliersError?.message
      },
      products: {
        hasData: products && products.length > 0,
        error: productsError?.message
      }
    };
    
    res.json({ success: true, data: result, message: 'Database test completed' });
  } catch (error) {
    console.error('Test database error:', error);
    res.status(500).json({ success: false, error: 'Test failed', message: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'Test endpoints are working' });
});

module.exports = router; 