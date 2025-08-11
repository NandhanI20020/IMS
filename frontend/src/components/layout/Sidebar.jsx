import React, { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  BuildingOfficeIcon,
  TruckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const { hasPermission, hasRole, isAdmin, isManager, userProfile } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      permission: null,
    },
    {
      name: 'Products',
      href: '/products',
      icon: CubeIcon,
      permission: 'products_read',
    },
    {
      name: 'Categories',
      href: '/categories',
      icon: TagIcon,
      permission: 'products_read',
    },
    {
      name: 'Warehouses',
      href: '/warehouses',
      icon: BuildingOfficeIcon,
      permission: 'inventory_read',
      roles: ['admin', 'manager'],
    },
    {
      name: 'Suppliers',
      href: '/suppliers',
      icon: TruckIcon,
      permission: 'products_read',
    },
    {
      name: 'Purchase Orders',
      href: '/purchase-orders',
      icon: ClipboardDocumentListIcon,
      permission: 'purchase_orders_read',
    },
    // Inventory screen removed (stock managed within Products)
    // Reports page removed per requirements
  ];

  const adminNavigation = [
    {
      name: 'User Management',
      href: '/admin/users',
      icon: UsersIcon,
      roles: ['admin'],
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Cog6ToothIcon,
      roles: ['admin'],
    },
  ];

  const isCurrentPage = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const canAccessItem = (item) => {
    // Check role-based access
    if (item.roles && !hasRole(item.roles)) {
      return false;
    }
    
    // Check permission-based access  
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    
    return true;
  };

  const filteredNavigation = navigation.filter(canAccessItem);
  const filteredAdminNavigation = adminNavigation.filter(canAccessItem);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
        <Link to="/dashboard" className="flex items-center">
          <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
            <svg
              className="h-5 w-5 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7L12 3L4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7z"
              />
            </svg>
          </div>
          <span className="ml-2 text-xl font-semibold text-white">
            Inventory MS
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const current = isCurrentPage(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={clsx(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  current
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={clsx(
                    'flex-shrink-0 mr-3 h-5 w-5',
                    current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Admin Navigation */}
        {(isAdmin || isManager) && filteredAdminNavigation.length > 0 && (
          <div className="pt-6">
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
            </div>
            <div className="space-y-1">
              {filteredAdminNavigation.map((item) => {
                const current = isCurrentPage(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={clsx(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                      current
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'flex-shrink-0 mr-3 h-5 w-5',
                        current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p>&copy; 2024 Inventory MS</p>
          <p className="mt-1">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200">
          <SidebarContent />
        </div>
      </div>
    </>
  );
};

export default Sidebar;