const { supabaseAdmin } = require('./config/database');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Test inventory query
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select(`
        quantity_on_hand,
        products (
          name,
          sku,
          selling_price
        ),
        warehouses (
          name
        )
      `)
      .gt('quantity_on_hand', 0)
      .limit(5);
    
    if (inventoryError) {
      console.error('Inventory query failed:', inventoryError);
      return false;
    }
    
    console.log('✅ Inventory query successful');
    console.log('Sample inventory data:', inventory);
    
    // Test stock movements query
    const { data: movements, error: movementsError } = await supabaseAdmin
      .from('stock_movements')
      .select(`
        movement_type,
        quantity,
        created_at,
        products (
          name,
          sku
        )
      `)
      .limit(5);
    
    if (movementsError) {
      console.error('Stock movements query failed:', movementsError);
      return false;
    }
    
    console.log('✅ Stock movements query successful');
    console.log('Sample movements data:', movements);
    
    // Test purchase orders query
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        status,
        subtotal,
        tax_amount,
        shipping_cost,
        discount_amount,
        suppliers (
          name
        )
      `)
      .limit(5);
    
    if (ordersError) {
      console.error('Purchase orders query failed:', ordersError);
      return false;
    }
    
    console.log('✅ Purchase orders query successful');
    console.log('Sample orders data:', orders);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

async function testDashboardData() {
  try {
    console.log('\nTesting dashboard data generation...');
    
    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get inventory summary
    const { data: inventory } = await supabaseAdmin
      .from('inventory')
      .select(`
        quantity_on_hand,
        products (
          name,
          sku,
          selling_price,
          reorder_point
        ),
        warehouses (
          name
        )
      `)
      .gt('quantity_on_hand', 0);
    
    if (!inventory || inventory.length === 0) {
      console.log('⚠️  No inventory data found');
      return false;
    }
    
    console.log(`✅ Found ${inventory.length} inventory records`);
    
    // Calculate metrics
    const totalProducts = inventory.length;
    const totalStock = inventory.reduce((sum, item) => sum + item.quantity_on_hand, 0);
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.quantity_on_hand * (item.products?.selling_price || 0)), 0);
    const lowStockItems = inventory.filter(item => 
      item.quantity_on_hand <= (item.products?.reorder_point || 0)).length;
    
    console.log('📊 Dashboard Metrics:');
    console.log(`  - Total Products: ${totalProducts}`);
    console.log(`  - Total Stock: ${totalStock}`);
    console.log(`  - Total Value: $${totalValue.toFixed(2)}`);
    console.log(`  - Low Stock Items: ${lowStockItems}`);
    
    return true;
  } catch (error) {
    console.error('Dashboard data test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Running API tests...\n');
  
  const dbTest = await testDatabaseConnection();
  const dashboardTest = await testDashboardData();
  
  console.log('\n📋 Test Results:');
  console.log(`  Database Connection: ${dbTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Dashboard Data: ${dashboardTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (dbTest && dashboardTest) {
    console.log('\n🎉 All tests passed! The API should be working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testDatabaseConnection, testDashboardData, runTests }; 