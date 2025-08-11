const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Initialize Supabase client with service key for server-side operations
console.log('Supabase URL:', config.supabase.url);
console.log('Service Key length:', config.supabase.serviceKey ? config.supabase.serviceKey.length : 'undefined');

const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-admin-js'
      }
    }
  }
);

// Initialize Supabase client with anon key for client-side operations
const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

class DatabaseService {
  constructor() {
    this.admin = supabaseAdmin;
    this.client = supabaseClient;
  }

  // Get client with user session for RLS
  getClientForUser(accessToken) {
    return createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );
  }

  // Execute query with RLS using user's access token
  async executeWithRLS(accessToken, operation) {
    try {
      const userClient = this.getClientForUser(accessToken);
      return await operation(userClient);
    } catch (error) {
      console.error('Database operation with RLS failed:', error);
      throw error;
    }
  }

  // Execute admin query (bypasses RLS)
  async executeAsAdmin(operation) {
    try {
      return await operation(this.admin);
    } catch (error) {
      console.error('Admin database operation failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await this.admin
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Transaction wrapper
  async transaction(operations) {
    // Note: Supabase doesn't support explicit transactions in the JavaScript client
    // This is a placeholder for future implementation or can use Supabase Edge Functions
    try {
      const results = [];
      for (const operation of operations) {
        const result = await operation(this.admin);
        results.push(result);
      }
      return results;
    } catch (error) {
      // In a real transaction, we would rollback here
      console.error('Transaction failed:', error);
      throw error;
    }
  }
}

const dbService = new DatabaseService();

module.exports = {
  supabaseAdmin,
  supabaseClient,
  dbService
};