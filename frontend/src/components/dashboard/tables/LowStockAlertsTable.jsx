import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ExclamationTriangleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const LowStockAlertsTable = ({ data = [], loading = false, error = null }) => {
  const getAlertLevel = (currentStock, minimumStock) => {
    const ratio = currentStock / minimumStock;
    if (ratio <= 0.5) return { level: 'critical', color: 'text-error-600 bg-error-50' };
    if (ratio <= 0.8) return { level: 'low', color: 'text-warning-600 bg-warning-50' };
    return { level: 'normal', color: 'text-success-600 bg-success-50' };
  };

  const formatDaysLeft = (daysLeft) => {
    if (daysLeft <= 0) return 'Out of stock';
    if (daysLeft === 1) return '1 day left';
    if (daysLeft < 7) return `${daysLeft} days left`;
    if (daysLeft < 30) return `${Math.ceil(daysLeft / 7)} weeks left`;
    return `${Math.ceil(daysLeft / 30)} months left`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
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
          <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
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
          <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
          {data.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
              {data.length} alert{data.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link 
          to="/inventory/alerts" 
          className="text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="card-body p-0">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No low stock alerts</p>
            <p className="text-xs text-gray-400">All products are well stocked</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => {
                  const alert = getAlertLevel(item.currentStock, item.minimumStock);
                  return (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <ExclamationTriangleIcon 
                              className={clsx(
                                'h-5 w-5',
                                alert.level === 'critical' ? 'text-error-500' : 'text-warning-500'
                              )} 
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <Link 
                                to={`/products/${item.productId}`}
                                className="hover:text-primary-600"
                              >
                                {item.productName}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.productSku}
                            </div>
                            {item.warehouse && (
                              <div className="text-xs text-gray-400">
                                {item.warehouse}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(item.currentStock || 0).toLocaleString()} units
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {(item.minimumStock || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          alert.color
                        )}>
                          {alert.level}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {((item.currentStock / item.minimumStock) * 100).toFixed(0)}% of min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDaysLeft(item.daysLeft)}
                        </div>
                        {item.averageDailyUsage && (
                          <div className="text-xs text-gray-500 mt-1">
                            Avg usage: {item.averageDailyUsage}/day
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/purchase-orders/create?product=${item.productId}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Reorder
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            to={`/inventory/${item.productId}`}
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

export default LowStockAlertsTable;