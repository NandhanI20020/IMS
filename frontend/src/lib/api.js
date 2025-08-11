import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  constructor() {
    this.baseURL = API_URL || 'http://localhost:3001/api/v1';
    console.log('API Client initialized with baseURL:', this.baseURL);
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // Minimum 100ms between requests
  }

  async getAuthHeaders() {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Get token from localStorage (backend JWT token)
      const accessToken = localStorage.getItem('accessToken');
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      return headers;
    } catch (error) {
      console.warn('Could not get auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  async request(endpoint, options = {}) {
    // Throttle requests to prevent rate limiting
    await this.throttleRequest();
    
    const url = `${this.baseURL}${endpoint}`;
    console.log('Making API request to:', url);
    const headers = await this.getAuthHeaders();

    const config = {
      headers,
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.warn(`Rate limited. Retrying after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Retry the request once after delay
          return this.request(endpoint, options);
        }
        
        // Don't throw error for 401 if we're not authenticated
        if (response.status === 401 && !headers.Authorization) {
          throw new Error('Authentication required');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('API response data:', data);
        return data;
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
      ...options,
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
      ...options,
    });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Inventory API methods
  async getInventory(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/inventory?${searchParams}`);
  }

  async updateStock(data) {
    return this.put('/inventory/realtime/update-stock', data);
  }

  async transferStock(data) {
    return this.post('/inventory/realtime/transfer', data);
  }

  async getProducts(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/products?${searchParams}`);
  }

  async getPurchaseOrders(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Add query parameters
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.supplier) searchParams.append('supplier', params.supplier);
    if (params.warehouse) searchParams.append('warehouse', params.warehouse);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);

    console.log('Fetching purchase orders with params:', params);
    const response = await this.get(`/test/purchase-orders?${searchParams}`);
    console.log('Purchase orders response:', response);
    
    // Normalize wrapper shape { success, data: { data: [], pagination } }
    const payload = response.data || {};
    const listWrapper = payload.data || {};
    const ordersData = Array.isArray(listWrapper.data)
      ? listWrapper.data
      : Array.isArray(payload.data)
      ? payload.data
      : [];
    
    const transformedOrders = ordersData.map(order => ({
      id: order.id,
      orderNumber: order.po_number || order.order_number,
      supplierId: order.supplier_id,
      supplierName: order.suppliers?.name || 'Unknown Supplier',
      supplierEmail: order.suppliers?.email || '',
      supplierPhone: order.suppliers?.phone || '',
      supplierContact: order.suppliers?.contact_person || '',
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouses?.name || 'Unknown Warehouse',
      warehouseCode: order.warehouses?.code || '',
      status: order.status,
      orderDate: order.order_date || order.created_at,
      expectedDeliveryDate: order.expected_delivery_date,
      actualDeliveryDate: order.actual_delivery_date,
      subtotal: order.subtotal || 0,
      taxRate: order.tax_rate || 0,
      taxAmount: order.tax_amount || 0,
      shippingCost: order.shipping_cost || 0,
      discountAmount: order.discount_amount || 0,
      totalAmount: order.totalAmount || order.total_amount || 0,
      currency: order.currency || 'USD',
      notes: order.notes || '',
      termsConditions: order.terms_conditions || '',
      priority: order.priority || 'normal',
      itemCount: order.itemCount || 0,
      totalQuantity: order.totalQuantity || 0,
      receivedQuantity: order.receivedQuantity || 0,
      remainingQuantity: order.remainingQuantity || 0,
      completionPercentage: order.completionPercentage || 0,
      created_at: order.created_at, // keep original for UI formatting
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      createdBy: order.created_by,
      approvedBy: order.approved_by,
      approvedAt: order.approved_at,
      suppliers: order.suppliers || null,
      warehouses: order.warehouses || null,
      items: order.purchase_order_items || []
    }));

    const result = {
      data: transformedOrders,
      pagination: listWrapper.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
      }
    };
    
    console.log('Transformed purchase orders result:', result);
    return result;
  }

  async getPurchaseOrder(id) {
    return this.get(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(data) {
    return this.post('/purchase-orders', data);
  }

  async updatePurchaseOrder(id, data) {
    return this.put(`/purchase-orders/${id}`, data);
  }

  async deletePurchaseOrder(id) {
    return this.delete(`/purchase-orders/${id}`);
  }

  async sendPurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/send`, data);
  }

  async confirmPurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/confirm`, data);
  }

  async completePurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/complete`, data);
  }

  async cancelPurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/cancel`, data);
  }

  async receivePurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/receive`, data);
  }

  async partiallyReceivePurchaseOrder(id, data) {
    return this.post(`/purchase-orders/${id}/partial-receive`, data);
  }

  async duplicatePurchaseOrder(id) {
    return this.post(`/purchase-orders/${id}/duplicate`);
  }

  async getPurchaseOrderStatusHistory(id) {
    return this.get(`/purchase-orders/${id}/status-history`);
  }

  async bulkUpdatePurchaseOrders(data) {
    return this.post('/purchase-orders/bulk-update', data);
  }

  async bulkSendPurchaseOrders(data) {
    return this.post('/purchase-orders/bulk-send', data);
  }

  async bulkCancelPurchaseOrders(data) {
    return this.post('/purchase-orders/bulk-cancel', data);
  }

  async exportPurchaseOrders(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/purchase-orders/export?${searchParams}`);
  }

  async getDashboard(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/reports/dashboard?${searchParams}`);
  }

  async getLowStockAlerts(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.get(`/inventory/realtime/alerts?${searchParams}`);
  }
}

// Product API
export const productApi = {
  getProducts: async (params = {}) => {
    try {
      const searchParams = new URLSearchParams();
      
      // Add query parameters
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.search) searchParams.append('search', params.search);
      if (params.filters?.category) searchParams.append('category', params.filters.category);
      if (params.filters?.supplier) searchParams.append('supplier', params.filters.supplier);
      if (params.filters?.status) searchParams.append('status', params.filters.status);
      if (params.filters?.warehouse) searchParams.append('warehouse', params.filters.warehouse);
      if (params.sort?.field) searchParams.append('sort', params.sort.field);
      if (params.sort?.order) searchParams.append('order', params.sort.order);

      const response = await apiClient.get(`/test/products?${searchParams}`);
      
      // Normalize backend response shape
      const payload = response.data || {};
      const listWrapper = payload.data || {};
      const sourceProducts = Array.isArray(listWrapper.data) ? listWrapper.data : Array.isArray(payload.data) ? payload.data : [];

      // Transform the response to match the expected format expected by the grid
      const transformedProducts = sourceProducts.map(product => {
        // Calculate total stock across all warehouses
        const totalStock = product.totalStock || product.inventory?.reduce((sum, inv) => sum + (inv.quantity_on_hand || 0), 0) || 0;
        const totalReserved = product.totalReserved || product.inventory?.reduce((sum, inv) => sum + (inv.quantity_reserved || 0), 0) || 0;
        const availableStock = product.availableStock || (totalStock - totalReserved);
        
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          // Transform price fields
          price: product.selling_price || 0,
          costPrice: product.cost_price || product.averageCost || 0,
          // Transform stock fields
          currentStock: availableStock,
          totalStock: totalStock,
          reservedStock: totalReserved,
          minimumStock: product.reorder_point || 0,
          maxStockLevel: product.max_stock_level || 0,
          // Transform category and supplier (support aliased relations)
          category: product.categories?.name || product.category?.name || 'Uncategorized',
          categoryId: product.category_id || product.categories?.id || product.category?.id,
          // Keep supplier as object so UI can access supplier.name
          supplier: product.suppliers || product.supplier || null,
          supplierId: product.supplier_id || product.suppliers?.id || product.supplier?.id,
          // Transform status
          status: product.is_active ? 'active' : 'inactive',
          stockStatus: product.stockStatus || (availableStock <= (product.reorder_point || 0) ? 'low_stock' : 
                      availableStock === 0 ? 'out_of_stock' : 'in_stock'),
          // Additional fields
          brand: product.brand,
          model: product.model,
          barcode: product.barcode,
          weight: product.weight,
          dimensions: product.dimensions,
          currency: product.currency || 'USD',
          tags: product.tags || [],
          imageUrl: product.image_urls?.[0] || null,
          // Inventory details for each warehouse
          inventory: product.inventory || [],
          // Unit from metadata
          unit: product.metadata?.unit || 'pcs',
          // Calculated fields
          stockValue: product.stockValue || (availableStock * (product.selling_price || 0)),
          costValue: product.costValue || (availableStock * (product.cost_price || 0)),
          // Metadata
          createdAt: product.created_at,
          updatedAt: product.updated_at
        };
      });
      
      return {
        products: transformedProducts,
        total: listWrapper.pagination?.total || 0,
        page: listWrapper.pagination?.page || 1,
        totalPages: listWrapper.pagination?.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  getProduct: async (id) => {
    try {
      const response = await apiClient.get(`/test/products/${id}`);
      const product = response.data;
      
      // Transform single product data
      const totalStock = product.inventory?.reduce((sum, inv) => sum + (inv.quantity_on_hand || 0), 0) || 0;
      const totalReserved = product.inventory?.reduce((sum, inv) => sum + (inv.quantity_reserved || 0), 0) || 0;
      const availableStock = totalStock - totalReserved;
      
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.selling_price || 0,
        costPrice: product.cost_price || 0,
        currentStock: availableStock,
        totalStock: totalStock,
        reservedStock: totalReserved,
        minimumStock: product.reorder_point || 0,
        maxStockLevel: product.max_stock_level || 0,
        category: product.categories?.name || 'Uncategorized',
        categoryId: product.category_id,
        supplier: product.suppliers?.name || 'N/A',
        supplierId: product.supplier_id,
        status: product.is_active ? 'active' : 'inactive',
        brand: product.brand,
        model: product.model,
        currency: product.currency || 'USD',
        tags: product.tags || [],
        imageUrl: product.image_urls?.[0] || null,
        inventory: product.inventory || [],
        unit: product.metadata?.unit || 'pcs',
        createdAt: product.created_at,
        updatedAt: product.updated_at
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  createProduct: async (data) => {
    try {
      console.log('createProduct - Input data:', data);
      
      // Validate price comparison
      const sellingPrice = parseFloat(data.sellingPrice || data.price || 0);
      const costPrice = parseFloat(data.costPrice || data.cost_price || 0);
      
      if (sellingPrice < costPrice) {
        throw new Error('Selling price must be greater than or equal to cost price');
      }
      
      // Transform frontend data to backend format
      const backendData = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        selling_price: sellingPrice,
        cost_price: costPrice,
        category_id: data.category ? parseInt(data.category) : null,
        supplier_id: data.supplier ? parseInt(data.supplier) : null,
        reorder_point: parseInt(data.minimumStock || data.reorderPoint || data.reorder_point || 10),
        max_stock_level: data.maximumStock || data.maxStockLevel || data.max_stock_level ? parseInt(data.maximumStock || data.maxStockLevel || data.max_stock_level) : null,
        is_active: data.active !== false && data.status !== 'inactive',
        brand: data.brand,
        model: data.model,
        currency: data.currency || 'USD',
        tags: Array.isArray(data.tags) ? data.tags : [],
        barcode: data.barcode,
        weight: data.weight ? parseFloat(data.weight) : null,
        dimensions: data.dimensions || null,
        image_urls: Array.isArray(data.images) ? data.images : [],
        currentStock: parseInt(data.currentStock || 0),
        warehouse_id: data.warehouse_id || null,
        metadata: {
          ...data.metadata,
          unit: data.unit || 'pcs',
          trackStock: data.trackStock,
          allowBackorder: data.allowBackorder,
          featured: data.featured
        }
      };
      
      console.log('createProduct - Backend data:', backendData);
      
      const response = await apiClient.post('/test/products', backendData);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  updateProduct: async ({ id, ...data }) => {
    try {
      // Transform frontend data to backend format
      const backendData = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        selling_price: data.price || data.selling_price,
        cost_price: data.costPrice || data.cost_price,
        category_id: data.categoryId || data.category_id,
        supplier_id: data.supplierId || data.supplier_id,
        reorder_point: data.minimumStock || data.reorder_point,
        max_stock_level: data.maxStockLevel || data.max_stock_level,
        is_active: data.status === 'active' || data.is_active,
        brand: data.brand,
        model: data.model,
        currency: data.currency || 'USD',
        tags: data.tags || [],
        metadata: {
          ...data.metadata,
          unit: data.unit || 'pcs'
        }
      };
      
      const response = await apiClient.put(`/test/products/${id}`, backendData);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await apiClient.delete(`/test/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  archiveProduct: async ({ id, archived }) => {
    return apiClient.patch(`/test/products/${id}/archive`, { archived });
  },

  duplicateProduct: async (id) => {
    return apiClient.post(`/test/products/${id}/duplicate`);
  },

  bulkUpdate: async (productIds, updates) => {
    return apiClient.post('/test/products/bulk-update', { products: productIds.map(id => ({ id, ...updates })) });
  },

  bulkDelete: async (productIds) => {
    return apiClient.post('/test/products/bulk-delete', { productIds });
  },

  importProducts: async (data) => {
    return apiClient.post('/test/products/import', data);
  },

  exportProducts: async (productIds = []) => {
    return apiClient.post('/test/products/export', { productIds });
  }
};

// Category API
export const categoryApi = {
  getCategories: async () => {
    try {
      console.log('Fetching categories...');
      const response = await apiClient.get('/test/categories');
      console.log('Categories response:', response.data);
      // The test API returns { success: true, data: categories, message: "..." }
      // But it might also return the categories directly as an array
      let categories = [];
      if (response.data && Array.isArray(response.data)) {
        // Direct array response
        categories = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Nested data structure
        categories = response.data.data;
      } else if (response.data && response.data.success && response.data.data) {
        // Success wrapper structure
        categories = response.data.data;
      } else {
        console.error('Unexpected response structure:', response.data);
        categories = [];
      }
      console.log('Processed categories:', categories);
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  createCategory: async (data) => {
    try {
      const response = await apiClient.post('/test/categories', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  updateCategory: async ({ id, ...data }) => {
    try {
      const response = await apiClient.put(`/test/categories/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await apiClient.delete(`/test/categories/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

// Supplier API
export const supplierApi = {
  getSuppliers: async () => {
    try {
      console.log('Fetching suppliers...');
      const response = await apiClient.get('/test/suppliers');
      console.log('Suppliers response:', response.data);
      // Handle different response structures
      let suppliers = [];
      if (response.data && Array.isArray(response.data)) {
        // Direct array response
        suppliers = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Nested data structure
        suppliers = response.data.data;
      } else if (response.data && response.data.success && response.data.data) {
        // Success wrapper structure
        suppliers = response.data.data;
      } else {
        console.error('Unexpected response structure:', response.data);
        suppliers = [];
      }
      console.log('Processed suppliers:', suppliers);
      return suppliers;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  createSupplier: async (data) => {
    try {
      const response = await apiClient.post('/test/suppliers', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  updateSupplier: async ({ id, ...data }) => {
    try {
      const response = await apiClient.put(`/test/suppliers/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    try {
      const response = await apiClient.delete(`/test/suppliers/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
};

// Warehouse API
export const warehouseApi = {
  getWarehouses: async () => {
    try {
      console.log('Fetching warehouses...');
      const response = await apiClient.get('/test/warehouses');
      console.log('Warehouses response:', response.data);
      let warehouses = [];
      if (response.data && Array.isArray(response.data)) {
        warehouses = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        warehouses = response.data.data;
      } else if (response.data && response.data.success && response.data.data) {
        warehouses = response.data.data;
      } else {
        console.error('Unexpected response structure:', response.data);
        warehouses = [];
      }
      console.log('Processed warehouses:', warehouses);
      return warehouses;
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      throw error;
    }
  },

  createWarehouse: async (data) => {
    try {
      const response = await apiClient.post('/test/warehouses', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      throw error;
    }
  },

  updateWarehouse: async ({ id, ...data }) => {
    try {
      const response = await apiClient.put(`/test/warehouses/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  },

  deleteWarehouse: async (id) => {
    try {
      const response = await apiClient.delete(`/test/warehouses/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  },

  getWarehouseAnalytics: async (warehouseId) => {
    try {
      const response = await apiClient.get(`/test/warehouses/${warehouseId}/analytics`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching warehouse analytics:', error);
      throw error;
    }
  }
};

export const apiClient = new ApiClient();
export default apiClient;