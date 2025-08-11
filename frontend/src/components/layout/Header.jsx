import React, { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

const Header = ({ onMenuClick, notifications = [] }) => {
  const { user, userProfile, userDisplayName, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onMenuClick}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="flex items-center">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-white"
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
                <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:block">
                  Inventory MS
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, suppliers..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </form>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Mobile search button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => navigate('/search')}
          >
            <span className="sr-only">Search</span>
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>

          {/* Notifications */}
          <Menu as="div" className="relative">
            <Menu.Button className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                </span>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <Menu.Item key={notification.id}>
                        {({ active }) => (
                          <Link
                            to={notification.link || '#'}
                            className={clsx(
                              'block px-4 py-3 text-sm border-b border-gray-100 last:border-b-0',
                              active ? 'bg-gray-50' : '',
                              !notification.read ? 'bg-primary-50' : ''
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="h-2 w-2 bg-primary-600 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                              )}
                            </div>
                          </Link>
                        )}
                      </Menu.Item>
                    ))
                  )}
                </div>
                {notifications.length > 5 && (
                  <div className="px-4 py-2 border-t border-gray-200">
                    <Link
                      to="/notifications"
                      className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                    >
                      See all notifications
                    </Link>
                  </div>
                )}
              </Menu.Items>
            </Transition>
          </Menu>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <span className="sr-only">Open user menu</span>
              <div className="flex items-center space-x-3">
                <span className="hidden md:block text-right">
                  <span className="block text-sm font-medium text-gray-900">
                    {userDisplayName}
                  </span>
                  <span className="block text-xs text-gray-500 capitalize">
                    {userProfile?.role?.replace('_', ' ')}
                  </span>
                </span>
                {user?.user_metadata?.avatar_url ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.user_metadata.avatar_url}
                    alt={userDisplayName}
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {userProfile?.role?.replace('_', ' ')}
                  </p>
                </div>

                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/profile"
                      className={clsx(
                        'flex items-center px-4 py-2 text-sm text-gray-700',
                        active ? 'bg-gray-100' : ''
                      )}
                    >
                      <UserIcon className="h-4 w-4 mr-3" />
                      Your Profile
                    </Link>
                  )}
                </Menu.Item>

                {isAdmin && (
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/admin/settings"
                        className={clsx(
                          'flex items-center px-4 py-2 text-sm text-gray-700',
                          active ? 'bg-gray-100' : ''
                        )}
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-3" />
                        System Settings
                      </Link>
                    )}
                  </Menu.Item>
                )}

                <div className="border-t border-gray-200"></div>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      className={clsx(
                        'flex items-center w-full px-4 py-2 text-sm text-gray-700',
                        active ? 'bg-gray-100' : ''
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;