import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

import apiClient from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Status configuration
const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    dotColor: 'bg-gray-400'
  },
  sent: {
    label: 'Sent',
    color: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-400'
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-yellow-100 text-yellow-800',
    dotColor: 'bg-yellow-400'
  },
  partially_received: {
    label: 'Partially Received',
    color: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-400'
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-800',
    dotColor: 'bg-green-400'
  },
  completed: {
    label: 'Completed',
    color: 'bg-indigo-100 text-indigo-800',
    dotColor: 'bg-indigo-400'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    dotColor: 'bg-red-400'
  }
};

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'text-gray-600',
    icon: '↓'
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    icon: '→'
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    icon: '↑'
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    icon: '⚠'
  }
};

const PurchaseOrderManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    supplier: '',
    warehouse: '',
    priority: '',
    startDate: '',
    endDate: '',
    sort: 'created_at',
    order: 'desc'
  });
  
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Fetch purchase orders
  const { data: purchaseOrdersData, isLoading, error, refetch } = useQuery(
    ['purchaseOrders', filters],
    () => {
      // Filter out empty string values to avoid validation errors
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => value !== '')
      );
      console.log('Fetching purchase orders with clean filters:', cleanFilters);
      return apiClient.getPurchaseOrders(cleanFilters);
    },
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      retry: (failureCount, error) => {
        // Retry up to 3 times, but not for 429 errors
        if (error?.message?.includes('429') || error?.status === 429) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      onError: (error) => {
        console.error('Purchase orders query error:', error);
      }
    }
  );

  // Fetch suppliers for filter dropdown
  const { data: suppliersData } = useQuery(
    'suppliers',
    () => apiClient.get('/test/suppliers'),
    {
      staleTime: 300000, // 5 minutes
      cacheTime: 600000, // 10 minutes
      retry: (failureCount, error) => {
        if (error?.message?.includes('429') || error?.status === 429) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      refetchOnMount: false
    }
  );

  // Fetch warehouses for filter dropdown
  const { data: warehousesData } = useQuery(
    'warehouses',
    () => apiClient.get('/test/warehouses'),
    {
      staleTime: 300000, // 5 minutes
      cacheTime: 600000, // 10 minutes
      retry: (failureCount, error) => {
        if (error?.message?.includes('429') || error?.status === 429) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      refetchOnMount: false
    }
  );

  // Mutations
  const deleteMutation = useMutation(
    (id) => apiClient.deletePurchaseOrder(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        toast.success('Purchase order deleted successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete purchase order');
      }
    }
  );

  const sendMutation = useMutation(
    ({ id, data }) => apiClient.sendPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        toast.success('Purchase order sent successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to send purchase order');
      }
    }
  );

  const confirmMutation = useMutation(
    ({ id, data }) => apiClient.confirmPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        toast.success('Purchase order confirmed successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to confirm purchase order');
      }
    }
  );

  const cancelMutation = useMutation(
    ({ id, data }) => apiClient.cancelPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchaseOrders');
        setSelectedOrders([]);
        toast.success('Purchase order cancelled successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to cancel purchase order');
      }
    }
  );

  const bulkCancelMutation = useMutation(
    (data) => apiClient.bulkCancelPurchaseOrders(data),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries('purchaseOrders');
        setSelectedOrders([]);
        setShowBulkActions(false);
        toast.success(`Cancelled ${result.data.successes.length} purchase orders successfully`);
        if (result.data.errors.length > 0) {
          toast.error(`Failed to cancel ${result.data.errors.length} purchase orders`);
        }
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to cancel purchase orders');
      }
    }
  );

  const bulkSendMutation = useMutation(
    (data) => apiClient.bulkSendPurchaseOrders(data),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries('purchaseOrders');
        setSelectedOrders([]);
        setShowBulkActions(false);
        toast.success(`Sent ${result.data.successes.length} purchase orders successfully`);
        if (result.data.errors.length > 0) {
          toast.error(`Failed to send ${result.data.errors.length} purchase orders`);
        }
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to send purchase orders');
      }
    }
  );

  // Event handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handleSearch = (e) => {
    // Update search immediately on input change with debounce
    const value = e.target.value;
    handleFilterChange('search', value);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === purchaseOrdersData?.data?.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(purchaseOrdersData?.data?.map(order => order.id) || []);
    }
  };

  const handleStatusAction = (orderId, action, additionalData = {}) => {
    switch (action) {
      case 'send':
        sendMutation.mutate({ id: orderId, data: additionalData });
        break;
      case 'confirm':
        confirmMutation.mutate({ id: orderId, data: additionalData });
        break;
      case 'cancel':
        if (window.confirm('Are you sure you want to cancel this purchase order?')) {
          cancelMutation.mutate({ id: orderId, data: additionalData });
        }
        break;
      default:
        break;
    }
  };

  const handleBulkAction = (action) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to perform bulk action');
      return;
    }

    switch (action) {
      case 'send':
        bulkSendMutation.mutate({
          orderIds: selectedOrders,
          emailTemplate: {
            subject: 'Purchase Order',
            message: 'Please find the attached purchase order for your review and confirmation.'
          }
        });
        break;
      case 'cancel':
        if (window.confirm(`Are you sure you want to cancel ${selectedOrders.length} selected purchase orders?`)) {
          bulkCancelMutation.mutate({
            orderIds: selectedOrders,
            reason: 'Bulk cancellation'
          });
        }
        break;
      default:
        break;
    }
  };

  const handleExport = () => {
    apiClient.exportPurchaseOrders(filters)
      .then((result) => {
        // Create and trigger download
        const blob = new Blob([JSON.stringify(result.data.data)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Purchase orders exported successfully');
      })
      .catch((error) => {
        toast.error('Failed to export purchase orders');
      });
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      status: '',
      supplier: '',
      warehouse: '',
      priority: '',
      startDate: '',
      endDate: '',
      sort: 'created_at',
      order: 'desc'
    });
  };

  const orders = purchaseOrdersData?.data || [];
  const pagination = purchaseOrdersData?.pagination || {};
  const suppliers = Array.isArray(suppliersData?.data) ? suppliersData.data : 
                   Array.isArray(suppliersData) ? suppliersData : [];
  const warehouses = Array.isArray(warehousesData?.data) ? warehousesData.data : 
                    Array.isArray(warehousesData) ? warehousesData : [];

  // Debug logging
  useEffect(() => {
    if (purchaseOrdersData) {
      console.log('Purchase Orders Data Structure:', {
        fullResponse: purchaseOrdersData,
        dataSection: purchaseOrdersData?.data,
        ordersArray: purchaseOrdersData?.data,
        ordersLength: purchaseOrdersData?.data?.length,
        pagination: purchaseOrdersData?.pagination
      });
    }
  }, [purchaseOrdersData]);

  console.log('Current orders:', orders);
  console.log('Current pagination:', pagination);

  if (isLoading) {
    console.log('Purchase orders loading...');
    return <LoadingSpinner />;
  }

  if (error) {
    console.error('Purchase orders error:', error);
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error loading purchase orders: {error.message}
          <button 
            onClick={() => refetch()}
            className="ml-2 text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="text-gray-600 mt-1">
                Manage your purchase order workflow from creation to completion
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => navigate('/purchase-orders/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number or reference..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={handleSearch}
                value={filters.search}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  showFilters 
                    ? 'border-blue-300 text-blue-700 bg-blue-50' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              {selectedOrders.length > 0 && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Bulk Actions ({selectedOrders.length})
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-md border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={filters.supplier}
                    onChange={(e) => handleFilterChange('supplier', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Suppliers</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                  <select
                    value={filters.warehouse}
                    onChange={(e) => handleFilterChange('warehouse', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Priorities</option>
                    {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {showBulkActions && selectedOrders.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedOrders.length} order(s) selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('send')}
                    disabled={bulkSendMutation.isLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                  >
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    Send Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('cancel')}
                    disabled={bulkCancelMutation.isLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                  const priorityConfig = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;
                  
                  // Debug logging for first order
                  if (orders.indexOf(order) === 0) {
                    console.log('First order structure:', order);
                  }
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="flex items-center">
                               <span className="text-sm font-medium text-gray-900">
                                 {order.order_number || order.po_number || order.orderNumber || 'N/A'}
                               </span>
                              <span className={`ml-2 text-xs ${priorityConfig.color}`}>
                                {priorityConfig.icon} {priorityConfig.label}
                              </span>
                            </div>
                            {order.reference && (
                              <div className="text-xs text-gray-500">
                                Ref: {order.reference}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full ${statusConfig.dotColor} mr-2`} />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.suppliers?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.warehouses?.name || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ${(order.total_amount || order.subtotal || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.currency || 'USD'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                          <div className="text-xs text-gray-900">
                            {(() => {
                              try {
                                const d = order.created_at || order.createdAt || order.orderDate;
                                return `Created: ${format(new Date(d), 'MMM dd, yyyy')}`;
                              } catch (e) {
                                return 'Created: N/A';
                              }
                            })()}
                          </div>
                        {order.expected_delivery_date && (
                          <div className="text-xs text-gray-500">
                              {(() => {
                                try {
                                  return `Expected: ${format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')}`;
                                } catch (e) {
                                  return 'Expected: N/A';
                                }
                              })()}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Quick Actions based on status */}
                          {order.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleStatusAction(order.id, 'send', { 
                                  email: order.suppliers?.email,
                                  message: 'Please review the attached purchase order.' 
                                })}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Send to Supplier"
                              >
                                <EnvelopeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}
                                className="text-gray-600 hover:text-gray-800 text-xs"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          
                          {order.status === 'sent' && (
                            <button
                              onClick={() => handleStatusAction(order.id, 'confirm', {
                                notes: 'Confirmed by supplier'
                              })}
                              className="text-green-600 hover:text-green-800 text-xs"
                              title="Confirm Order"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => navigate(`/purchase-orders/${order.id}`)}
                            className="text-gray-600 hover:text-gray-800 text-xs"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          {['draft', 'sent'].includes(order.status) && (
                            <button
                              onClick={() => handleStatusAction(order.id, 'cancel', {
                                reason: 'Manual cancellation'
                              })}
                              className="text-red-600 hover:text-red-800 text-xs"
                              title="Cancel Order"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}

                          <div className="relative">
                            <button 
                              onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                            {openDropdown === order.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      navigate(`/purchase-orders/${order.id}`);
                                      setOpenDropdown(null);
                                    }}
                                    className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                  >
                                    <EyeIcon className="h-4 w-4 inline mr-2" />
                                    View Details
                                  </button>
                                  {order.status === 'draft' && (
                                    <button
                                      onClick={() => {
                                        navigate(`/purchase-orders/${order.id}/edit`);
                                        setOpenDropdown(null);
                                      }}
                                      className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                    >
                                      <PencilIcon className="h-4 w-4 inline mr-2" />
                                      Edit Order
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(order.order_number || order.po_number);
                                      toast.success('Order number copied to clipboard');
                                      setOpenDropdown(null);
                                    }}
                                    className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                  >
                                    <DocumentArrowDownIcon className="h-4 w-4 inline mr-2" />
                                    Copy Order Number
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                    disabled={filters.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, filters.page + 1))}
                    disabled={filters.page >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((filters.page - 1) * filters.limit) + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(filters.page * filters.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handleFilterChange('page', page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === filters.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } ${page === 1 ? 'rounded-l-md' : ''} ${page === pagination.totalPages ? 'rounded-r-md' : ''}`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No purchase orders found</h3>
            <p className="mt-2 text-gray-500">
              {filters.search || filters.status || filters.supplier 
                ? 'Try adjusting your search filters'
                : 'Get started by creating your first purchase order'
              }
            </p>
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Purchase Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderManagement;