import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock notifications - in a real app, these would come from a store or API
  const notifications = [
    {
      id: 1,
      title: 'Low Stock Alert',
      message: 'Product ABC-123 is running low on stock',
      time: '2 minutes ago',
      read: false,
      link: '/inventory/ABC-123',
    },
    {
      id: 2,
      title: 'Purchase Order Approved',
      message: 'PO-2024-001 has been approved',
      time: '1 hour ago',
      read: false,
      link: '/purchase-orders/PO-2024-001',
    },
    {
      id: 3,
      title: 'New Supplier Added',
      message: 'Supplier "Tech Solutions Inc." has been added',
      time: '3 hours ago',
      read: true,
      link: '/suppliers',
    },
  ];

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />

        {/* Main content */}
        <div className="lg:pl-72">
          {/* Header */}
          <Header 
            onMenuClick={handleMenuClick} 
            notifications={notifications}
          />

          {/* Page content */}
          <main className="flex-1">
            <div className="relative">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define default options
            className: '',
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            // Default options for specific types
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10B981',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#EF4444',
              },
            },
            loading: {
              duration: Infinity,
              style: {
                background: '#3B82F6',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Layout;