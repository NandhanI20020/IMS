const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const { dbService } = require('./config/database');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');
const webSocketService = require('./services/webSocketService');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const realTimeInventoryRoutes = require('./routes/realTimeInventory');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const categoryRoutes = require('./routes/categories');
const warehouseRoutes = require('./routes/warehouses');
const supplierRoutes = require('./routes/suppliers');
const reportRoutes = require('./routes/reports');
const testRoutes = require('./routes/test');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.server.nodeEnv === 'development' ? 5000 : config.rateLimit.maxRequests, // More permissive in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and OPTIONS requests
    return req.path === '/health' || req.method === 'OPTIONS';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
      },
      timestamp: new Date().toISOString()
    });
  }
});
app.use('/api', limiter);

// CORS
const allowedOrigins = config.cors.origins || [
  'https://ims-git-main-nandhan-venkadesh-as-projects.vercel.app',
  'https://ims-jii8j45g3-nandhan-venkadesh-as-projects.vercel.app',
  'https://ims-ruby.vercel.app',
  'http://localhost:3001'
];
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  let corsOptions;
  if (!origin) {
    corsOptions = { origin: true, credentials: true };
  } else if (
    allowedOrigins.includes(origin) ||
    /\.vercel\.app$/.test(new URL(origin).hostname)
  ) {
    corsOptions = {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
// Explicitly handle preflight
app.options('*', cors(corsOptionsDelegate));

// Compression
app.use(compression());

// Request logging
if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbService.healthCheck();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.nodeEnv,
      database: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
const apiVersion = config.server.apiVersion;
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/products`, productRoutes);
app.use(`/api/${apiVersion}/inventory`, inventoryRoutes);
app.use(`/api/${apiVersion}/inventory/realtime`, realTimeInventoryRoutes);
app.use(`/api/${apiVersion}/purchase-orders`, purchaseOrderRoutes);
app.use(`/api/${apiVersion}/categories`, categoryRoutes);
app.use(`/api/${apiVersion}/warehouses`, warehouseRoutes);
app.use(`/api/${apiVersion}/suppliers`, supplierRoutes);
app.use(`/api/${apiVersion}/reports`, reportRoutes);
app.use(`/api/${apiVersion}/test`, testRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Inventory Management System API',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.nodeEnv,
    documentation: '/api/docs',
    health: '/health'
  });
});

// API documentation placeholder
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    version: apiVersion,
    endpoints: {
      auth: `/api/${apiVersion}/auth`,
      products: `/api/${apiVersion}/products`,
      inventory: `/api/${apiVersion}/inventory`,
      purchaseOrders: `/api/${apiVersion}/purchase-orders`,
      categories: `/api/${apiVersion}/categories`,
      warehouses: `/api/${apiVersion}/warehouses`,
      suppliers: `/api/${apiVersion}/suppliers`,
      reports: `/api/${apiVersion}/reports`
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server
const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${apiVersion}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🔄 WebSocket URL: ws://localhost:${PORT}/ws`);
});

// Initialize WebSocket service
webSocketService.initialize(server);
webSocketService.startHealthChecks();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;