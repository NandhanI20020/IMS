const config = require('../config/config');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Supabase errors
const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);

  // Handle specific Supabase error codes
  switch (error.code) {
    case 'PGRST116':
      return new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    case 'PGRST301':
      return new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    case '23505':
      return new AppError('Duplicate entry', 409, 'DUPLICATE_ENTRY');
    case '23503':
      return new AppError('Referenced resource does not exist', 400, 'FOREIGN_KEY_VIOLATION');
    case '23514':
      return new AppError('Data validation failed', 400, 'CHECK_VIOLATION');
    case 'auth':
      return new AppError('Authentication failed', 401, 'AUTH_ERROR');
    default:
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }
};

// Handle JWT errors
const handleJWTError = () => new AppError('Invalid token', 401, 'INVALID_TOKEN');
const handleJWTExpiredError = () => new AppError('Token expired', 401, 'TOKEN_EXPIRED');

// Handle validation errors
const handleValidationError = (error) => {
  const errors = error.array().map(err => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value
  }));

  return new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    errorCode: err.errorCode
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Global error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.server.nodeEnv === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.code) {
      error = handleSupabaseError(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    if (error.array && typeof error.array === 'function') {
      error = handleValidationError(error);
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection:', err.message);
  console.log('Shutting down the server due to unhandled promise rejection');
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  console.log('Shutting down the server due to uncaught exception');
  process.exit(1);
});

module.exports = {
  AppError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  handleSupabaseError,
  handleValidationError
};