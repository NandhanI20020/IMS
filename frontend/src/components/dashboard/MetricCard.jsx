import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const MetricCard = ({ 
  title, 
  value, 
  previousValue, 
  icon: Icon,
  format = 'number',
  prefix = '',
  suffix = '',
  loading = false,
  className = ''
}) => {
  const formatValue = (val) => {
    if (loading || val === null || val === undefined) return '---';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(val);
      default:
        return val.toString();
    }
  };

  const calculateChange = () => {
    if (loading || !previousValue || !value) return null;
    
    const change = ((value - previousValue) / previousValue) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      isSignificant: Math.abs(change) >= 1
    };
  };

  const change = calculateChange();

  return (
    <div className={clsx('card', className)}>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {prefix}{formatValue(value)}{suffix}
              </p>
              {change && change.isSignificant && (
                <div className={clsx(
                  'flex items-center text-sm font-medium',
                  change.isPositive ? 'text-success-600' : 'text-error-600'
                )}>
                  {change.isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {change.value.toFixed(1)}%
                </div>
              )}
            </div>
            {change && (
              <p className="text-xs text-gray-500 mt-1">
                vs. previous period
              </p>
            )}
          </div>
          {Icon && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;