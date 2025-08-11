const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// You'll need to get a valid JWT token first
const AUTH_TOKEN = 'your-jwt-token-here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

async function testCategoriesAPI() {
  console.log('📂 Testing Categories API...\n');
  
  try {
    // Test GET all categories
    console.log('1. Getting all categories...');
    const categoriesResponse = await api.get('/categories');
    console.log(`✅ Found ${categoriesResponse.data.data.categories.length} categories`);
    
    // Test GET category tree
    console.log('2. Getting category tree...');
    const treeResponse = await api.get('/categories/tree');
    console.log(`✅ Category tree retrieved successfully`);
    
    // Test GET single category
    const firstCategory = categoriesResponse.data.data.categories[0];
    console.log(`3. Getting category ${firstCategory.id}...`);
    const singleResponse = await api.get(`/categories/${firstCategory.id}`);
    console.log(`✅ Retrieved category: ${singleResponse.data.data.name}`);
    
    // Test CREATE category
    console.log('4. Creating new category...');
    const newCategoryData = {
      name: 'Test Category',
      code: 'TEST001',
      description: 'Test category for API testing',
      sort_order: 999
    };
    const createResponse = await api.post('/categories', newCategoryData);
    console.log(`✅ Created category: ${createResponse.data.data.name}`);
    
    // Test UPDATE category
    console.log('5. Updating category...');
    const updateData = {
      name: 'Updated Test Category',
      description: 'Updated description'
    };
    const updateResponse = await api.put(`/categories/${createResponse.data.data.id}`, updateData);
    console.log(`✅ Updated category: ${updateResponse.data.data.name}`);
    
    // Test DELETE category
    console.log('6. Deleting test category...');
    await api.delete(`/categories/${createResponse.data.data.id}`);
    console.log(`✅ Deleted test category`);
    
  } catch (error) {
    console.error('❌ Categories API test failed:', error.response?.data || error.message);
  }
}

async function testSuppliersAPI() {
  console.log('\n🏢 Testing Suppliers API...\n');
  
  try {
    // Test GET all suppliers
    console.log('1. Getting all suppliers...');
    const suppliersResponse = await api.get('/suppliers');
    console.log(`✅ Found ${suppliersResponse.data.data.suppliers.length} suppliers`);
    
    // Test GET single supplier
    const firstSupplier = suppliersResponse.data.data.suppliers[0];
    console.log(`2. Getting supplier ${firstSupplier.id}...`);
    const singleResponse = await api.get(`/suppliers/${firstSupplier.id}`);
    console.log(`✅ Retrieved supplier: ${singleResponse.data.data.name}`);
    
    // Test CREATE supplier
    console.log('3. Creating new supplier...');
    const newSupplierData = {
      name: 'Test Supplier Inc.',
      code: 'TEST-SUP-001',
      contact_person: 'John Test',
      email: 'john@testsupplier.com',
      phone: '+1-555-9999',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      postal_code: '12345',
      country: 'USA',
      rating: 5,
      payment_terms: 30,
      notes: 'Test supplier for API testing'
    };
    const createResponse = await api.post('/suppliers', newSupplierData);
    console.log(`✅ Created supplier: ${createResponse.data.data.name}`);
    
    // Test UPDATE supplier
    console.log('4. Updating supplier...');
    const updateData = {
      name: 'Updated Test Supplier Inc.',
      notes: 'Updated notes for test supplier'
    };
    const updateResponse = await api.put(`/suppliers/${createResponse.data.data.id}`, updateData);
    console.log(`✅ Updated supplier: ${updateResponse.data.data.name}`);
    
    // Test DELETE supplier
    console.log('5. Deleting test supplier...');
    await api.delete(`/suppliers/${createResponse.data.data.id}`);
    console.log(`✅ Deleted test supplier`);
    
  } catch (error) {
    console.error('❌ Suppliers API test failed:', error.response?.data || error.message);
  }
}

async function testWarehousesAPI() {
  console.log('\n🏭 Testing Warehouses API...\n');
  
  try {
    // Test GET all warehouses
    console.log('1. Getting all warehouses...');
    const warehousesResponse = await api.get('/warehouses');
    console.log(`✅ Found ${warehousesResponse.data.data.warehouses.length} warehouses`);
    
    // Test GET single warehouse
    const firstWarehouse = warehousesResponse.data.data.warehouses[0];
    console.log(`2. Getting warehouse ${firstWarehouse.id}...`);
    const singleResponse = await api.get(`/warehouses/${firstWarehouse.id}`);
    console.log(`✅ Retrieved warehouse: ${singleResponse.data.data.name}`);
    
    // Test CREATE warehouse
    console.log('3. Creating new warehouse...');
    const newWarehouseData = {
      name: 'Test Warehouse',
      code: 'TEST-WH-001',
      address: '456 Storage Lane',
      city: 'Warehouse City',
      state: 'WC',
      postal_code: '67890',
      country: 'USA',
      phone: '+1-555-8888',
      email: 'test@warehouse.com'
    };
    const createResponse = await api.post('/warehouses', newWarehouseData);
    console.log(`✅ Created warehouse: ${createResponse.data.data.name}`);
    
    // Test UPDATE warehouse
    console.log('4. Updating warehouse...');
    const updateData = {
      name: 'Updated Test Warehouse',
      phone: '+1-555-7777'
    };
    const updateResponse = await api.put(`/warehouses/${createResponse.data.data.id}`, updateData);
    console.log(`✅ Updated warehouse: ${updateResponse.data.data.name}`);
    
    // Test DELETE warehouse
    console.log('5. Deleting test warehouse...');
    await api.delete(`/warehouses/${createResponse.data.data.id}`);
    console.log(`✅ Deleted test warehouse`);
    
  } catch (error) {
    console.error('❌ Warehouses API test failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Running API Tests...\n');
  
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  Please update AUTH_TOKEN with a valid JWT token');
    console.log('You can get one by logging into the app or using the auth endpoint');
    return;
  }
  
  await testCategoriesAPI();
  await testSuppliersAPI();
  await testWarehousesAPI();
  
  console.log('\n🎉 All API tests completed!');
}

// Test without authentication for now (if server allows)
async function testWithoutAuth() {
  console.log('🧪 Testing APIs without authentication (read-only)...\n');
  
  const noAuthApi = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Test GET requests only
    console.log('📂 Testing Categories (read-only)...');
    const categoriesResponse = await noAuthApi.get('/categories');
    console.log(`✅ Found ${categoriesResponse.data.data?.categories?.length || 0} categories`);
    
    console.log('🏢 Testing Suppliers (read-only)...');
    const suppliersResponse = await noAuthApi.get('/suppliers');
    console.log(`✅ Found ${suppliersResponse.data.data?.suppliers?.length || 0} suppliers`);
    
    console.log('🏭 Testing Warehouses (read-only)...');
    const warehousesResponse = await noAuthApi.get('/warehouses');
    console.log(`✅ Found ${warehousesResponse.data.data?.warehouses?.length || 0} warehouses`);
    
  } catch (error) {
    console.error('❌ Read-only API test failed:', error.message);
    console.log('This is expected if authentication is required');
  }
}

// Run tests
if (require.main === module) {
  // Try without auth first, then with auth
  testWithoutAuth().then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('To run full CRUD tests, update AUTH_TOKEN and run:');
    console.log('runAllTests()');
  }).catch(console.error);
}

module.exports = { testCategoriesAPI, testSuppliersAPI, testWarehousesAPI, runAllTests, testWithoutAuth };