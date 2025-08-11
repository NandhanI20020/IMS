# Purchase Order Management System

## Overview

A comprehensive Purchase Order Management System integrated with the Inventory Management System (IMS) that provides complete workflow management from order creation to completion. The system supports a 7-stage workflow process with real-time status tracking, bulk operations, and receiving functionality.

## Features Implemented

### 🔄 7-Stage Purchase Order Workflow

1. **Draft** - Initial creation, can be modified
2. **Sent** - Sent to supplier, awaiting confirmation  
3. **Confirmed** - Supplier confirmed, awaiting delivery
4. **Partially Received** - Some items received
5. **Received** - All items received, ready for completion
6. **Completed** - Closed and archived
7. **Cancelled** - Order cancelled

### 📋 Main Components

#### 1. PO List View (`PurchaseOrderManagement.jsx`)
- **Status-based filtering and sorting** with 7 workflow statuses
- **Advanced search** by order number, supplier, warehouse, priority, date range
- **Quick actions** for send, confirm, receive, complete, and cancel
- **Bulk operations** for multiple purchase orders
- **Real-time status updates** with color-coded indicators
- **Export functionality** to CSV/Excel
- **Responsive design** with mobile-friendly interface

#### 2. PO Creation Wizard (`PurchaseOrderWizard.jsx`)
- **Step 1: Supplier & Basic Info**
  - Supplier selection with contact details
  - Warehouse selection for delivery
  - Priority levels (Low, Normal, High, Urgent)
  - Contact information and delivery method
  - Expected delivery date and notes
  
- **Step 2: Product Selection & Pricing**
  - Real-time product search and selection
  - Quantity and unit price management
  - Financial calculations (tax, shipping, discount)
  - Order summary with live totals
  - Item management (add/remove/modify)

- **Step 3: Review & Confirmation**
  - Complete order review
  - Final validation and submission
  - Error handling and user feedback

#### 3. PO Detail View (`PurchaseOrderDetail.jsx`)
- **Complete order information** with supplier and contact details
- **Line item management** with receiving status tracking
- **Status history** with audit trail
- **Receiving functionality** with partial receive support
- **Status workflow actions** based on current order state
- **PDF generation** and document management
- **Real-time updates** and status changes

### 🛠 Backend Implementation

