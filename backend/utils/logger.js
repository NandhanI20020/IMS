const winston = require('winston');
const config = require('../config/config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create logger
const logger = winston.createLogger({
  level: config.server.nodeEnv === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Create request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    const message = `${method} ${url} ${statusCode} ${duration}ms - ${ip}`;
    
    if (statusCode >= 400) {
      logger.error(message);
    } else {
      logger.http(message);
    }
  });
  
  next();
};

// Database operation logger
const logDatabaseOperation = (operation, table, userId = null, data = null) => {
  const logData = {
    operation,
    table,
    userId,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    logData.data = data;
  }
  
  logger.info(`DB Operation: ${JSON.stringify(logData)}`);
};

// API error logger
const logApiError = (error, req) => {
  const logData = {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };
  
  logger.error(`API Error: ${JSON.stringify(logData)}`);
};

// Security event logger
const logSecurityEvent = (event, userId = null, details = {}) => {
  const logData = {
    securityEvent: event,
    userId,
    details,
    timestamp: new Date().toISOString()
  };
  
  logger.warn(`Security Event: ${JSON.stringify(logData)}`);
};

// Business logic logger
const logBusinessEvent = (event, userId, data = {}) => {
  const logData = {
    businessEvent: event,
    userId,
    data,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`Business Event: ${JSON.stringify(logData)}`);
};

module.exports = {
  logger,
  requestLogger,
  logDatabaseOperation,
  logApiError,
  logSecurityEvent,
  logBusinessEvent
};