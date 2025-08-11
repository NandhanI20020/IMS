const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./backend/config/database');

async function runSetupSQL() {
  try {
    console.log('🚀 Running database setup...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup_categories_suppliers_warehouses.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { data, error } = await supabaseAdmin.rpc('execute_sql', {
            sql_query: statement + ';'
          });
          
          if (error && !error.message.includes('already exists')) {
            console.error(`Error in statement ${i + 1}:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Error in statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Database setup completed!\n');
    
    // Verify the data was inserted
    await verifyData();
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

async function verifyData() {
  console.log('🔍 Verifying data insertion...\n');
  
  try {
    // Check categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('*');
    
    if (catError) {
      console.error('Categories check failed:', catError);
    } else {
      console.log(`✅ Categories: ${categories.length} records`);
      const rootCategories = categories.filter(c => !c.parent_id);
      const childCategories = categories.filter(c => c.parent_id);
      console.log(`   - Root categories: ${rootCategories.length}`);
      console.log(`   - Child categories: ${childCategories.length}`);
    }
    
    // Check suppliers
    const { data: suppliers, error: supError } = await supabaseAdmin
      .from('suppliers')
      .select('*');
    
    if (supError) {
      console.error('Suppliers check failed:', supError);
    } else {
      console.log(`✅ Suppliers: ${suppliers.length} records`);
    }
    
    // Check warehouses
    const { data: warehouses, error: whError } = await supabaseAdmin
      .from('warehouses')
      .select('*');
    
    if (whError) {
      console.error('Warehouses check failed:', whError);
    } else {
      console.log(`✅ Warehouses: ${warehouses.length} records`);
    }
    
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

// Alternative method using raw SQL execution
async function runSetupAlternative() {
  try {
    console.log('🚀 Running database setup (alternative method)...\n');
    
    // Create categories
    const categoriesData = [
      { name: 'Electronics', code: 'ELEC', description: 'Electronic devices and accessories', sort_order: 1 },
      { name: 'Computers', code: 'COMP', description: 'Desktop computers, laptops, and accessories', sort_order: 2 },
      { name: 'Mobile Devices', code: 'MOB', description: 'Smartphones, tablets, and mobile accessories', sort_order: 3 },
      { name: 'Audio', code: 'AUD', description: 'Headphones, speakers, and audio equipment', sort_order: 4 },
      { name: 'Gaming', code: 'GAM', description: 'Gaming consoles, accessories, and games', sort_order: 5 },
      { name: 'Home & Garden', code: 'HOME', description: 'Home appliances and garden equipment', sort_order: 6 },
      { name: 'Kitchen Appliances', code: 'KITCH', description: 'Kitchen equipment and tools', sort_order: 7 },
      { name: 'Furniture', code: 'FURN', description: 'Office and home furniture', sort_order: 8 },
      { name: 'Office Supplies', code: 'OFF', description: 'Stationery, office equipment, and supplies', sort_order: 9 },
      { name: 'Sports & Outdoors', code: 'SPORT', description: 'Sports equipment and outdoor gear', sort_order: 10 }
    ];
    
    // Insert categories
    const { data: insertedCategories, error: catError } = await supabaseAdmin
      .from('categories')
      .upsert(categoriesData)
      .select();
    
    if (catError) {
      console.error('Categories insertion failed:', catError);
    } else {
      console.log(`✅ Inserted ${insertedCategories.length} categories`);
    }
    
    // Insert suppliers
    const suppliersData = [
      {
        name: 'TechCorp Solutions Inc.',
        code: 'TECH001',
        contact_person: 'John Smith',
        email: 'john.smith@techcorp.com',
        phone: '+1-555-0101',
        address: '123 Technology Blvd',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'USA',
        tax_id: 'TAX123456',
        credit_limit: 50000.00,
        rating: 5,
        payment_terms: 30,
        notes: 'Primary electronics supplier with excellent service'
      },
      {
        name: 'Global Electronics Ltd.',
        code: 'GLOB001',
        contact_person: 'Sarah Johnson',
        email: 'sarah.j@globalelec.com',
        phone: '+1-555-0102',
        address: '456 Innovation Drive',
        city: 'Austin',
        state: 'TX',
        postal_code: '73301',
        country: 'USA',
        tax_id: 'TAX789012',
        credit_limit: 75000.00,
        rating: 4,
        payment_terms: 45,
        notes: 'Specializes in mobile devices and accessories'
      }
    ];
    
    const { data: insertedSuppliers, error: supError } = await supabaseAdmin
      .from('suppliers')
      .upsert(suppliersData)
      .select();
    
    if (supError) {
      console.error('Suppliers insertion failed:', supError);
    } else {
      console.log(`✅ Inserted ${insertedSuppliers.length} suppliers`);
    }
    
    // Insert warehouses
    const warehousesData = [
      {
        name: 'Main Warehouse',
        code: 'WH001',
        address: '1000 Storage Drive',
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90001',
        country: 'USA',
        phone: '+1-555-1001',
        email: 'main@warehouse.com'
      },
      {
        name: 'West Coast Distribution',
        code: 'WH002',
        address: '2500 Pacific Highway',
        city: 'Seattle',
        state: 'WA',
        postal_code: '98001',
        country: 'USA',
        phone: '+1-555-1002',
        email: 'west@warehouse.com'
      }
    ];
    
    const { data: insertedWarehouses, error: whError } = await supabaseAdmin
      .from('warehouses')
      .upsert(warehousesData)
      .select();
    
    if (whError) {
      console.error('Warehouses insertion failed:', whError);
    } else {
      console.log(`✅ Inserted ${insertedWarehouses.length} warehouses`);
    }
    
    console.log('\n🎉 Alternative setup completed successfully!');
    
  } catch (error) {
    console.error('Alternative setup failed:', error);
  }
}

// Run the setup
if (require.main === module) {
  console.log('Choose setup method:');
  console.log('1. Alternative method (recommended)');
  console.log('2. SQL file method');
  
  // Run alternative method by default
  runSetupAlternative().catch(console.error);
}

module.exports = { runSetupSQL, runSetupAlternative, verifyData };