const WebSocket = require('ws');
const { logBusinessEvent } = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of user ID to WebSocket connections
    this.subscriptions = new Map(); // Map of subscription types to client sets
  }

  // Initialize WebSocket server
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log('WebSocket server initialized on /ws');
  }

  // Verify client connection (authentication check)
  verifyClient(info) {
    // Extract token from query string or headers
    const url = new URL(info.req.url, 'http://localhost');
    const token = url.searchParams.get('token') || info.req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return false;
    }

    try {
      // Verify JWT token (simplified - in production, use proper JWT verification)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      return false;
    }
  }

  // Handle new WebSocket connection
  handleConnection(ws, req) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Store client connection
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Set up client metadata
    ws.userId = userId;
    ws.userRole = userRole;
    ws.subscriptions = new Set();
    ws.isAlive = true;

    console.log(`WebSocket client connected: ${userId} (${userRole})`);

    // Set up message handlers
    ws.on('message', (message) => this.handleClientMessage(ws, message));
    ws.on('close', () => this.handleClientDisconnect(ws));
    ws.on('error', (error) => this.handleClientError(ws, error));
    ws.on('pong', () => { ws.isAlive = true; });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      userId: userId
    });

    logBusinessEvent('WEBSOCKET_CLIENT_CONNECTED', userId, { userRole });
  }

  // Handle messages from clients
  handleClientMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(ws, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(ws, data);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          this.sendToClient(ws, { type: 'error', message: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, { type: 'error', message: 'Invalid message format' });
    }
  }

  // Handle client subscriptions
  handleSubscription(ws, data) {
    const { subscription, filters = {} } = data;
    
    // Validate subscription type
    const validSubscriptions = [
      'inventory_updates',
      'low_stock_alerts',
      'purchase_order_updates',
      'stock_movements',
      'dashboard_metrics'
    ];

    if (!validSubscriptions.includes(subscription)) {
      this.sendToClient(ws, { 
        type: 'subscription_error', 
        message: 'Invalid subscription type' 
      });
      return;
    }

    // Check permissions
    if (!this.hasSubscriptionPermission(ws.userRole, subscription)) {
      this.sendToClient(ws, { 
        type: 'subscription_error', 
        message: 'Insufficient permissions' 
      });
      return;
    }

    // Add to subscription
    if (!this.subscriptions.has(subscription)) {
      this.subscriptions.set(subscription, new Set());
    }
    
    this.subscriptions.get(subscription).add(ws);
    ws.subscriptions.add(subscription);

    // Store filters for this subscription
    if (!ws.subscriptionFilters) {
      ws.subscriptionFilters = new Map();
    }
    ws.subscriptionFilters.set(subscription, filters);

    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      subscription: subscription,
      filters: filters
    });

    console.log(`Client ${ws.userId} subscribed to ${subscription}`);
  }

  // Handle client unsubscriptions
  handleUnsubscription(ws, data) {
    const { subscription } = data;
    
    if (this.subscriptions.has(subscription)) {
      this.subscriptions.get(subscription).delete(ws);
    }
    
    ws.subscriptions.delete(subscription);
    
    if (ws.subscriptionFilters) {
      ws.subscriptionFilters.delete(subscription);
    }

    this.sendToClient(ws, {
      type: 'unsubscription_confirmed',
      subscription: subscription
    });
  }

  // Check if user has permission for subscription
  hasSubscriptionPermission(userRole, subscription) {
    const permissions = {
      'inventory_updates': ['admin', 'manager', 'warehouse_staff'],
      'low_stock_alerts': ['admin', 'manager', 'warehouse_staff', 'purchaser'],
      'purchase_order_updates': ['admin', 'manager', 'purchaser'],
      'stock_movements': ['admin', 'manager', 'warehouse_staff'],
      'dashboard_metrics': ['admin', 'manager']
    };

    return permissions[subscription]?.includes(userRole) || false;
  }

  // Handle client disconnect
  handleClientDisconnect(ws) {
    const userId = ws.userId;
    
    // Remove from client connections
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remove from all subscriptions
    for (const subscription of ws.subscriptions) {
      if (this.subscriptions.has(subscription)) {
        this.subscriptions.get(subscription).delete(ws);
      }
    }

    console.log(`WebSocket client disconnected: ${userId}`);
    logBusinessEvent('WEBSOCKET_CLIENT_DISCONNECTED', userId);
  }

  // Handle client errors
  handleClientError(ws, error) {
    console.error(`WebSocket client error for ${ws.userId}:`, error);
  }

  // Send message to specific client
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  // Send message to all clients subscribed to a topic
  broadcastToSubscription(subscription, data, filters = {}) {
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    const clients = this.subscriptions.get(subscription);
    let sentCount = 0;

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // Apply filters if specified
        if (this.matchesFilters(data, ws.subscriptionFilters?.get(subscription), filters)) {
          this.sendToClient(ws, {
            type: subscription,
            data: data,
            timestamp: new Date().toISOString()
          });
          sentCount++;
        }
      } else {
        // Clean up dead connections
        clients.delete(ws);
      }
    }

    console.log(`Broadcasted ${subscription} to ${sentCount} clients`);
  }

  // Check if data matches client filters
  matchesFilters(data, clientFilters, broadcastFilters) {
    if (!clientFilters) return true;

    // Check warehouse filter
    if (clientFilters.warehouse_id && data.warehouse_id && 
        clientFilters.warehouse_id !== data.warehouse_id) {
      return false;
    }

    // Check product filter
    if (clientFilters.product_id && data.product_id && 
        clientFilters.product_id !== data.product_id) {
      return false;
    }

    // Check other broadcast filters
    if (broadcastFilters.userRole && clientFilters.userRole && 
        !broadcastFilters.userRole.includes(clientFilters.userRole)) {
      return false;
    }

    return true;
  }

  // Broadcast inventory update
  broadcastInventoryUpdate(inventoryData) {
    this.broadcastToSubscription('inventory_updates', {
      product_id: inventoryData.product_id,
      warehouse_id: inventoryData.warehouse_id,
      current_stock: inventoryData.current_stock,
      available_stock: inventoryData.available_stock,
      reserved_stock: inventoryData.reserved_stock,
      last_movement_date: inventoryData.last_movement_date,
      product_name: inventoryData.products?.name,
      warehouse_name: inventoryData.warehouses?.name
    });
  }

  // Broadcast low stock alert
  broadcastLowStockAlert(alertData) {
    this.broadcastToSubscription('low_stock_alerts', {
      alert_id: alertData.id,
      product_id: alertData.product_id,
      warehouse_id: alertData.warehouse_id,
      alert_type: alertData.alert_type,
      current_stock: alertData.current_stock,
      available_stock: alertData.available_stock,
      reorder_level: alertData.reorder_level,
      priority: alertData.priority,
      product_name: alertData.products?.name,
      warehouse_name: alertData.warehouses?.name
    });
  }

  // Broadcast purchase order update
  broadcastPurchaseOrderUpdate(orderData) {
    this.broadcastToSubscription('purchase_order_updates', {
      order_id: orderData.id,
      order_number: orderData.order_number,
      supplier_id: orderData.supplier_id,
      warehouse_id: orderData.warehouse_id,
      status: orderData.status,
      total: orderData.total,
      supplier_name: orderData.suppliers?.name,
      warehouse_name: orderData.warehouses?.name
    });
  }

  // Broadcast stock movement
  broadcastStockMovement(movementData) {
    this.broadcastToSubscription('stock_movements', {
      movement_id: movementData.id,
      product_id: movementData.product_id,
      warehouse_id: movementData.warehouse_id,
      movement_type: movementData.movement_type,
      quantity: movementData.quantity,
      previous_stock: movementData.previous_stock,
      new_stock: movementData.new_stock,
      reference: movementData.reference,
      product_name: movementData.products?.name,
      warehouse_name: movementData.warehouses?.name
    });
  }

  // Broadcast dashboard metrics update
  broadcastDashboardMetrics(metricsData) {
    this.broadcastToSubscription('dashboard_metrics', metricsData);
  }

  // Send message to specific user
  sendToUser(userId, data) {
    if (this.clients.has(userId)) {
      const userConnections = this.clients.get(userId);
      for (const ws of userConnections) {
        this.sendToClient(ws, data);
      }
    }
  }

  // Get connected clients count
  getConnectedClientsCount() {
    let totalConnections = 0;
    for (const connections of this.clients.values()) {
      totalConnections += connections.size;
    }
    return totalConnections;
  }

  // Get subscription statistics
  getSubscriptionStats() {
    const stats = {};
    for (const [subscription, clients] of this.subscriptions.entries()) {
      stats[subscription] = clients.size;
    }
    return stats;
  }

  // Health check ping to all clients
  pingClients() {
    let aliveCount = 0;
    let deadCount = 0;

    for (const [userId, connections] of this.clients.entries()) {
      for (const ws of connections) {
        if (ws.isAlive === false) {
          ws.terminate();
          connections.delete(ws);
          deadCount++;
        } else {
          ws.isAlive = false;
          ws.ping();
          aliveCount++;
        }
      }
      
      // Clean up empty connection sets
      if (connections.size === 0) {
        this.clients.delete(userId);
      }
    }

    console.log(`WebSocket health check: ${aliveCount} alive, ${deadCount} terminated`);
    return { alive: aliveCount, terminated: deadCount };
  }

  // Start periodic health checks
  startHealthChecks() {
    setInterval(() => {
      this.pingClients();
    }, 30000); // Every 30 seconds
  }
}

module.exports = new WebSocketService();