#### Updated Database Schema
```sql
-- Enhanced status enum with 7-stage workflow
CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'sent', 'confirmed', 'partially_received', 
    'received', 'completed', 'cancelled'
);

-- New tracking fields
ALTER TABLE purchase_orders ADD COLUMN 
    sent_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    priority TEXT DEFAULT 'normal',
    contact_person TEXT,
    contact_email TEXT;

-- Status history table for audit trail
CREATE TABLE purchase_order_status_history (
    id UUID PRIMARY KEY,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    from_status purchase_order_status,
    to_status purchase_order_status,
    changed_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enhanced API Endpoints

**Core Operations:**
- `GET /api/v1/purchase-orders` - List with advanced filtering
- `GET /api/v1/purchase-orders/:id` - Get order details
- `POST /api/v1/purchase-orders` - Create new order
- `PUT /api/v1/purchase-orders/:id` - Update order (draft only)
- `DELETE /api/v1/purchase-orders/:id` - Delete order (draft only)

**Workflow Actions:**
- `POST /api/v1/purchase-orders/:id/send` - Send to supplier
- `POST /api/v1/purchase-orders/:id/confirm` - Confirm order
- `POST /api/v1/purchase-orders/:id/receive` - Full receive
- `POST /api/v1/purchase-orders/:id/partial-receive` - Partial receive
- `POST /api/v1/purchase-orders/:id/complete` - Complete order
- `POST /api/v1/purchase-orders/:id/cancel` - Cancel order

**Bulk Operations:**
- `POST /api/v1/purchase-orders/bulk-update` - Bulk update
- `POST /api/v1/purchase-orders/bulk-send` - Bulk send
- `POST /api/v1/purchase-orders/bulk-cancel` - Bulk cancel

**Additional Features:**
- `GET /api/v1/purchase-orders/:id/status-history` - Status history
- `GET /api/v1/purchase-orders/:id/pdf` - Generate PDF
- `GET /api/v1/purchase-orders/export` - Export data
- `GET /api/v1/purchase-orders/analytics` - Analytics data

### 🔒 Security & Authorization

- **Role-based access control (RBAC)**
  - Admin: Full access to all functions
  - Manager: Create, send, receive, complete orders
  - Purchaser: Create and manage draft orders
  - Warehouse Staff: Receive orders and update inventory

- **Row Level Security (RLS)**
  - Users can only access orders for their assigned warehouses
  - Admins have full access across all warehouses
  - Audit trail maintained for all status changes

### 📊 Integration Features

#### Inventory Integration
- **Automatic inventory updates** when receiving items
- **Stock movement tracking** for all received items
- **Real-time stock alerts** based on reorder points
- **Average cost calculations** using weighted average method

#### Supplier Integration
- **Supplier contact management** with email/phone
- **Payment terms and credit limits**
- **Performance tracking and ratings**
- **Automated email notifications**

### 🎨 User Interface Features

#### Modern Design
- **Clean, responsive interface** with Tailwind CSS
- **Color-coded status indicators** for quick visual reference
- **Interactive tables** with sorting and filtering
- **Modal dialogs** for complex actions
- **Toast notifications** for user feedback

#### User Experience
- **Intuitive workflow navigation** with clear action buttons
- **Real-time validation** and error handling
- **Loading states** and progress indicators
- **Mobile-responsive design** for tablet/phone access
- **Keyboard shortcuts** and accessibility features

## Technical Stack

### Frontend
- **React 18** with hooks and functional components
- **React Router v6** for client-side routing
- **React Query** for server state management
- **Tailwind CSS** for styling and responsive design
- **Heroicons** for consistent iconography
- **date-fns** for date formatting and manipulation

### Backend
- **Node.js** with Express.js framework
- **Supabase** for database and real-time features
- **PostgreSQL** with advanced queries and triggers
- **JWT authentication** with role-based access
- **Express Validator** for input validation

### Database Features
- **Automated triggers** for inventory updates
- **Computed columns** for calculated totals
- **Full-text search** capabilities
- **Audit trail** with status history tracking
- **Data integrity** with foreign key constraints

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Supabase account and project
- PostgreSQL database access

### Backend Setup
1. Navigate to backend directory
2. Install dependencies: `npm install`
3. Configure environment variables
4. Run database migrations: Execute `database_updates.sql`
5. Start server: `npm start`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Configure API endpoints in environment
4. Start development server: `npm run dev`

### Database Migration
Execute the provided SQL script to update your database schema:

```bash
# Run the database updates
psql -d your_database -f database_updates.sql

# Or via Supabase SQL editor
# Copy and paste contents of database_updates.sql
```

## API Usage Examples

### Create Purchase Order
```javascript
const orderData = {
  supplier_id: 'uuid-here',
  warehouse_id: 'uuid-here',
  priority: 'high',
  expected_delivery_date: '2024-01-15',
  items: [
    {
      product_id: 'product-uuid',
      quantity: 10,
      unit_price: 25.99
    }
  ],
  tax_rate: 8.5,
  shipping_cost: 15.00
};

const response = await apiClient.createPurchaseOrder(orderData);
```

### Receive Items
```javascript
const receiveData = {
  items: [
    {
      product_id: 'product-uuid',
      received_quantity: 8  // Partial receive
    }
  ],
  notes: 'Received shipment - 2 items damaged'
};

await apiClient.partiallyReceivePurchaseOrder(orderId, receiveData);
```

### Bulk Operations
```javascript
const bulkData = {
  orderIds: ['uuid1', 'uuid2', 'uuid3'],
  emailTemplate: {
    subject: 'Purchase Order Notification',
    message: 'Please review the attached purchase orders.'
  }
};

