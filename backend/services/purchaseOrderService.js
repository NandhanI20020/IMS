const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class PurchaseOrderService {
  // Get all purchase orders with filters
  async getPurchaseOrders(filters) {
    try {
      const {
        page,
        limit,
        search,
        status,
        supplier,
        warehouse,
        startDate,
        endDate,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          po_number,
          supplier_id,
          warehouse_id,
          status,
          order_date,
          expected_delivery_date,
          actual_delivery_date,
          subtotal,
          tax_rate,
          tax_amount,
          shipping_cost,
          discount_amount,
          total_amount,
          currency,
          notes,
          terms_conditions,
          priority,
          created_at,
          updated_at,
          created_by,
          approved_by,
          approved_at,
          suppliers (
            id,
            name,
            email,
            phone,
            contact_person,
            address,
            city,
            state,
            postal_code,
            country
          ),
          warehouses (
            id,
            name,
            code,
            address,
            city,
            state,
            postal_code,
            country
          ),
          purchase_order_items (
            id,
            product_id,
            quantity,
            unit_cost,
            line_total,
            received_quantity,
            products (
              id,
              name,
              sku,
              unit
            )
          )
        `);

      // Apply filters
      if (search) {
        query = query.or(`po_number.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (supplier) {
        query = query.eq('supplier_id', supplier);
      }

      if (warehouse) {
        query = query.eq('warehouse_id', warehouse);
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
        console.error('Get purchase orders error:', error);
        throw new AppError('Failed to retrieve purchase orders', 500, 'GET_ORDERS_ERROR');
      }

      // Transform the data to include calculated fields
      const transformedOrders = orders?.map(order => {
        const itemCount = order.purchase_order_items?.length || 0;
        const totalQuantity = order.purchase_order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const receivedQuantity = order.purchase_order_items?.reduce((sum, item) => sum + (item.received_quantity || 0), 0) || 0;
        
        return {
          ...order,
          itemCount,
          totalQuantity,
          receivedQuantity,
          remainingQuantity: totalQuantity - receivedQuantity,
          completionPercentage: totalQuantity > 0 ? Math.round((receivedQuantity / totalQuantity) * 100) : 0,
          totalAmount: order.total_amount || ((order.subtotal || 0) + (order.tax_amount || 0) + (order.shipping_cost || 0) - (order.discount_amount || 0))
        };
      }) || [];

      return {
        data: transformedOrders,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get purchase orders', 500, 'PURCHASE_ORDER_SERVICE_ERROR');
    }
  }

  // Get single purchase order by ID
  async getPurchaseOrderById(id) {
    try {
      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            id,
            name,
            email,
            phone,
            address,
            payment_terms
          ),
          warehouses (
            id,
            name,
            address
          ),
          purchase_order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total,
            received_quantity,
            products (
              id,
              name,
              sku,
              unit
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
        }
        console.error('Get purchase order error:', error);
        throw new AppError('Failed to retrieve purchase order', 500, 'GET_ORDER_ERROR');
      }

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get purchase order', 500, 'GET_ORDER_ERROR');
    }
  }

  // Generate unique order number
  async generateOrderNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    const prefix = `PO${year}${month}`;
    
    // Get the highest order number for this month
    const { data: lastOrder } = await supabaseAdmin
      .from('purchase_orders')
      .select('order_number')
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.order_number.slice(-4));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  // Create new purchase order
  async createPurchaseOrder(orderData, userId) {
    try {
      const {
        supplier_id,
        warehouse_id,
        reference,
        expected_delivery_date,
        notes,
        items,
        shipping_cost = 0,
        tax_rate = 0,
        discount = 0
      } = orderData;

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * (tax_rate / 100);
      const totalAmount = subtotal + taxAmount + shipping_cost - discount;

      // Create purchase order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          supplier_id: parseInt(supplier_id),
          warehouse_id: parseInt(warehouse_id),
          reference,
          subtotal,
          tax_rate,
          tax_amount: taxAmount,
          shipping_cost,
          discount_amount: discount,
          total_amount: totalAmount,
          expected_delivery_date,
          notes,
          status: 'draft',
          created_by: userId
        })
        .select()
        .single();

      if (orderError) {
        console.error('Create purchase order error:', orderError);
        throw new AppError('Failed to create purchase order', 500, 'CREATE_ORDER_ERROR');
      }

      // Create order items
      const orderItems = items.map(item => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_price,
        line_total: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('purchase_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Create order items error:', itemsError);
        // Rollback order creation
        await supabaseAdmin.from('purchase_orders').delete().eq('id', order.id);
        throw new AppError('Failed to create order items', 500, 'CREATE_ITEMS_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_CREATED', userId, { 
        orderId: order.id, 
        orderNumber, 
        supplierId: supplier_id,
        total 
      });

      return await this.getPurchaseOrderById(order.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create purchase order', 500, 'CREATE_ORDER_ERROR');
    }
  }

  // Update purchase order
  async updatePurchaseOrder(id, updateData, userId) {
    try {
      // Check if order exists and is editable
      const { data: existingOrder } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, status')
        .eq('id', id)
        .single();

      if (!existingOrder) {
        throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (!['draft'].includes(existingOrder.status)) {
        throw new AppError('Cannot update purchase order in current status', 400, 'ORDER_NOT_EDITABLE');
      }

      // If items are being updated, recalculate totals
      if (updateData.items) {
        const subtotal = updateData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxAmount = subtotal * ((updateData.tax_rate || 0) / 100);
        const total = subtotal + taxAmount + (updateData.shipping_cost || 0) - (updateData.discount || 0);

        updateData.subtotal = subtotal;
        updateData.tax_amount = taxAmount;
        updateData.total = total;

        // Update order items
        await supabaseAdmin
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id);

        const orderItems = updateData.items.map(item => ({
          purchase_order_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));

        await supabaseAdmin
          .from('purchase_order_items')
          .insert(orderItems);

        delete updateData.items;
      }

      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update purchase order error:', error);
        throw new AppError('Failed to update purchase order', 500, 'UPDATE_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_UPDATED', userId, { orderId: id, changes: updateData });

      return await this.getPurchaseOrderById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update purchase order', 500, 'UPDATE_ORDER_ERROR');
    }
  }

  // Delete purchase order
  async deletePurchaseOrder(id, userId) {
    try {
      // Check if order exists and is deletable
      const { data: order } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, status, order_number')
        .eq('id', id)
        .single();

      if (!order) {
        throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (!['draft'].includes(order.status)) {
        throw new AppError('Cannot delete purchase order in current status', 400, 'ORDER_NOT_DELETABLE');
      }

      // Delete order items first
      await supabaseAdmin
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      // Delete the order
      const { error } = await supabaseAdmin
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete purchase order error:', error);
        throw new AppError('Failed to delete purchase order', 500, 'DELETE_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_DELETED', userId, { 
        orderId: id, 
        orderNumber: order.order_number 
      });

      return { message: 'Purchase order deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete purchase order', 500, 'DELETE_ORDER_ERROR');
    }
  }

  // Send purchase order to supplier (replaces submit/approve workflow)
  async sendPurchaseOrderToSupplier(id, userId, emailData = {}) {
    try {
      // Check current status
      const { data: currentOrder } = await supabaseAdmin
        .from('purchase_orders')
        .select('status, order_number, suppliers(email), contact_email')
        .eq('id', id)
        .single();

      if (!currentOrder) {
        throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (!['draft'].includes(currentOrder.status)) {
        throw new AppError('Can only send draft purchase orders', 400, 'INVALID_STATUS_FOR_SEND');
      }

      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !order) {
        throw new AppError('Failed to send purchase order', 400, 'SEND_ORDER_ERROR');
      }

      // Here you would integrate with email service
      logBusinessEvent('PURCHASE_ORDER_SENT', userId, { 
        orderId: id, 
        orderNumber: order.order_number,
        emailTo: emailData.email || currentOrder.contact_email || currentOrder.suppliers?.email
      });

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to send purchase order', 500, 'SEND_ORDER_ERROR');
    }
  }

  // Confirm purchase order (supplier confirms receipt and acceptance)
  async confirmPurchaseOrder(id, userId, confirmationData = {}) {
    try {
      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId,
          supplier_confirmation_notes: confirmationData.notes,
          reference: confirmationData.supplierReference,
          expected_delivery_date: confirmationData.expectedDeliveryDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'sent')
        .select()
        .single();

      if (error || !order) {
        throw new AppError('Failed to confirm purchase order or order not in sent status', 400, 'CONFIRM_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_CONFIRMED', userId, { 
        orderId: id, 
        supplierReference: confirmationData.supplierReference,
        notes: confirmationData.notes 
      });

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to confirm purchase order', 500, 'CONFIRM_ORDER_ERROR');
    }
  }

  // Complete purchase order (close and archive)
  async completePurchaseOrder(id, userId, completionNotes) {
    try {
      // Check if order is fully received
      const { data: orderWithItems } = await supabaseAdmin
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (quantity, received_quantity)
        `)
        .eq('id', id)
        .single();

      if (!orderWithItems) {
        throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (!['received'].includes(orderWithItems.status)) {
        throw new AppError('Can only complete fully received purchase orders', 400, 'INVALID_STATUS_FOR_COMPLETE');
      }

      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
          notes: completionNotes || orderWithItems.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !order) {
        throw new AppError('Failed to complete purchase order', 400, 'COMPLETE_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_COMPLETED', userId, { orderId: id });

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to complete purchase order', 500, 'COMPLETE_ORDER_ERROR');
    }
  }

  // Send purchase order to supplier
  async sendPurchaseOrder(id, email, message, userId) {
    try {
      // Update order status
      const { data: order, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .eq('status', 'approved')
        .select()
        .single();

      if (error || !order) {
        throw new AppError('Failed to send purchase order or order not approved', 400, 'SEND_ORDER_ERROR');
      }

      // Here you would integrate with email service
      // For now, just log the event
      logBusinessEvent('PURCHASE_ORDER_SENT', userId, { 
        orderId: id, 
        email, 
        orderNumber: order.order_number 
      });

      return { 
        message: 'Purchase order sent successfully',
        sentTo: email,
        orderNumber: order.order_number
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to send purchase order', 500, 'SEND_ORDER_ERROR');
    }
  }

  // Receive purchase order (full)
  async receivePurchaseOrder(id, items, userId, notes) {
    try {
      const order = await this.getPurchaseOrderById(id);

      if (!['sent', 'partially_received'].includes(order.status)) {
        throw new AppError('Cannot receive purchase order in current status', 400, 'INVALID_STATUS_FOR_RECEIVE');
      }

      // Update inventory and order items
      for (const receivedItem of items) {
        const { product_id, received_quantity } = receivedItem;

        // Update order item
        await supabaseAdmin
          .from('purchase_order_items')
          .update({ 
            received_quantity,
            updated_at: new Date().toISOString()
          })
          .eq('purchase_order_id', id)
          .eq('product_id', product_id);

        // Update inventory
        const { data: inventory } = await supabaseAdmin
          .from('inventory')
          .select('current_stock')
          .eq('product_id', product_id)
          .eq('warehouse_id', order.warehouse_id)
          .single();

        const newStock = (inventory?.current_stock || 0) + received_quantity;

        if (inventory) {
          await supabaseAdmin
            .from('inventory')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString(),
              updated_by: userId
            })
            .eq('product_id', product_id)
            .eq('warehouse_id', order.warehouse_id);
        } else {
          await supabaseAdmin
            .from('inventory')
            .insert({
              product_id,
              warehouse_id: order.warehouse_id,
              current_stock: received_quantity,
              created_by: userId
            });
        }

        // Create stock movement
        await supabaseAdmin
          .from('stock_movements')
          .insert({
            product_id,
            warehouse_id: order.warehouse_id,
            movement_type: 'purchase_receive',
            quantity: received_quantity,
            previous_stock: inventory?.current_stock || 0,
            new_stock: newStock,
            reference: order.order_number,
            created_by: userId
          });
      }

      // Update order status
      const { data: updatedOrder, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'received',
          received_at: new Date().toISOString(),
          received_by: userId,
          receiving_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update order status', 500, 'UPDATE_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_RECEIVED', userId, { 
        orderId: id, 
        itemCount: items.length 
      });

      return { 
        message: 'Purchase order received successfully',
        order: updatedOrder
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to receive purchase order', 500, 'RECEIVE_ORDER_ERROR');
    }
  }

  // Partially receive purchase order
  async partiallyReceivePurchaseOrder(id, items, userId, notes) {
    try {
      // Similar to receive but set status as partially_received
      const order = await this.getPurchaseOrderById(id);

      if (!['sent', 'partially_received'].includes(order.status)) {
        throw new AppError('Cannot receive purchase order in current status', 400, 'INVALID_STATUS_FOR_RECEIVE');
      }

      // Update inventory and order items (same logic as receive)
      for (const receivedItem of items) {
        const { product_id, received_quantity } = receivedItem;

        // Get existing received quantity
        const { data: orderItem } = await supabaseAdmin
          .from('purchase_order_items')
          .select('received_quantity')
          .eq('purchase_order_id', id)
          .eq('product_id', product_id)
          .single();

        const totalReceived = (orderItem?.received_quantity || 0) + received_quantity;

        await supabaseAdmin
          .from('purchase_order_items')
          .update({ 
            received_quantity: totalReceived,
            updated_at: new Date().toISOString()
          })
          .eq('purchase_order_id', id)
          .eq('product_id', product_id);

        // Update inventory (same as receive method)
        const { data: inventory } = await supabaseAdmin
          .from('inventory')
          .select('current_stock')
          .eq('product_id', product_id)
          .eq('warehouse_id', order.warehouse_id)
          .single();

        const newStock = (inventory?.current_stock || 0) + received_quantity;

        if (inventory) {
          await supabaseAdmin
            .from('inventory')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString(),
              updated_by: userId
            })
            .eq('product_id', product_id)
            .eq('warehouse_id', order.warehouse_id);
        } else {
          await supabaseAdmin
            .from('inventory')
            .insert({
              product_id,
              warehouse_id: order.warehouse_id,
              current_stock: received_quantity,
              created_by: userId
            });
        }

        // Create stock movement
        await supabaseAdmin
          .from('stock_movements')
          .insert({
            product_id,
            warehouse_id: order.warehouse_id,
            movement_type: 'purchase_receive',
            quantity: received_quantity,
            previous_stock: inventory?.current_stock || 0,
            new_stock: newStock,
            reference: order.order_number,
            created_by: userId
          });
      }

      // Update order status to partially received
      const { data: updatedOrder, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'partially_received',
          last_received_at: new Date().toISOString(),
          received_by: userId,
          receiving_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update order status', 500, 'UPDATE_ORDER_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDER_PARTIALLY_RECEIVED', userId, { 
        orderId: id, 
        itemCount: items.length 
      });

      return { 
        message: 'Purchase order partially received',
        order: updatedOrder
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to partially receive purchase order', 500, 'PARTIAL_RECEIVE_ERROR');
    }
  }

  // Cancel purchase order
  async cancelPurchaseOrder(id, userId, reason) {
    try {
      // Ensure order exists and is cancellable
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, status, order_number')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        throw new AppError('Purchase order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (['cancelled', 'completed', 'received'].includes(existing.status)) {
        throw new AppError('Cannot cancel purchase order in current status', 400, 'INVALID_STATUS_FOR_CANCEL');
      }

      // Verify user profile exists for FK fields; if not, avoid setting *_by
      let cancelledBy = null;
      try {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .single();
        if (profile && profile.id) cancelledBy = userId;
      } catch (_) {}

      let updated;
      let error;
      // First attempt: full update with optional fields
      ({ data: updated, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select());

      if (error) {
        // Fallback: minimal update for schemas lacking some columns
        console.warn('Cancel PO update error, retrying minimal update:', error);
        ({ data: updated, error } = await supabaseAdmin
          .from('purchase_orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select());

        if (error) {
          console.error('Cancel PO minimal update error:', error);
          throw new AppError('Failed to cancel purchase order', 400, 'CANCEL_ORDER_ERROR');
        }
      }

      const order = Array.isArray(updated) ? updated[0] : updated;
      if (!order) {
        throw new AppError('Purchase order not found after update', 404, 'ORDER_NOT_FOUND');
      }

      logBusinessEvent('PURCHASE_ORDER_CANCELLED', userId, { orderId: id, reason });

      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel purchase order', 500, 'CANCEL_ORDER_ERROR');
    }
  }

  // Get purchase order history
  async getPurchaseOrderHistory(id) {
    try {
      // This would typically involve a separate status_history table
      // For now, return basic order info
      const order = await this.getPurchaseOrderById(id);
      
      const history = [
        {
          status: 'draft',
          timestamp: order.created_at,
          user: order.created_by,
          notes: 'Order created'
        }
      ];

      if (order.submitted_at) {
        history.push({
          status: 'pending',
          timestamp: order.submitted_at,
          user: order.submitted_by,
          notes: 'Submitted for approval'
        });
      }

      if (order.approved_at) {
        history.push({
          status: 'approved',
          timestamp: order.approved_at,
          user: order.approved_by,
          notes: order.approval_notes || 'Approved'
        });
      }

      if (order.sent_at) {
        history.push({
          status: 'sent',
          timestamp: order.sent_at,
          user: order.sent_by,
          notes: 'Sent to supplier'
        });
      }

      if (order.received_at) {
        history.push({
          status: 'received',
          timestamp: order.received_at,
          user: order.received_by,
          notes: order.receiving_notes || 'Order received'
        });
      }

      return history;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get purchase order history', 500, 'GET_HISTORY_ERROR');
    }
  }

  // Generate purchase order PDF
  async generatePurchaseOrderPDF(id) {
    try {
      // This would integrate with a PDF generation library
      // For now, return a placeholder
      const order = await this.getPurchaseOrderById(id);
      
      // Placeholder PDF generation
      const pdfContent = `Purchase Order: ${order.order_number}\nSupplier: ${order.suppliers.name}\nTotal: $${order.total}`;
      
      return Buffer.from(pdfContent, 'utf8');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate PDF', 500, 'PDF_GENERATION_ERROR');
    }
  }

  // Duplicate purchase order
  async duplicatePurchaseOrder(id, userId) {
    try {
      const originalOrder = await this.getPurchaseOrderById(id);

      const newOrderData = {
        supplier_id: originalOrder.supplier_id,
        warehouse_id: originalOrder.warehouse_id,
        reference: `Copy of ${originalOrder.reference || originalOrder.order_number}`,
        expected_delivery_date: originalOrder.expected_delivery_date,
        notes: originalOrder.notes,
        items: originalOrder.purchase_order_items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        shipping_cost: originalOrder.shipping_cost,
        tax_rate: originalOrder.tax_rate,
        discount: originalOrder.discount
      };

      return await this.createPurchaseOrder(newOrderData, userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to duplicate purchase order', 500, 'DUPLICATE_ORDER_ERROR');
    }
  }

  // Get purchase order analytics
  async getPurchaseOrderAnalytics(filters) {
    try {
      const { period, supplier, status } = filters;
      
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabaseAdmin
        .from('purchase_orders')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (supplier) {
        query = query.eq('supplier_id', supplier);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw new AppError('Failed to get analytics data', 500, 'ANALYTICS_ERROR');
      }

      const totalOrders = orders.length;
      const totalValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const monthlyData = orders.reduce((acc, order) => {
        const month = new Date(order.created_at).toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, value: 0 };
        }
        acc[month].count += 1;
        acc[month].value += order.total || 0;
        return acc;
      }, {});

      return {
        summary: {
          total_orders: totalOrders,
          total_value: totalValue,
          average_order_value: averageOrderValue
        },
        status_breakdown: statusCounts,
        monthly_data: monthlyData,
        period: `${days} days`
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get purchase order analytics', 500, 'ANALYTICS_ERROR');
    }
  }

  // Bulk operations for purchase orders
  async bulkUpdatePurchaseOrders(orderIds, updateData, userId) {
    try {
      // Validate that all orders exist and are in a valid state for bulk update
      const { data: orders } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, status, order_number')
        .in('id', orderIds);

      if (orders.length !== orderIds.length) {
        throw new AppError('Some purchase orders not found', 404, 'ORDERS_NOT_FOUND');
      }

      // Check if any orders are in non-editable status
      const nonEditableOrders = orders.filter(order => !['draft'].includes(order.status));
      if (nonEditableOrders.length > 0) {
        throw new AppError(
          `Cannot bulk update orders in non-draft status: ${nonEditableOrders.map(o => o.order_number).join(', ')}`,
          400,
          'INVALID_ORDERS_FOR_BULK_UPDATE'
        );
      }

      // Perform bulk update
      const { data: updatedOrders, error } = await supabaseAdmin
        .from('purchase_orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds)
        .select();

      if (error) {
        throw new AppError('Failed to bulk update purchase orders', 500, 'BULK_UPDATE_ERROR');
      }

      logBusinessEvent('PURCHASE_ORDERS_BULK_UPDATED', userId, { 
        orderIds, 
        updateData,
        count: updatedOrders.length 
      });

      return updatedOrders;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to bulk update purchase orders', 500, 'BULK_UPDATE_ERROR');
    }
  }

  // Bulk send purchase orders to suppliers
  async bulkSendPurchaseOrders(orderIds, userId, emailTemplate = {}) {
    try {
      const results = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const result = await this.sendPurchaseOrderToSupplier(orderId, userId, emailTemplate);
          results.push({ orderId, success: true, order: result });
        } catch (error) {
          errors.push({ orderId, success: false, error: error.message });
        }
      }

      logBusinessEvent('PURCHASE_ORDERS_BULK_SENT', userId, { 
        totalCount: orderIds.length,
        successCount: results.length,
        errorCount: errors.length
      });

      return { successes: results, errors };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to bulk send purchase orders', 500, 'BULK_SEND_ERROR');
    }
  }

  // Bulk cancel purchase orders
  async bulkCancelPurchaseOrders(orderIds, userId, reason) {
    try {
      const results = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const result = await this.cancelPurchaseOrder(orderId, userId, reason);
          results.push({ orderId, success: true, order: result });
        } catch (error) {
          errors.push({ orderId, success: false, error: error.message });
        }
      }

      logBusinessEvent('PURCHASE_ORDERS_BULK_CANCELLED', userId, { 
        totalCount: orderIds.length,
        successCount: results.length,
        errorCount: errors.length,
        reason
      });

      return { successes: results, errors };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to bulk cancel purchase orders', 500, 'BULK_CANCEL_ERROR');
    }
  }

  // Get purchase order status history
  async getPurchaseOrderStatusHistory(id) {
    try {
      const { data: history, error } = await supabaseAdmin
        .from('purchase_order_status_history')
        .select(`
          *,
          user_profiles!changed_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq('purchase_order_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        throw new AppError('Failed to get status history', 500, 'GET_HISTORY_ERROR');
      }

      return history.map(entry => ({
        ...entry,
        changed_by_name: `${entry.user_profiles?.first_name} ${entry.user_profiles?.last_name}`.trim()
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get purchase order status history', 500, 'GET_HISTORY_ERROR');
    }
  }

  // Export purchase orders to CSV/Excel format
  async exportPurchaseOrders(filters, format = 'csv') {
    try {
      // Get orders based on filters (without pagination)
      const exportFilters = { ...filters, page: 1, limit: 10000 };
      const result = await this.getPurchaseOrders(exportFilters);
      
      const orders = result.data;
      
      // Transform data for export
      const exportData = orders.map(order => ({
        'Order Number': order.order_number,
        'Status': order.status,
        'Supplier': order.suppliers?.name,
        'Warehouse': order.warehouses?.name,
        'Order Date': new Date(order.created_at).toLocaleDateString(),
        'Expected Delivery': order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '',
        'Priority': order.priority,
        'Total Amount': order.total_amount,
        'Currency': order.currency,
        'Reference': order.reference || '',
        'Contact Person': order.contact_person || '',
        'Contact Email': order.contact_email || '',
        'Notes': order.notes || ''
      }));

      return {
        data: exportData,
        format,
        filename: `purchase_orders_${new Date().toISOString().slice(0, 10)}.${format}`
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to export purchase orders', 500, 'EXPORT_ERROR');
    }
  }
}

module.exports = new PurchaseOrderService();