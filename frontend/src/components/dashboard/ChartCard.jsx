import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ChartCard = ({ 
  title, 
  children, 
  loading = false, 
  error = null,
  className = '',
  headerAction = null,
  height = 'h-80'
}) => {
  return (
    <div className={clsx('card', className)}>
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {headerAction}
      </div>
      <div className="card-body">
        <div className={clsx('relative', height)}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10">
              <LoadingSpinner size="lg" text="Loading chart data..." />
            </div>
          )}
          
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c.37 0 .606-.394.486-.74L13.938 4.24c-.12-.346-.464-.346-.584 0L8.87 16.26c-.12.346.116.74.486.74z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Chart Error</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
              </div>
            </div>
          )}
          
          {!loading && !error && children}
        </div>
      </div>
    </div>
  );
};

export default ChartCard;