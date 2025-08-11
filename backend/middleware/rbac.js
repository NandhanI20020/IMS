const { AppError } = require('./errorHandler');

// Role hierarchy and permissions
const ROLES = {
  admin: {
    level: 3,
    permissions: ['*'] // Admin has all permissions
  },
  manager: {
    level: 2,
    permissions: [
      'users.read',
      'products.*',
      'categories.*',
      'suppliers.*',
      'inventory.*',
      'purchase_orders.*',
      'reports.*',
      'warehouses.read',
      'warehouses.update' // Can update their own warehouse
    ]
  },
  user: {
    level: 1,
    permissions: [
      'products.read',
      'categories.read',
      'suppliers.read',
      'inventory.read',
      'purchase_orders.read',
      'reports.read',
      'warehouses.read'
    ]
  }
};

// Check if user has required role
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Check if user has minimum role level
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRoleLevel = ROLES[req.user.role]?.level || 0;
    const requiredLevel = ROLES[minRole]?.level || 0;

    if (userRoleLevel < requiredLevel) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRole = req.user.role;
    const userPermissions = ROLES[userRole]?.permissions || [];

    // Admin has all permissions
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check exact permission
    if (userPermissions.includes(permission)) {
      return next();
    }

    // Check wildcard permissions
    const permissionParts = permission.split('.');
    for (let i = permissionParts.length - 1; i >= 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*';
      if (userPermissions.includes(wildcardPermission)) {
        return next();
      }
    }

    return next(new AppError('Insufficient permissions', 403));
  };
};

// Check warehouse access
const requireWarehouseAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  // Admin has access to all warehouses
  if (req.user.role === 'admin') {
    return next();
  }

  const warehouseId = req.params.warehouseId || req.body.warehouse_id || req.query.warehouse_id;

  // If no warehouse specified, allow (will be filtered by RLS)
  if (!warehouseId) {
    return next();
  }

  // Check if user has access to the specific warehouse
  if (req.user.warehouseId && parseInt(warehouseId) !== req.user.warehouseId) {
    return next(new AppError('Access denied to this warehouse', 403));
  }

  next();
};

// Check if user can modify resource they created
const requireOwnershipOrRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Allow if user has required role
    if (roles.includes(req.user.role)) {
      return next();
    }

    // For ownership check, we'll need to verify in the controller
    // as we need to fetch the resource first
    req.requireOwnership = true;
    next();
  };
};

// Warehouse manager specific middleware
const requireWarehouseManager = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'manager') {
    return next(new AppError('Manager role required', 403));
  }

  // Managers can only manage their assigned warehouse
  const warehouseId = req.params.warehouseId || req.body.warehouse_id;
  if (warehouseId && parseInt(warehouseId) !== req.user.warehouseId) {
    return next(new AppError('Can only manage assigned warehouse', 403));
  }

  next();
};

// Check if user has permission based on resource and action
const checkResourcePermission = (resource, action) => {
  return requirePermission(`${resource}.${action}`);
};

// Middleware to add user context for RLS
const addUserContext = (req, res, next) => {
  if (req.user) {
    // Add user context that can be used in database queries
    req.userContext = {
      userId: req.user.id,
      role: req.user.role,
      warehouseId: req.user.warehouseId
    };
  }
  next();
};

module.exports = {
  ROLES,
  requireRole,
  requireMinRole,
  requirePermission,
  requireWarehouseAccess,
  requireOwnershipOrRole,
  requireWarehouseManager,
  checkResourcePermission,
  addUserContext
};