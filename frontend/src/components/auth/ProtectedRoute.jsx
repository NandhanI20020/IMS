import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  fallback = null,
  redirectTo = '/login'
}) => {
  const { 
    user, 
    userProfile, 
    loading, 
    sessionLoading, 
    isAuthenticated,
    hasRole,
    hasPermission 
  } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading || sessionLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If authentication is not required and user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is authenticated but profile is not loaded yet
  if (isAuthenticated && !userProfile && (requiredRoles.length > 0 || requiredPermissions.length > 0)) {
    return <LoadingSpinner fullScreen text="Loading user profile..." />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    if (fallback) {
      return fallback;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="card-body text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-error-100 mb-4">
                <svg
                  className="h-6 w-6 text-error-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c.37 0 .606-.394.486-.74L13.938 4.24c-.12-.346-.464-.346-.584 0L8.87 16.26c-.12.346.116.74.486.74z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You don't have permission to access this page. 
                {requiredRoles.length === 1 
                  ? ` Required role: ${requiredRoles[0]}`
                  : ` Required roles: ${requiredRoles.join(', ')}`
                }
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => window.history.back()}
                  className="btn-secondary w-full"
                >
                  Go Back
                </button>
                <Navigate to="/dashboard" className="btn-primary w-full">
                  Go to Dashboard
                </Navigate>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    
    if (!hasAllPermissions) {
      if (fallback) {
        return fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full">
            <div className="card">
              <div className="card-body text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-error-100 mb-4">
                  <svg
                    className="h-6 w-6 text-error-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Insufficient Permissions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You don't have the required permissions to access this feature.
                  Required permissions: {requiredPermissions.join(', ')}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => window.history.back()}
                    className="btn-secondary w-full"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="btn-primary w-full"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render the protected content
  return children;
};

// Higher-order component for easier usage
export const withProtectedRoute = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  WrappedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized components for common use cases
export const AdminRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRoles={['admin']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export const ManagerRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRoles={['admin', 'manager']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export const WarehouseStaffRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRoles={['admin', 'manager', 'warehouse_staff']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export const GuestRoute = ({ children }) => (
  <ProtectedRoute requireAuth={false}>
    {children}
  </ProtectedRoute>
);

// Permission-based route components
export const InventoryWriteRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredPermissions={['inventory_write']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export const ReportsRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredPermissions={['reports_read']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export const PurchaseOrdersRoute = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredPermissions={['purchase_orders_read']} 
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;