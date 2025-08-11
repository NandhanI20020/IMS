const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Pagination helper
const getPagination = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    from: offset,
    to: offset + limit - 1,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

// Format pagination response
const formatPaginatedResponse = (data, count, page, limit) => {
  const totalPages = Math.ceil(count / limit);
  
  return {
    data,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: count,
      itemsPerPage: parseInt(limit),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Generate unique identifier
const generateId = () => uuidv4();

// Generate SKU
const generateSKU = (prefix = 'PRD', length = 8) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, length);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

// Generate PO number
const generatePONumber = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `PO-${year}-${timestamp}`;
};

// Sanitize object for logging (remove sensitive fields)
const sanitizeForLogging = (obj, sensitiveFields = ['password', 'token', 'secret', 'key']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key]);
    });
    return copy;
  }
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

// Calculate date range
const getDateRange = (period) => {
  const now = moment();
  
  switch (period) {
    case 'today':
      return {
        start: now.startOf('day').toISOString(),
        end: now.endOf('day').toISOString()
      };
    case 'week':
      return {
        start: now.startOf('week').toISOString(),
        end: now.endOf('week').toISOString()
      };
    case 'month':
      return {
        start: now.startOf('month').toISOString(),
        end: now.endOf('month').toISOString()
      };
    case 'quarter':
      return {
        start: now.startOf('quarter').toISOString(),
        end: now.endOf('quarter').toISOString()
      };
    case 'year':
      return {
        start: now.startOf('year').toISOString(),
        end: now.endOf('year').toISOString()
      };
    default:
      return {
        start: now.subtract(30, 'days').toISOString(),
        end: now.toISOString()
      };
  }
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

// Generate random string
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Slugify string
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Parse sort parameter
const parseSort = (sortParam) => {
  if (!sortParam) return { column: 'created_at', ascending: false };
  
  const [column, direction] = sortParam.split(':');
  
  return {
    column: column || 'created_at',
    ascending: direction === 'asc'
  };
};

// Build filter query for Supabase
const buildFilterQuery = (query, filters) => {
  let filteredQuery = query;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        filteredQuery = filteredQuery.in(key, value);
      } else if (typeof value === 'object' && value.operator) {
        switch (value.operator) {
          case 'gte':
            filteredQuery = filteredQuery.gte(key, value.value);
            break;
          case 'lte':
            filteredQuery = filteredQuery.lte(key, value.value);
            break;
          case 'gt':
            filteredQuery = filteredQuery.gt(key, value.value);
            break;
          case 'lt':
            filteredQuery = filteredQuery.lt(key, value.value);
            break;
          case 'like':
            filteredQuery = filteredQuery.ilike(key, `%${value.value}%`);
            break;
          default:
            filteredQuery = filteredQuery.eq(key, value.value);
        }
      } else {
        filteredQuery = filteredQuery.eq(key, value);
      }
    }
  });
  
  return filteredQuery;
};

// Calculate inventory value
const calculateInventoryValue = (quantity, costPrice) => {
  return parseFloat((quantity * costPrice).toFixed(2));
};

// Format response data
const formatResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

// Error response helper
const formatError = (message, statusCode = 500, errorCode = null) => {
  return {
    success: false,
    error: {
      message,
      statusCode,
      errorCode
    },
    timestamp: new Date().toISOString()
  };
};

// Async retry helper
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay);
    }
    throw error;
  }
};

module.exports = {
  getPagination,
  formatPaginatedResponse,
  generateId,
  generateSKU,
  generatePONumber,
  sanitizeForLogging,
  deepClone,
  formatCurrency,
  formatDate,
  getDateRange,
  isValidEmail,
  isValidPhone,
  generateRandomString,
  slugify,
  parseSort,
  buildFilterQuery,
  calculateInventoryValue,
  formatResponse,
  formatError,
  retry
};