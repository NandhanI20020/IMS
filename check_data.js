const { supabaseAdmin } = require('./backend/config/database');

async function checkExistingData() {
  try {
    console.log('🔍 Checking existing data...\n');
    
    // Check categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name, code, parent_id, sort_order')
      .order('sort_order');
    
    if (catError) {
      console.error('Categories check failed:', catError);
    } else {
      console.log(`📂 Categories (${categories.length} records):`);
      categories.forEach(cat => {
        const prefix = cat.parent_id ? '  └─ ' : '';
        console.log(`${prefix}${cat.id}. ${cat.name} (${cat.code})`);
      });
    }
    
    // Check suppliers
    const { data: suppliers, error: supError } = await supabaseAdmin
      .from('suppliers')
      .select('id, name, code, city, state, rating')
      .order('name');
    
    if (supError) {
      console.error('Suppliers check failed:', supError);
    } else {
      console.log(`\n🏢 Suppliers (${suppliers.length} records):`);
      suppliers.forEach(sup => {
        console.log(`${sup.id}. ${sup.name} (${sup.code}) - ${sup.city}, ${sup.state} - Rating: ${sup.rating || 'N/A'}`);
      });
    }
    
    // Check warehouses
    const { data: warehouses, error: whError } = await supabaseAdmin
      .from('warehouses')
      .select('id, name, code, city, state')
      .order('name');
    
    if (whError) {
      console.error('Warehouses check failed:', whError);
    } else {
      console.log(`\n🏭 Warehouses (${warehouses.length} records):`);
      warehouses.forEach(wh => {
        console.log(`${wh.id}. ${wh.name} (${wh.code}) - ${wh.city}, ${wh.state}`);
      });
    }
    
    // Check products with relationships
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select(`
        id, name, sku,
        categories (
          name
        ),
        suppliers (
          name
        )
      `)
      .limit(5);
    
    if (prodError) {
      console.error('Products check failed:', prodError);
    } else {
      console.log(`\n📦 Sample Products with Relationships (${products.length} shown):`);
      products.forEach(prod => {
        console.log(`${prod.name} (${prod.sku})`);
        console.log(`  Category: ${prod.categories?.name || 'None'}`);
        console.log(`  Supplier: ${prod.suppliers?.name || 'None'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

// Run check
if (require.main === module) {
  checkExistingData().catch(console.error);
}

module.exports = { checkExistingData };