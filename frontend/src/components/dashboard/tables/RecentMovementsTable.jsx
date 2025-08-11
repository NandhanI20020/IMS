import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const RecentMovementsTable = ({ data = [], loading = false, error = null }) => {
  const getMovementIcon = (type) => {
    switch (type) {
      case 'in':
        return <ArrowUpIcon className="h-4 w-4 text-success-500" />;
      case 'out':
        return <ArrowDownIcon className="h-4 w-4 text-error-500" />;
      case 'transfer':
        return <ArrowRightIcon className="h-4 w-4 text-primary-500" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case 'in':
        return 'text-success-600 bg-success-50';
      case 'out':
        return 'text-error-600 bg-error-50';
      case 'transfer':
        return 'text-primary-600 bg-primary-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
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
          <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
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
        <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
        <Link 
          to="/inventory/movements" 
          className="text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="card-body p-0">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8h-2M4 5h2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No recent movements</p>
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
                    Movement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((movement, index) => {
                  const dateTime = formatDateTime(movement.createdAt);
                  return (
                    <tr key={movement.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <Link 
                                to={`/products/${movement.productId}`}
                                className="hover:text-primary-600"
                              >
                                {movement.productName}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {movement.productSku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getMovementIcon(movement.type)}
                          <span className={clsx(
                            'ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                            getMovementColor(movement.type)
                          )}>
                            {movement.type}
                          </span>
                        </div>
                        {movement.reason && (
                          <div className="text-xs text-gray-500 mt-1">
                            {movement.reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {movement.type === 'out' && '-'}
                          {movement.type === 'in' && '+'}
                          {movement.quantity.toLocaleString()}
                          <span className="text-gray-500 ml-1">units</span>
                        </div>
                        {movement.warehouse && (
                          <div className="text-xs text-gray-500">
                            {movement.warehouse}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{dateTime.date}</div>
                        <div className="text-xs">{dateTime.time}</div>
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

export default RecentMovementsTable;