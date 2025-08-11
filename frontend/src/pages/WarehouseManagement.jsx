import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { warehouseApi } from '../lib/api';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, warehouse: null });
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [warehouseAnalytics, setWarehouseAnalytics] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: '',
    email: '',
    manager_id: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      console.log('Fetching warehouses...');
      const warehousesData = await warehouseApi.getWarehouses();
      console.log('Fetched warehouses:', warehousesData);
      console.log('Warehouses type:', typeof warehousesData);
      console.log('Warehouses length:', warehousesData?.length);
      
      if (Array.isArray(warehousesData)) {
        setWarehouses(warehousesData);
        console.log('Warehouses set successfully:', warehousesData.length, 'items');
      } else {
        console.error('Warehouses data is not an array:', warehousesData);
        setWarehouses([]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseAnalytics = async (warehouseId) => {
    try {
      const response = await warehouseApi.getWarehouseAnalytics(warehouseId);
      setWarehouseAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch warehouse analytics:', error);
      setWarehouseAnalytics(null);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
  };

  useEffect(() => {
    if (searchTerm || statusFilter !== 'all') {
      const timer = setTimeout(() => {
        fetchWarehouses();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, statusFilter]);

  const openModal = (warehouse = null) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse?.name || '',
      code: warehouse?.code || '',
      address: warehouse?.address || '',
      city: warehouse?.city || '',
      state: warehouse?.state || '',
      postal_code: warehouse?.postal_code || '',
      country: warehouse?.country || 'USA',
      phone: warehouse?.phone || '',
      email: warehouse?.email || '',
      manager_id: warehouse?.manager_id || '',
      is_active: warehouse?.is_active ?? true
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      phone: '',
      email: '',
      manager_id: '',
      is_active: true
    });
    setErrors({});
  };

  const openDetailsModal = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailsModal(true);
    fetchWarehouseAnalytics(warehouse.id);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedWarehouse(null);
    setWarehouseAnalytics(null);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Warehouse code is required';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        manager_id: formData.manager_id || null
      };

      if (editingWarehouse) {
        await warehouseApi.updateWarehouse({ id: editingWarehouse.id, ...submitData });
      } else {
        await warehouseApi.createWarehouse(submitData);
      }
      
      closeModal();
      fetchWarehouses();
    } catch (error) {
      console.error('Failed to save warehouse:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save warehouse';
      setErrors({ submit: errorMessage });
    }
  };

  const handleDelete = async () => {
    try {
      await warehouseApi.deleteWarehouse(deleteDialog.warehouse.id);
      setDeleteDialog({ open: false, warehouse: null });
      fetchWarehouses();
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
        Inactive
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
              <p className="text-gray-600 mt-1">Manage warehouse locations and operations</p>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Warehouse
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Status:</span>
              <button
                onClick={() => handleStatusFilter('all')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'all' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleStatusFilter('active')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => handleStatusFilter('inactive')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'inactive' 
                    ? 'bg-red-100 text-red-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Warehouses Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : warehouses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No warehouses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding a new warehouse'}
                </p>
              </div>
            ) : (
              warehouses.map((warehouse) => (
                <div key={warehouse.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <BuildingStorefrontIcon className="w-8 h-8 text-blue-500 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{warehouse.name}</h3>
                          <p className="text-sm text-gray-500">({warehouse.code})</p>
                        </div>
                      </div>
                      {getStatusBadge(warehouse.is_active)}
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <div>{warehouse.address}</div>
                          <div>{warehouse.city}, {warehouse.state} {warehouse.postal_code}</div>
                          <div>{warehouse.country}</div>
                        </div>
                      </div>
                      
                      {warehouse.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          <a href={`tel:${warehouse.phone}`} className="text-blue-600 hover:text-blue-800">
                            {warehouse.phone}
                          </a>
                        </div>
                      )}
                      
                      {warehouse.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="w-4 h-4 mr-2" />
                          <a href={`mailto:${warehouse.email}`} className="text-blue-600 hover:text-blue-800 truncate">
                            {warehouse.email}
                          </a>
                        </div>
                      )}
                      
                      {warehouse.manager_id && (
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Manager assigned
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => openDetailsModal(warehouse)}
                        className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ChartBarIcon className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(warehouse)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, warehouse })}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                </h3>
                
                {errors.submit && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {errors.submit}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Basic Information</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter warehouse name"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter warehouse code"
                    />
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                  </div>

                  {/* Address Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 border-b pb-2">Address Information</h4>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter street address"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter city"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.state ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter state"
                    />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.postal_code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter postal code"
                    />
                    {errors.postal_code && <p className="text-red-500 text-xs mt-1">{errors.postal_code}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter country"
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 border-b pb-2">Contact Information</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  
                  <div className="md:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active Warehouse
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingWarehouse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Details Modal */}
      {showDetailsModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedWarehouse.name}</h3>
                  <p className="text-gray-600">({selectedWarehouse.code})</p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Warehouse Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                    Warehouse Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Address:</span>
                      <p className="text-sm text-gray-900">
                        {selectedWarehouse.address}<br />
                        {selectedWarehouse.city}, {selectedWarehouse.state} {selectedWarehouse.postal_code}<br />
                        {selectedWarehouse.country}
                      </p>
                    </div>
                    {selectedWarehouse.phone && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Phone:</span>
                        <p className="text-sm text-gray-900">{selectedWarehouse.phone}</p>
                      </div>
                    )}
                    {selectedWarehouse.email && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Email:</span>
                        <p className="text-sm text-gray-900">{selectedWarehouse.email}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {getStatusBadge(selectedWarehouse.is_active)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    Analytics
                  </h4>
                  {warehouseAnalytics ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {warehouseAnalytics.totalProducts || 0}
                          </p>
                          <p className="text-sm text-gray-600">Total Products</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {warehouseAnalytics.totalStock || 0}
                          </p>
                          <p className="text-sm text-gray-600">Total Stock</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">
                            {warehouseAnalytics.lowStockItems || 0}
                          </p>
                          <p className="text-sm text-gray-600">Low Stock Items</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            ${parseFloat(warehouseAnalytics.totalValue || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">Total Value</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading analytics...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, warehouse: null })}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message={`Are you sure you want to delete "${deleteDialog.warehouse?.name}"? This action cannot be undone and will affect all associated inventory.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
};

export default WarehouseManagement;