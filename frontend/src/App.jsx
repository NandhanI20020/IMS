import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ProtectedRoute, { GuestRoute } from '@/components/auth/ProtectedRoute';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import PasswordReset from '@/components/auth/PasswordReset';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotFound } from '@/components/common/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 429 errors (rate limiting)
        if (error?.message?.includes('429') || error?.status === 429) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: false,
      refetchOnReconnect: true,
      onError: (error) => {
        // Handle rate limiting errors globally
        if (error?.message?.includes('429') || error?.status === 429) {
          console.warn('Rate limited by server. Please wait before making more requests.');
        }
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on 429 errors
        if (error?.message?.includes('429') || error?.status === 429) {
          return false;
        }
        return failureCount < 1;
      },
      onError: (error) => {
        // Handle rate limiting errors globally
        if (error?.message?.includes('429') || error?.status === 429) {
          console.warn('Rate limited by server. Please wait before making more requests.');
        }
      },
    },
  },
});

// Import the actual Dashboard component
import Dashboard from '@/pages/Dashboard';
import ProductManagement from '@/pages/ProductManagementSimple';
import CategoryManagement from '@/pages/CategoryManagement';
import SupplierManagement from '@/pages/SupplierManagement';
import WarehouseManagement from '@/pages/WarehouseManagement';

const Inventory = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Inventory management interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);




// Import the actual PurchaseOrder components
import PurchaseOrderManagement from '@/pages/PurchaseOrderManagement';
import PurchaseOrderWizard from '@/components/purchase-orders/PurchaseOrderWizard';
import PurchaseOrderDetail from '@/components/purchase-orders/PurchaseOrderDetail';

const Reports = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Reporting interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);

const Profile = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Profile</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">User profile management interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);

const Search = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">Search interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);

const UserManagement = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">User management interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);

const SystemSettings = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600">System settings interface will be implemented here.</p>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                <GuestRoute>
                  <LoginForm />
                </GuestRoute>
              } />
              <Route path="/register" element={
                <GuestRoute>
                  <RegisterForm />
                </GuestRoute>
              } />
              <Route path="/forgot-password" element={
                <GuestRoute>
                  <PasswordReset />
                </GuestRoute>
              } />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                {/* Dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Main features */}
                <Route path="products" element={
                  <ProtectedRoute requiredPermissions={['products_read']}>
                    <ProductManagement />
                  </ProtectedRoute>
                } />
                <Route path="inventory" element={
                  <ProtectedRoute requiredPermissions={['inventory_read']}>
                    <Inventory />
                  </ProtectedRoute>
                } />
                <Route path="categories" element={
                  <ProtectedRoute requiredPermissions={['products_read']}>
                    <CategoryManagement />
                  </ProtectedRoute>
                } />
                <Route path="warehouses" element={
                  <ProtectedRoute requiredRoles={['admin', 'manager']}>
                    <WarehouseManagement />
                  </ProtectedRoute>
                } />
                <Route path="suppliers" element={
                  <ProtectedRoute requiredPermissions={['products_read']}>
                    <SupplierManagement />
                  </ProtectedRoute>
                } />
                <Route path="purchase-orders">
                  <Route index element={
                    <ProtectedRoute requiredPermissions={['purchase_orders_read']}>
                      <PurchaseOrderManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="new" element={
                    <ProtectedRoute requiredPermissions={['purchase_orders_create']}>
                      <PurchaseOrderWizard />
                    </ProtectedRoute>
                  } />
                  <Route path=":id" element={
                    <ProtectedRoute requiredPermissions={['purchase_orders_read']}>
                      <PurchaseOrderDetail />
                    </ProtectedRoute>
                  } />
                  <Route path=":id/edit" element={
                    <ProtectedRoute requiredPermissions={['purchase_orders_update']}>
                      <PurchaseOrderWizard />
                    </ProtectedRoute>
                  } />
                </Route>
                <Route path="reports" element={
                  <ProtectedRoute requiredPermissions={['reports_read']}>
                    <Reports />
                  </ProtectedRoute>
                } />

                {/* User management */}
                <Route path="profile" element={<Profile />} />
                <Route path="search" element={<Search />} />

                {/* Admin routes */}
                <Route path="admin/users" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="admin/settings" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />
              </Route>

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </div>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;