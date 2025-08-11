import React from 'react';
import clsx from 'clsx';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const spinnerElement = (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center space-y-3">
        <svg
          className={clsx(
            'animate-spin',
            sizeClasses[size],
            colorClasses[color]
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {text && (
          <p className={clsx(
            'font-medium',
            textSizeClasses[size],
            colorClasses[color]
          )}>
            {text}
          </p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

// Overlay spinner for loading states
export const LoadingOverlay = ({ 
  loading, 
  text = 'Loading...', 
  children,
  className = ''
}) => {
  return (
    <div className={clsx('relative', className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <LoadingSpinner text={text} size="lg" />
        </div>
      )}
    </div>
  );
};

// Inline spinner for buttons
export const ButtonSpinner = ({ size = 'sm', className = '' }) => {
  return (
    <svg
      className={clsx(
        'animate-spin',
        size === 'xs' ? 'h-3 w-3' : 'h-4 w-4',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Skeleton loader for content
export const SkeletonLoader = ({ 
  lines = 3, 
  className = '', 
  lineHeight = 'h-4',
  animate = true 
}) => {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={clsx(
            'bg-gray-200 rounded',
            lineHeight,
            animate && 'animate-pulse',
            index === lines - 1 && 'w-3/4' // Make last line shorter
          )}
        />
      ))}
    </div>
  );
};

// Card skeleton
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={clsx('card animate-pulse', className)}>
      <div className="card-header">
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="card-body space-y-4">
        <SkeletonLoader lines={3} animate={false} />
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => {
  return (
    <div className={clsx('animate-pulse', className)}>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LoadingSpinner;