const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class SupplierService {
  // Get all suppliers with filters
  async getSuppliers(filters) {
    try {
      const {
        page,
        limit,
        search,
        status,
        country,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('suppliers')
        .select('*');

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_code.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('is_active', status === 'active');
      }

      if (country) {
        query = query.eq('country', country);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: suppliers, error, count } = await query;

      if (error) {
        console.error('Get suppliers error:', error);
        throw new AppError('Failed to retrieve suppliers', 500, 'GET_SUPPLIERS_ERROR');
      }

      return {
        data: suppliers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get suppliers', 500, 'SUPPLIER_SERVICE_ERROR');
    }
  }

  // Get single supplier by ID
  async getSupplierById(id) {
    try {
      const { data: supplier, error } = await supabaseAdmin
        .from('suppliers')
        .select(`
          *,
          supplier_contacts (
            id,
            name,
            position,
            email,
            phone,
            is_primary
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
        }
        console.error('Get supplier error:', error);
        throw new AppError('Failed to retrieve supplier', 500, 'GET_SUPPLIER_ERROR');
      }

      return supplier;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get supplier', 500, 'GET_SUPPLIER_ERROR');
    }
  }

  // Create new supplier
  async createSupplier(supplierData, userId) {
    try {
      const {
        name,
        company_code,
        email,
        phone,
        website,
        address,
        city,
        state,
        postal_code,
        country,
        tax_id,
        payment_terms,
        credit_limit,
        currency,
        notes,
        status = 'active'
      } = supplierData;

      // Check if supplier code already exists
      if (company_code) {
        const { data: existingCode } = await supabaseAdmin
          .from('suppliers')
          .select('id')
          .eq('company_code', company_code)
          .single();

        if (existingCode) {
          throw new AppError('Supplier code already exists', 400, 'SUPPLIER_CODE_EXISTS');
        }
      }

      const { data: supplier, error } = await supabaseAdmin
        .from('suppliers')
        .insert({
          name,
          company_code,
          email,
          phone,
          website,
          address,
          city,
          state,
          postal_code,
          country,
          tax_id,
          payment_terms,
          credit_limit,
          currency,
          notes,
          status,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Create supplier error:', error);
        throw new AppError('Failed to create supplier', 500, 'CREATE_SUPPLIER_ERROR');
      }

      logBusinessEvent('SUPPLIER_CREATED', userId, { supplierId: supplier.id, name });

      return supplier;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create supplier', 500, 'CREATE_SUPPLIER_ERROR');
    }
  }

  // Update supplier
  async updateSupplier(id, updateData, userId) {
    try {
      // Check if supplier exists
      const { data: existingSupplier } = await supabaseAdmin
        .from('suppliers')
        .select('id, company_code')
        .eq('id', id)
        .single();

      if (!existingSupplier) {
        throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
      }

      // Check for code conflicts if code is being updated
      if (updateData.company_code && updateData.company_code !== existingSupplier.company_code) {
        const { data: codeConflict } = await supabaseAdmin
          .from('suppliers')
          .select('id')
          .eq('company_code', updateData.company_code)
          .neq('id', id)
          .single();

        if (codeConflict) {
          throw new AppError('Supplier code already exists', 400, 'SUPPLIER_CODE_EXISTS');
        }
      }

      const { data: supplier, error } = await supabaseAdmin
        .from('suppliers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update supplier error:', error);
        throw new AppError('Failed to update supplier', 500, 'UPDATE_SUPPLIER_ERROR');
      }

      logBusinessEvent('SUPPLIER_UPDATED', userId, { supplierId: id, changes: updateData });

      return supplier;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update supplier', 500, 'UPDATE_SUPPLIER_ERROR');
    }
  }

  // Delete supplier
  async deleteSupplier(id, userId) {
    try {
      // Check if supplier exists
      const { data: supplier } = await supabaseAdmin
        .from('suppliers')
        .select('id, name')
        .eq('id', id)
        .single();

      if (!supplier) {
        throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
      }

      // Check if supplier has products
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('supplier_id', id)
        .neq('status', 'deleted');

      if (products && products.length > 0) {
        throw new AppError('Cannot delete supplier with active products', 400, 'SUPPLIER_HAS_PRODUCTS');
      }

      // Check if supplier has pending purchase orders
      const { data: purchaseOrders } = await supabaseAdmin
        .from('purchase_orders')
        .select('id')
        .eq('supplier_id', id)
        .in('status', ['draft', 'pending', 'approved', 'sent']);

      if (purchaseOrders && purchaseOrders.length > 0) {
        throw new AppError('Cannot delete supplier with pending purchase orders', 400, 'SUPPLIER_HAS_PENDING_ORDERS');
      }

      // Soft delete the supplier
      const { error } = await supabaseAdmin
        .from('suppliers')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('id', id);

      if (error) {
        console.error('Delete supplier error:', error);
        throw new AppError('Failed to delete supplier', 500, 'DELETE_SUPPLIER_ERROR');
      }

      logBusinessEvent('SUPPLIER_DELETED', userId, { supplierId: id, name: supplier.name });

      return { message: 'Supplier deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete supplier', 500, 'DELETE_SUPPLIER_ERROR');
    }
  }

  // Get supplier products
  async getSupplierProducts(supplierId, filters) {
    try {
      const {
        page,
        limit,
        search,
        category,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('supplier_id', supplierId)
        .neq('status', 'deleted');

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (category) {
        query = query.eq('category_id', category);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        console.error('Get supplier products error:', error);
        throw new AppError('Failed to get supplier products', 500, 'GET_SUPPLIER_PRODUCTS_ERROR');
      }

      return {
        data: products,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get supplier products', 500, 'GET_SUPPLIER_PRODUCTS_ERROR');
    }
  }

  // Get supplier contacts
  async getSupplierContacts(supplierId) {
    try {
      const { data: contacts, error } = await supabaseAdmin
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Get supplier contacts error:', error);
        throw new AppError('Failed to get supplier contacts', 500, 'GET_CONTACTS_ERROR');
      }

      return contacts;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get supplier contacts', 500, 'GET_CONTACTS_ERROR');
    }
  }

  // Add supplier contact
  async addSupplierContact(supplierId, contactData, userId) {
    try {
      const {
        name,
        position,
        email,
        phone,
        mobile,
        is_primary = false,
        notes
      } = contactData;

      // If setting as primary, unset other primary contacts
      if (is_primary) {
        await supabaseAdmin
          .from('supplier_contacts')
          .update({ is_primary: false })
          .eq('supplier_id', supplierId)
          .eq('is_primary', true);
      }

      const { data: contact, error } = await supabaseAdmin
        .from('supplier_contacts')
        .insert({
          supplier_id: supplierId,
          name,
          position,
          email,
          phone,
          mobile,
          is_primary,
          notes,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Add supplier contact error:', error);
        throw new AppError('Failed to add supplier contact', 500, 'ADD_CONTACT_ERROR');
      }

      logBusinessEvent('SUPPLIER_CONTACT_ADDED', userId, { contactId: contact.id, supplierId, name });

      return contact;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add supplier contact', 500, 'ADD_CONTACT_ERROR');
    }
  }

  // Update supplier contact
  async updateSupplierContact(contactId, updateData, userId) {
    try {
      // If setting as primary, unset other primary contacts for this supplier
      if (updateData.is_primary) {
        const { data: contact } = await supabaseAdmin
          .from('supplier_contacts')
          .select('supplier_id')
          .eq('id', contactId)
          .single();

        if (contact) {
          await supabaseAdmin
            .from('supplier_contacts')
            .update({ is_primary: false })
            .eq('supplier_id', contact.supplier_id)
            .eq('is_primary', true)
            .neq('id', contactId);
        }
      }

      const { data: updatedContact, error } = await supabaseAdmin
        .from('supplier_contacts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', contactId)
        .select()
        .single();

      if (error) {
        console.error('Update supplier contact error:', error);
        throw new AppError('Failed to update supplier contact', 500, 'UPDATE_CONTACT_ERROR');
      }

      logBusinessEvent('SUPPLIER_CONTACT_UPDATED', userId, { contactId, changes: updateData });

      return updatedContact;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update supplier contact', 500, 'UPDATE_CONTACT_ERROR');
    }
  }

  // Delete supplier contact
  async deleteSupplierContact(contactId, userId) {
    try {
      const { error } = await supabaseAdmin
        .from('supplier_contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Delete supplier contact error:', error);
        throw new AppError('Failed to delete supplier contact', 500, 'DELETE_CONTACT_ERROR');
      }

      logBusinessEvent('SUPPLIER_CONTACT_DELETED', userId, { contactId });

      return { message: 'Contact deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete supplier contact', 500, 'DELETE_CONTACT_ERROR');
    }
  }

  // Get supplier purchase orders
  async getSupplierPurchaseOrders(supplierId, filters) {
    try {
      const {
        page,
        limit,
        status,
        startDate,
        endDate,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('purchase_orders')
        .select(`
          *,
          warehouses (
            id,
            name
          )
        `)
        .eq('supplier_id', supplierId);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        console.error('Get supplier purchase orders error:', error);
        throw new AppError('Failed to get supplier purchase orders', 500, 'GET_SUPPLIER_ORDERS_ERROR');
      }

      return {
        data: orders,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get supplier purchase orders', 500, 'GET_SUPPLIER_ORDERS_ERROR');
    }
  }

  // Get supplier performance metrics
  async getSupplierPerformance(supplierId, period) {
    try {
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get purchase orders for the period
      const { data: orders } = await supabaseAdmin
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', supplierId)
        .gte('created_at', startDate.toISOString());

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'received').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const totalValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

      // Calculate on-time delivery rate
      const onTimeOrders = orders.filter(o => 
        o.status === 'received' && 
        o.received_date && 
        o.expected_delivery_date &&
        new Date(o.received_date) <= new Date(o.expected_delivery_date)
      ).length;

      const onTimeDeliveryRate = completedOrders > 0 ? (onTimeOrders / completedOrders) * 100 : 0;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      return {
        period: `${days} days`,
        total_orders: totalOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        total_value: totalValue,
        completion_rate: Math.round(completionRate * 100) / 100,
        cancellation_rate: Math.round(cancellationRate * 100) / 100,
        on_time_delivery_rate: Math.round(onTimeDeliveryRate * 100) / 100,
        average_order_value: totalOrders > 0 ? totalValue / totalOrders : 0
      };
    } catch (error) {
      console.error('Get supplier performance error:', error);
      throw new AppError('Failed to get supplier performance', 500, 'GET_SUPPLIER_PERFORMANCE_ERROR');
    }
  }
}

module.exports = new SupplierService();