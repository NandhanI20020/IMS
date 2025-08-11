# Real-Time Inventory Management System

This document provides comprehensive documentation for the enhanced real-time inventory management system with multi-warehouse support, automatic costing methods (FIFO/LIFO/Average), and real-time updates via WebSocket.

## 🚀 Features

### Core Functionality
- **Real-time stock level updates** with transaction integrity
- **Multi-warehouse inventory management**
- **Automatic reorder point checking** and alert generation
- **Advanced costing methods**: FIFO, LIFO, and Weighted Average
- **Stock reservation system** for pending orders
- **Bulk operations** with optimized performance
- **Complete audit trail** for all inventory changes
- **Real-time WebSocket notifications**

### Business Logic
- Prevents negative inventory (configurable)
- Reserved quantity tracking for pending orders
- Automatic supplier reorder suggestions
- Multi-warehouse stock allocation
- Batch processing for bulk updates
- Real-time dashboard metrics

## 📊 Performance Capabilities

- **1000+ concurrent stock updates** with conflict resolution
- **Real-time dashboard updates** via WebSocket
- **Efficient bulk operations** with batch processing
- **Database transaction integrity** with row-level locking
- **Automatic cleanup** of expired reservations

## 🏗️ Architecture

### Services
- `realTimeInventoryService.js` - Core inventory management with real-time capabilities
- `webSocketService.js` - WebSocket server for real-time notifications
- `emailService.js` - Email notifications for alerts

### Controllers
- `realTimeInventoryController.js` - HTTP API endpoints for inventory operations

### Routes
- `realTimeInventory.js` - Real-time inventory API routes

### Database Schema
- Enhanced inventory tables with real-time fields
- Cost layers for FIFO/LIFO costing
- Stock reservations and transfers
- Reorder alerts and audit trails

## 🔌 API Endpoints

### Real-Time Stock Management

#### Update Stock
```http
PUT /api/v1/inventory/realtime/update-stock
Content-Type: application/json
Authorization: Bearer <token>

{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "quantity_change": 100,
  "movement_type": "purchase_receive",
  "unit_cost": 12.50,
  "costing_method": "FIFO",
  "reference": "PO-2024-001",
  "reason": "Purchase order received"
}
```

#### Transfer Stock Between Warehouses
```http
POST /api/v1/inventory/realtime/transfer
Content-Type: application/json
Authorization: Bearer <token>

{
  "product_id": "uuid",
  "from_warehouse_id": "uuid",
  "to_warehouse_id": "uuid",
  "quantity": 50,
  "reason": "Warehouse rebalancing",
  "costing_method": "AVERAGE"
}
```

#### Bulk Stock Updates
```http
POST /api/v1/inventory/realtime/bulk-update
Content-Type: application/json
Authorization: Bearer <token>

{
  "updates": [
    {
      "product_id": "uuid",
      "warehouse_id": "uuid",
      "quantity_change": 25,
      "movement_type": "adjustment_increase",
      "unit_cost": 10.00,
      "reason": "Physical count adjustment"
    }
  ]
}
```

#### Stock Adjustment
```http
POST /api/v1/inventory/realtime/adjustment
Content-Type: application/json
Authorization: Bearer <token>

{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "adjustment_type": "increase",
  "quantity": 10,
  "reason": "Found additional stock",
  "unit_cost": 15.00
}
```

#### Reserve Stock
```http
POST /api/v1/inventory/realtime/reserve
Content-Type: application/json
Authorization: Bearer <token>

{
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "quantity": 5,
  "reference": "ORDER-2024-001",
  "reason": "Customer order"
}
```

#### Release Reserved Stock
```http
DELETE /api/v1/inventory/realtime/reserve/{reservationId}
Authorization: Bearer <token>
```

### Reporting and Analytics

#### Get Real-Time Status
```http
GET /api/v1/inventory/realtime/status?warehouse_id=uuid&low_stock_only=true
Authorization: Bearer <token>
```

#### Get Stock Movements
```http
GET /api/v1/inventory/realtime/movements/{productId}?warehouse_id=uuid&startDate=2024-01-01
Authorization: Bearer <token>
```

#### Get Inventory Valuation
```http
GET /api/v1/inventory/realtime/valuation?costing_method=FIFO&format=json
Authorization: Bearer <token>
```

#### Get Low Stock Alerts
```http
GET /api/v1/inventory/realtime/alerts?status=pending&warehouse_id=uuid
Authorization: Bearer <token>
```

#### Update Alert Status
```http
PUT /api/v1/inventory/realtime/alerts/{alertId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "acknowledged",
  "notes": "Purchase order created"
}
```

#### Get Inventory Analytics
```http
GET /api/v1/inventory/realtime/analytics?period=30d&warehouse_id=uuid
Authorization: Bearer <token>
```

## 🔄 WebSocket Real-Time Updates

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=your-jwt-token');

ws.onopen = () => {
  console.log('Connected to real-time inventory updates');
};
```

### Subscriptions
```javascript
// Subscribe to inventory updates
ws.send(JSON.stringify({
  type: 'subscribe',
  subscription: 'inventory_updates',
  filters: {
    warehouse_id: 'uuid' // Optional filter
  }
}));

// Subscribe to low stock alerts
ws.send(JSON.stringify({
  type: 'subscribe',
  subscription: 'low_stock_alerts',
  filters: {
    warehouse_id: 'uuid'
  }
}));

// Subscribe to stock movements
ws.send(JSON.stringify({
  type: 'subscribe',
  subscription: 'stock_movements'
}));

// Subscribe to purchase order updates
ws.send(JSON.stringify({
  type: 'subscribe',
  subscription: 'purchase_order_updates'
}));

// Subscribe to dashboard metrics
ws.send(JSON.stringify({
  type: 'subscribe',
  subscription: 'dashboard_metrics'
}));
```

### Receiving Updates
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'inventory_updates':
      console.log('Inventory updated:', message.data);
      updateInventoryDisplay(message.data);
      break;
      
    case 'low_stock_alerts':
      console.log('Low stock alert:', message.data);
      showLowStockNotification(message.data);
      break;
      
    case 'stock_movements':
      console.log('Stock movement:', message.data);
      updateMovementHistory(message.data);
      break;
      
    case 'dashboard_metrics':
      console.log('Dashboard metrics:', message.data);
      updateDashboard(message.data);
      break;
  }
};
```

## 💾 Database Schema

### Enhanced Inventory Table
```sql
-- Core inventory with real-time fields
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS available_stock INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS weighted_avg_cost DECIMAL(12,4) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_movement_date TIMESTAMPTZ;
```

### Stock Reservations
```sql
CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity INTEGER NOT NULL,
    reference VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cost Layers (FIFO/LIFO)
```sql
CREATE TABLE inventory_cost_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    original_quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12,4) NOT NULL,
    received_date TIMESTAMPTZ DEFAULT NOW()
);
```

### Reorder Alerts
```sql
CREATE TABLE reorder_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    current_stock INTEGER NOT NULL,
    reorder_level INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔐 Authentication & Authorization

### Required Roles
- **admin**: Full access to all inventory operations
- **manager**: Access to most operations, limited admin functions
- **warehouse_staff**: Stock updates, transfers, adjustments
- **sales_staff**: Stock reservations and releases
- **purchaser**: Purchase order related operations

### WebSocket Authentication
WebSocket connections require JWT token authentication via query parameter or authorization header.

## ⚡ Performance Optimization

### Concurrent Updates
- Row-level locking prevents race conditions
- Pending updates map prevents concurrent modifications
- Bulk operations are batched for efficiency

### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_inventory_available_stock ON inventory(available_stock);
CREATE INDEX idx_inventory_reorder_level ON inventory(current_stock, reorder_level);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_cost_layers_remaining_qty ON inventory_cost_layers(remaining_quantity);
```

### Caching & Throttling
- Alert throttling prevents spam (1 hour cooldown)
- WebSocket health checks every 30 seconds
- Expired reservations cleaned up automatically

## 🚨 Error Handling

### Common Error Codes
- `INSUFFICIENT_STOCK`: Not enough available stock
- `CONCURRENT_UPDATE_ERROR`: Another update in progress
- `INVALID_COSTING_METHOD`: Invalid costing method specified
- `RESERVATION_NOT_FOUND`: Stock reservation not found
- `WAREHOUSE_NOT_FOUND`: Invalid warehouse ID

### Error Response Format
```json
{
  "success": false,
  "message": "Insufficient stock. Available: 10, Requested: 25",
  "code": "INSUFFICIENT_STOCK",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📈 Monitoring & Health Checks

### Health Check Endpoint
```http
GET /api/v1/inventory/realtime/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "healthy",
      "real_time_updates": "healthy",
      "reorder_alerts": "healthy"
    },
    "performance": {
      "pending_updates": 0,
      "reorder_queue_size": 0,
      "websocket_connections": 15
    }
  }
}
```

## 🔧 Configuration

### Environment Variables
```env
# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# Email (for alerts)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASSWORD=your-password

# WebSocket
WS_PORT=3000
```

### Costing Methods
- **FIFO**: First In, First Out - oldest costs first
- **LIFO**: Last In, First Out - newest costs first
- **AVERAGE**: Weighted average cost

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Database Migrations**
   ```bash
   # Apply the real-time inventory schema
   psql -d your_database -f database/real_time_inventory_schema.sql
   ```

4. **Start the Server**
   ```bash
   npm run dev
   ```

5. **Test WebSocket Connection**
   ```javascript
   const ws = new WebSocket('ws://localhost:3000/ws?token=your-token');
   ws.onopen = () => console.log('Connected!');
   ```

## 📝 Usage Examples

### JavaScript Client Example
```javascript
class InventoryManager {
  constructor(apiUrl, wsUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.ws = new WebSocket(`${wsUrl}?token=${token}`);
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.ws.onopen = () => {
      // Subscribe to real-time updates
      this.subscribe('inventory_updates');
      this.subscribe('low_stock_alerts');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleRealtimeUpdate(message);
    };
  }

  async updateStock(productId, warehouseId, quantityChange, movementType) {
    const response = await fetch(`${this.apiUrl}/inventory/realtime/update-stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_change: quantityChange,
        movement_type: movementType
      })
    });

    return response.json();
  }

  subscribe(subscription) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      subscription: subscription
    }));
  }

  handleRealtimeUpdate(message) {
    switch (message.type) {
      case 'inventory_updates':
        this.updateInventoryDisplay(message.data);
        break;
      case 'low_stock_alerts':
        this.showLowStockAlert(message.data);
        break;
    }
  }
}

// Usage
const inventory = new InventoryManager(
  'http://localhost:3000/api/v1',
  'ws://localhost:3000/ws',
  'your-jwt-token'
);
```

This real-time inventory management system provides enterprise-grade functionality with high performance, real-time updates, and comprehensive audit trails for multi-warehouse operations.