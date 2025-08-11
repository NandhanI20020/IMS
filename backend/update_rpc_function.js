const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateRPCFunction() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'bypass_rls_functions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Updating RPC function...');
    console.log('SQL content:', sql);
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error updating RPC function:', error);
      return;
    }
    
    console.log('RPC function updated successfully:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

updateRPCFunction(); 