await apiClient.bulkSendPurchaseOrders(bulkData);
```

## Workflow Examples

### Complete Order Lifecycle

1. **Create Order** (Draft status)
   - User creates order via wizard
   - Order saved with 'draft' status
   - Can be edited and modified

2. **Send to Supplier** (Sent status)
   - Order sent via email to supplier
   - Status changed to 'sent'
   - No longer editable

3. **Supplier Confirmation** (Confirmed status)
   - Supplier confirms receipt and acceptance
   - Optional: Update delivery date and reference
   - Status changed to 'confirmed'

4. **Receive Items** (Partially Received/Received status)
   - Items received at warehouse
   - Inventory automatically updated
   - Status based on completion (partial/full)

5. **Complete Order** (Completed status)
   - All items received and processed
   - Order marked as completed
   - Archived for reporting

### Error Handling
```javascript
try {
  await apiClient.sendPurchaseOrder(orderId, emailData);
  toast.success('Purchase order sent successfully');
} catch (error) {
  toast.error(error.message || 'Failed to send purchase order');
}
```

## Testing the System

### Manual Testing Checklist

#### Order Creation
- [ ] Create order with all required fields
- [ ] Add multiple items with different quantities/prices
- [ ] Test validation for required fields
- [ ] Verify total calculations (tax, shipping, discount)
- [ ] Test wizard navigation (next/previous/cancel)

#### Status Workflow
- [ ] Send draft order to supplier
- [ ] Confirm sent order
- [ ] Partial receive items
- [ ] Complete receive remaining items
- [ ] Complete the order
- [ ] Cancel order at different stages

#### Bulk Operations
- [ ] Select multiple orders
- [ ] Bulk send orders
- [ ] Bulk cancel orders
- [ ] Verify individual error handling

#### Filtering & Search
- [ ] Filter by status, supplier, warehouse
- [ ] Search by order number and reference
- [ ] Test date range filtering
- [ ] Verify sorting functionality

#### Permissions
- [ ] Test different user roles
- [ ] Verify access restrictions
- [ ] Test warehouse-based access

### Integration Testing
- Inventory updates when receiving items
- Stock movement creation
- Email notifications (if configured)
- PDF generation
- Status history tracking

## Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify Supabase credentials
- Check RLS policies are correctly applied
- Ensure user has proper permissions

**Status Transition Errors**
- Check current order status
- Verify user has required permissions
- Review workflow business logic

**Inventory Update Failures**
- Check product exists in catalog
- Verify warehouse assignments
- Review stock movement triggers

**Email Sending Issues**
- Configure email service integration
- Verify supplier email addresses
- Check email templates and formatting

### Performance Optimization

**Database Queries**
- Indexes on frequently queried columns
- Pagination for large datasets
- Efficient JOIN operations

**Frontend Performance**
- React Query caching
- Lazy loading for large lists
- Debounced search inputs
- Optimistic updates

## Future Enhancements

### Planned Features
- **Advanced reporting** with charts and analytics
- **Email template customization** for different suppliers
- **Mobile app** for warehouse staff
- **Barcode scanning** for receiving items
- **Integration APIs** for external systems
- **Automated reordering** based on stock levels

### Technical Improvements
- **Real-time notifications** via WebSocket
- **Advanced search** with Elasticsearch
- **File attachment support** for orders
- **Digital signature** capabilities
- **Multi-language support** (i18n)
- **Dark mode** UI theme

## Contributing

When contributing to the Purchase Order system:

1. Follow the existing code patterns and naming conventions
2. Add proper error handling and validation
3. Include unit tests for new functionality
4. Update documentation for API changes
5. Test all workflow scenarios thoroughly
6. Consider security implications of changes

## Support

For issues or questions regarding the Purchase Order Management System:
- Check the troubleshooting section above
- Review API documentation and examples
- Test with the provided sample data
- Verify database schema is correctly applied

The system is designed to be robust and handle edge cases, but proper testing is essential when deploying to production environments.

---

## Summary

This Purchase Order Management System provides a complete solution for managing procurement workflows with:

✅ **7-stage workflow** with proper state management  
✅ **Comprehensive UI** with list, creation wizard, and detail views  
✅ **Bulk operations** for efficiency at scale  
✅ **Real-time inventory integration** with automatic updates  
✅ **Role-based security** with proper access controls  
✅ **Modern, responsive design** optimized for all devices  
✅ **Complete API** with extensive functionality  
✅ **Audit trail** and status history tracking  
✅ **Export and reporting** capabilities  
✅ **Robust error handling** and user feedback  

The system is production-ready and integrates seamlessly with the existing IMS infrastructure while providing a professional and intuitive user experience for managing purchase orders from creation to completion.