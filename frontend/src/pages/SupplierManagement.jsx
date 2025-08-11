import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  StarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { supplierApi } from '../lib/api';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, supplier: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    tax_id: '',
    credit_limit: '',
    rating: 5,
    payment_terms: 30,
    notes: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Fetching suppliers...');
      const suppliersData = await supplierApi.getSuppliers();
      console.log('Fetched suppliers:', suppliersData);
      console.log('Suppliers type:', typeof suppliersData);
      console.log('Suppliers length:', suppliersData?.length);
      
      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
        setTotalPages(Math.ceil(suppliersData.length / 10));
        console.log('Suppliers set successfully:', suppliersData.length, 'items');
      } else {
        console.error('Suppliers data is not an array:', suppliersData);
        setSuppliers([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      setSuppliers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (searchTerm || statusFilter !== 'all') {
      const timer = setTimeout(() => {
        fetchSuppliers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, statusFilter]);

  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier?.name || '',
      code: supplier?.code || '',
      contact_person: supplier?.contact_person || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      address: supplier?.address || '',
      city: supplier?.city || '',
      state: supplier?.state || '',
      postal_code: supplier?.postal_code || '',
      country: supplier?.country || 'USA',
      tax_id: supplier?.tax_id || '',
      credit_limit: supplier?.credit_limit || '',
      rating: supplier?.rating || 5,
      payment_terms: supplier?.payment_terms || 30,
      notes: supplier?.notes || '',
      is_active: supplier?.is_active ?? true
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      tax_id: '',
      credit_limit: '',
      rating: 5,
      payment_terms: 30,
      notes: '',
      is_active: true
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Supplier code is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.credit_limit && formData.credit_limit < 0) {
      newErrors.credit_limit = 'Credit limit must be non-negative';
    }
    
    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating must be between 1 and 5';
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
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        rating: parseInt(formData.rating),
        payment_terms: parseInt(formData.payment_terms)
      };

      if (editingSupplier) {
        await supplierApi.updateSupplier({ id: editingSupplier.id, ...submitData });
      } else {
        await supplierApi.createSupplier(submitData);
      }
      
      closeModal();
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save supplier';
      setErrors({ submit: errorMessage });
    }
  };

  const handleDelete = async () => {
    try {
      await supplierApi.deleteSupplier(deleteDialog.supplier.id);
      setDeleteDialog({ open: false, supplier: null });
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const renderRating = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="relative">
            {rating >= star ? (
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            ) : (
              <StarIcon className="w-4 h-4 text-gray-300" />
            )}
          </div>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
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
              <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
              <p className="text-gray-600 mt-1">Manage your supplier relationships and information</p>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Supplier
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
                placeholder="Search suppliers..."
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

          {/* Suppliers Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : suppliers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding a new supplier'}
                </p>
              </div>
            ) : (
              suppliers.map((supplier) => (
                <div key={supplier.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="w-8 h-8 text-blue-500 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{supplier.name}</h3>
                          <p className="text-sm text-gray-500">({supplier.code})</p>
                        </div>
                      </div>
                      {getStatusBadge(supplier.is_active)}
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      {supplier.contact_person && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Contact:</span>
                          {supplier.contact_person}
                        </div>
                      )}
                      
                      {supplier.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="w-4 h-4 mr-2" />
                          <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:text-blue-800">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      
                      {supplier.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:text-blue-800">
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                      
                      {(supplier.city || supplier.state) && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPinIcon className="w-4 h-4 mr-2" />
                          {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      
                      {supplier.credit_limit && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCardIcon className="w-4 h-4 mr-2" />
                          Credit Limit: ${parseFloat(supplier.credit_limit).toLocaleString()}
                        </div>
                      )}
                      
                      {supplier.rating && (
                        <div className="flex items-center">
                          {renderRating(supplier.rating)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Payment Terms: {supplier.payment_terms} days
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(supplier)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, supplier })}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter company name"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter supplier code"
                    />
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter contact person name"
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

                  {/* Address Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 border-b pb-2">Address Information</h4>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter street address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter postal code"
                    />
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

                  {/* Business Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-3 mt-4 border-b pb-2">Business Information</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter tax ID"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Limit ($)
                    </label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.credit_limit ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      step="0.01"
                      placeholder="Enter credit limit"
                    />
                    {errors.credit_limit && <p className="text-red-500 text-xs mt-1">{errors.credit_limit}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating (1-5)
                    </label>
                    <select
                      value={formData.rating}
                      onChange={(e) => setFormData({...formData, rating: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.rating ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value={1}>1 - Poor</option>
                      <option value={2}>2 - Fair</option>
                      <option value={3}>3 - Good</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={5}>5 - Excellent</option>
                    </select>
                    {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms (days)
                    </label>
                    <input
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      placeholder="Enter payment terms in days"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="3"
                      placeholder="Enter notes about the supplier"
                    />
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
                      Active Supplier
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
                  {editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, supplier: null })}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteDialog.supplier?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
};

export default SupplierManagement;