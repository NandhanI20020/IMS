import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const PendingPurchaseOrdersTable = ({ data = [], loading = false, error = null }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-warning-700 bg-warning-100';
      case 'approved':
        return 'text-primary-700 bg-primary-100';
      case 'ordered':
        return 'text-purple-700 bg-purple-100';
      case 'overdue':
        return 'text-error-700 bg-error-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-error-600';
      case 'medium':
        return 'text-warning-600';
      case 'low':
        return 'text-success-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        isOverdue: true
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due today',
        isOverdue: false,
        isToday: true
      };
    } else if (diffDays === 1) {
      return {
        text: 'Due tomorrow',
        isOverdue: false
      };
    } else {
      return {
        text: `Due in ${diffDays} days`,
        isOverdue: false
      };
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Pending Purchase Orders</h3>
        </div>
        <div className="card-body">
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Pending Purchase Orders</h3>
        </div>
        <div className="card-body">
          <div className="text-center py-6">
            <p className="text-error-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">Pending Purchase Orders</h3>
          {data.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
              {data.length} pending
            </span>
          )}
        </div>
        <Link 
          to="/purchase-orders" 
          className="text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="card-body p-0">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No pending purchase orders</p>
            <p className="text-xs text-gray-400">All orders are processed</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((order, index) => {
                  const dueDate = formatDate(order.expectedDate);
                  return (
                    <tr key={order.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            {order.priority === 'high' && (
                              <ExclamationCircleIcon className="h-5 w-5 text-error-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <Link 
                                to={`/purchase-orders/${order.id}`}
                                className="hover:text-primary-600"
                              >
                                {order.orderNumber}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                            </div>
                            {order.priority && (
                              <div className={clsx(
                                'text-xs font-medium capitalize',
                                getPriorityColor(order.priority)
                              )}>
                                {order.priority} priority
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <Link 
                            to={`/suppliers/${order.supplierId}`}
                            className="hover:text-primary-600"
                          >
                            {order.supplierName}
                          </Link>
                        </div>
                        {order.supplierContact && (
                          <div className="text-xs text-gray-500">
                            {order.supplierContact}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          getStatusColor(dueDate.isOverdue ? 'overdue' : order.status)
                        )}>
                          {dueDate.isOverdue ? 'overdue' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span className={clsx(
                            dueDate.isOverdue ? 'text-error-600 font-medium' : 
                            dueDate.isToday ? 'text-warning-600 font-medium' : 
                            'text-gray-900'
                          )}>
                            {dueDate.text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(order.expectedDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {order.status === 'pending' && (
                            <button
                              className="text-primary-600 hover:text-primary-900"
                              onClick={() => {/* Handle approve */}}
                            >
                              Approve
                            </button>
                          )}
                          {order.status === 'approved' && (
                            <button
                              className="text-success-600 hover:text-success-900"
                              onClick={() => {/* Handle send order */}}
                            >
                              Send Order
                            </button>
                          )}
                          <span className="text-gray-300">|</span>
                          <Link
                            to={`/purchase-orders/${order.id}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingPurchaseOrdersTable;