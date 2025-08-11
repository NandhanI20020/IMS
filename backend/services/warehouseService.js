const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class WarehouseService {
  // Get all warehouses with filters
  async getWarehouses(filters) {
    try {
      const {
        page,
        limit,
        search,
        status,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('warehouses')
        .select('*');

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,location.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: warehouses, error, count } = await query;

      if (error) {
        console.error('Get warehouses error:', error);
        throw new AppError('Failed to retrieve warehouses', 500, 'GET_WAREHOUSES_ERROR');
      }

      return {
        data: warehouses,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get warehouses', 500, 'WAREHOUSE_SERVICE_ERROR');
    }
  }

  // Get single warehouse by ID
  async getWarehouseById(id) {
    try {
      const { data: warehouse, error } = await supabaseAdmin
        .from('warehouses')
        .select(`
          *,
          warehouse_locations (
            id,
            zone,
            aisle,
            shelf,
            bin,
            capacity
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
        }
        console.error('Get warehouse error:', error);
        throw new AppError('Failed to retrieve warehouse', 500, 'GET_WAREHOUSE_ERROR');
      }

      return warehouse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get warehouse', 500, 'GET_WAREHOUSE_ERROR');
    }
  }

  // Create new warehouse
  async createWarehouse(warehouseData, userId) {
    try {
      const {
        name,
        code,
        description,
        location,
        address,
        phone,
        email,
        manager_id,
        capacity,
        status = 'active',
        settings
      } = warehouseData;

      // Check if warehouse code already exists
      const { data: existingCode } = await supabaseAdmin
        .from('warehouses')
        .select('id')
        .eq('code', code)
        .single();

      if (existingCode) {
        throw new AppError('Warehouse code already exists', 400, 'WAREHOUSE_CODE_EXISTS');
      }

      const { data: warehouse, error } = await supabaseAdmin
        .from('warehouses')
        .insert({
          name,
          code,
          description,
          location,
          address,
          phone,
          email,
          manager_id,
          capacity,
          status,
          settings,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Create warehouse error:', error);
        throw new AppError('Failed to create warehouse', 500, 'CREATE_WAREHOUSE_ERROR');
      }

      logBusinessEvent('WAREHOUSE_CREATED', userId, { warehouseId: warehouse.id, name, code });

      return warehouse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create warehouse', 500, 'CREATE_WAREHOUSE_ERROR');
    }
  }

  // Update warehouse
  async updateWarehouse(id, updateData, userId) {
    try {
      // Check if warehouse exists
      const { data: existingWarehouse } = await supabaseAdmin
        .from('warehouses')
        .select('id, code')
        .eq('id', id)
        .single();

      if (!existingWarehouse) {
        throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
      }

      // Check for code conflicts if code is being updated
      if (updateData.code && updateData.code !== existingWarehouse.code) {
        const { data: codeConflict } = await supabaseAdmin
          .from('warehouses')
          .select('id')
          .eq('code', updateData.code)
          .neq('id', id)
          .single();

        if (codeConflict) {
          throw new AppError('Warehouse code already exists', 400, 'WAREHOUSE_CODE_EXISTS');
        }
      }

      const { data: warehouse, error } = await supabaseAdmin
        .from('warehouses')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update warehouse error:', error);
        throw new AppError('Failed to update warehouse', 500, 'UPDATE_WAREHOUSE_ERROR');
      }

      logBusinessEvent('WAREHOUSE_UPDATED', userId, { warehouseId: id, changes: updateData });

      return warehouse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update warehouse', 500, 'UPDATE_WAREHOUSE_ERROR');
    }
  }

  // Delete warehouse
  async deleteWarehouse(id, userId) {
    try {
      // Check if warehouse exists
      const { data: warehouse } = await supabaseAdmin
        .from('warehouses')
        .select('id, name, code')
        .eq('id', id)
        .single();

      if (!warehouse) {
        throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
      }

      // Check if warehouse has inventory
      const { data: inventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('warehouse_id', id);

      const hasStock = inventory.some(inv => inv.current_stock > 0);
      if (hasStock) {
        throw new AppError('Cannot delete warehouse with existing inventory', 400, 'WAREHOUSE_HAS_INVENTORY');
      }

      // Check if warehouse has pending purchase orders
      const { data: purchaseOrders } = await supabaseAdmin
        .from('purchase_orders')
        .select('id')
        .eq('warehouse_id', id)
        .in('status', ['draft', 'pending', 'approved', 'sent']);

      if (purchaseOrders && purchaseOrders.length > 0) {
        throw new AppError('Cannot delete warehouse with pending purchase orders', 400, 'WAREHOUSE_HAS_PENDING_ORDERS');
      }

      // Soft delete the warehouse
      const { error } = await supabaseAdmin
        .from('warehouses')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('id', id);

      if (error) {
        console.error('Delete warehouse error:', error);
        throw new AppError('Failed to delete warehouse', 500, 'DELETE_WAREHOUSE_ERROR');
      }

      logBusinessEvent('WAREHOUSE_DELETED', userId, { warehouseId: id, name: warehouse.name, code: warehouse.code });

      return { message: 'Warehouse deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete warehouse', 500, 'DELETE_WAREHOUSE_ERROR');
    }
  }

  // Get warehouse inventory
  async getWarehouseInventory(warehouseId, filters) {
    try {
      const {
        page,
        limit,
        search,
        category,
        lowStock,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            price,
            cost,
            unit,
            categories (
              id,
              name
            )
          )
        `)
        .eq('warehouse_id', warehouseId);

      // Apply filters
      if (search) {
        query = query.or(`products.name.ilike.%${search}%,products.sku.ilike.%${search}%`);
      }

      if (category) {
        query = query.eq('products.category_id', category);
      }

      if (lowStock) {
        query = query.lt('current_stock', 'reorder_level');
      }

      // Apply sorting
      const sortField = sort === 'product_name' ? 'products.name' : sort;
      query = query.order(sortField, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: inventory, error, count } = await query;

      if (error) {
        console.error('Get warehouse inventory error:', error);
        throw new AppError('Failed to get warehouse inventory', 500, 'GET_WAREHOUSE_INVENTORY_ERROR');
      }

      return {
        data: inventory,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get warehouse inventory', 500, 'GET_WAREHOUSE_INVENTORY_ERROR');
    }
  }

  // Get warehouse analytics
  async getWarehouseAnalytics(warehouseId, period) {
    try {
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic inventory stats
      const { data: inventoryStats } = await supabaseAdmin
        .from('inventory')
        .select('current_stock, products(cost, price)')
        .eq('warehouse_id', warehouseId);

      const totalProducts = inventoryStats.length;
      const totalStock = inventoryStats.reduce((sum, item) => sum + item.current_stock, 0);
      const totalValue = inventoryStats.reduce((sum, item) => 
        sum + (item.current_stock * (item.products?.price || 0)), 0);
      const totalCost = inventoryStats.reduce((sum, item) => 
        sum + (item.current_stock * (item.products?.cost || 0)), 0);

      // Get stock movements for the period
      const { data: movements } = await supabaseAdmin
        .from('stock_movements')
        .select('movement_type, quantity, created_at')
        .eq('warehouse_id', warehouseId)
        .gte('created_at', startDate.toISOString());

      const movementsByType = movements.reduce((acc, movement) => {
        acc[movement.movement_type] = (acc[movement.movement_type] || 0) + movement.quantity;
        return acc;
      }, {});

      // Get low stock items
      const { data: lowStockItems } = await supabaseAdmin
        .from('inventory')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .lt('current_stock', 'reorder_level');

      return {
        summary: {
          total_products: totalProducts,
          total_stock: totalStock,
          total_value: totalValue,
          total_cost: totalCost,
          low_stock_items: lowStockItems.length
        },
        movements: movementsByType,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Get warehouse analytics error:', error);
      throw new AppError('Failed to get warehouse analytics', 500, 'GET_WAREHOUSE_ANALYTICS_ERROR');
    }
  }

  // Get warehouse locations
  async getWarehouseLocations(warehouseId) {
    try {
      const { data: locations, error } = await supabaseAdmin
        .from('warehouse_locations')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('zone', { ascending: true })
        .order('aisle', { ascending: true })
        .order('shelf', { ascending: true });

      if (error) {
        console.error('Get warehouse locations error:', error);
        throw new AppError('Failed to get warehouse locations', 500, 'GET_LOCATIONS_ERROR');
      }

      return locations;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get warehouse locations', 500, 'GET_LOCATIONS_ERROR');
    }
  }

  // Create warehouse location
  async createWarehouseLocation(warehouseId, locationData, userId) {
    try {
      const {
        zone,
        aisle,
        shelf,
        bin,
        capacity,
        location_type = 'storage'
      } = locationData;

      // Check if location already exists
      const { data: existingLocation } = await supabaseAdmin
        .from('warehouse_locations')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('zone', zone)
        .eq('aisle', aisle)
        .eq('shelf', shelf)
        .eq('bin', bin)
        .single();

      if (existingLocation) {
        throw new AppError('Location already exists', 400, 'LOCATION_EXISTS');
      }

      const { data: location, error } = await supabaseAdmin
        .from('warehouse_locations')
        .insert({
          warehouse_id: warehouseId,
          zone,
          aisle,
          shelf,
          bin,
          capacity,
          location_type,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Create warehouse location error:', error);
        throw new AppError('Failed to create warehouse location', 500, 'CREATE_LOCATION_ERROR');
      }

      logBusinessEvent('WAREHOUSE_LOCATION_CREATED', userId, { 
        locationId: location.id, 
        warehouseId, 
        zone, 
        aisle, 
        shelf, 
        bin 
      });

      return location;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create warehouse location', 500, 'CREATE_LOCATION_ERROR');
    }
  }

  // Update warehouse location
  async updateWarehouseLocation(locationId, updateData, userId) {
    try {
      const { data: location, error } = await supabaseAdmin
        .from('warehouse_locations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', locationId)
        .select()
        .single();

      if (error) {
        console.error('Update warehouse location error:', error);
        throw new AppError('Failed to update warehouse location', 500, 'UPDATE_LOCATION_ERROR');
      }

      logBusinessEvent('WAREHOUSE_LOCATION_UPDATED', userId, { locationId, changes: updateData });

      return location;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update warehouse location', 500, 'UPDATE_LOCATION_ERROR');
    }
  }

  // Delete warehouse location
  async deleteWarehouseLocation(locationId, userId) {
    try {
      // Check if location has inventory
      const { data: locationInventory } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('location_id', locationId);

      const hasStock = locationInventory.some(inv => inv.current_stock > 0);
      if (hasStock) {
        throw new AppError('Cannot delete location with existing inventory', 400, 'LOCATION_HAS_INVENTORY');
      }

      const { error } = await supabaseAdmin
        .from('warehouse_locations')
        .delete()
        .eq('id', locationId);

      if (error) {
        console.error('Delete warehouse location error:', error);
        throw new AppError('Failed to delete warehouse location', 500, 'DELETE_LOCATION_ERROR');
      }

      logBusinessEvent('WAREHOUSE_LOCATION_DELETED', userId, { locationId });

      return { message: 'Location deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete warehouse location', 500, 'DELETE_LOCATION_ERROR');
    }
  }
}

module.exports = new WarehouseService();