import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import apiClient, { productApi } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const STEPS = [
  { id: 1, name: 'Supplier & Basic Info', description: 'Choose supplier and enter basic order details' },
  { id: 2, name: 'Products & Quantities', description: 'Select products and specify quantities and pricing' },
  { id: 3, name: 'Review & Create', description: 'Review order details and create the purchase order' }
];

const PurchaseOrderWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    supplier_id: '',
    warehouse_id: '',
    reference: '',
    expected_delivery_date: '',
    priority: 'normal',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    delivery_method: '',
    notes: '',
    
    // Step 2: Financial
    items: [],
    shipping_cost: 0,
    tax_rate: 0,
    discount: 0,
    
    // Calculated totals
    subtotal: 0,
    tax_amount: 0,
    total: 0
  });
  
  // Step 2 state for product selection
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  // Fetch reference data
  const { data: suppliersData } = useQuery(
    'suppliers',
    () => apiClient.get('/test/suppliers'),
    { staleTime: 300000 }
  );

  const { data: warehousesData } = useQuery(
    'warehouses',
    () => apiClient.get('/test/warehouses'),
    { staleTime: 300000 }
  );

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ['products', productSearch],
    () => productApi.getProducts({ 
      search: productSearch,
      limit: 50,
      filters: { status: 'active' }
    }),
    { 
      enabled: currentStep === 2,
      staleTime: 30000
    }
  );

  // Create purchase order mutation
  const createMutation = useMutation(
    (data) => apiClient.createPurchaseOrder(data),
    {
      onSuccess: (result) => {
        toast.success('Purchase order created successfully');
        queryClient.invalidateQueries('purchaseOrders');
        navigate(`/purchase-orders/${result.data.id}`);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create purchase order');
      }
    }
  );

  // Calculate totals whenever items or financial data changes
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    const tax_amount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + tax_amount + formData.shipping_cost - formData.discount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount,
      total
    }));
  }, [formData.items, formData.tax_rate, formData.shipping_cost, formData.discount]);

  // Form handlers
  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addItem = (product) => {
    const existingItemIndex = formData.items.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      updateFormData({ items: updatedItems });
    } else {
      // Add new item
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: product.costPrice || product.cost_price || 0,
        unit: product.unit || 'pcs'
      };
      updateFormData({ items: [...formData.items, newItem] });
    }
    setSelectedProducts(prev => new Set([...prev, product.id]));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = parseFloat(value) || 0;
    updateFormData({ items: updatedItems });
  };

  const removeItem = (index) => {
    const removedItem = formData.items[index];
    const updatedItems = formData.items.filter((_, i) => i !== index);
    updateFormData({ items: updatedItems });
    
    setSelectedProducts(prev => {
      const updated = new Set(prev);
      updated.delete(removedItem.product_id);
      return updated;
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.supplier_id && formData.warehouse_id;
      case 2:
        return formData.items.length > 0 && formData.items.every(item => 
          item.quantity > 0 && item.unit_price >= 0
        );
      case 3:
        return true; // Review step, no additional validation
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    } else {
      toast.error('Please complete all required fields before proceeding');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = () => {
    if (!validateStep(2)) {
      toast.error('Please ensure all items have valid quantities and prices');
      return;
    }

    // Transform data for API
    const submitData = {
      supplier_id: formData.supplier_id,
      warehouse_id: formData.warehouse_id,
      reference: formData.reference,
      expected_delivery_date: formData.expected_delivery_date || null,
      priority: formData.priority,
      contact_person: formData.contact_person,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      delivery_method: formData.delivery_method,
      notes: formData.notes,
      items: formData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      shipping_cost: formData.shipping_cost,
      tax_rate: formData.tax_rate,
      discount: formData.discount
    };

    createMutation.mutate(submitData);
  };

  const suppliers = Array.isArray(suppliersData?.data?.data) ? suppliersData.data.data : 
                   Array.isArray(suppliersData?.data) ? suppliersData.data : 
                   Array.isArray(suppliersData) ? suppliersData : [];
  const warehouses = Array.isArray(warehousesData?.data?.data) ? warehousesData.data.data : 
                    Array.isArray(warehousesData?.data) ? warehousesData.data : 
                    Array.isArray(warehousesData) ? warehousesData : [];
  const products = productsData?.products || [];

  if (createMutation.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
        <p className="text-gray-600 mt-1">
          Follow the steps below to create a new purchase order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {STEPS.map((step, stepIdx) => (
              <li key={step.name} className={`${stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                <div className="flex items-center">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      step.id < currentStep
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : step.id === currentStep
                        ? 'border-2 border-blue-600 bg-white'
                        : 'border-2 border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          step.id === currentStep ? 'bg-blue-600' : 'bg-transparent'
                        }`}
                      />
                    )}
                  </div>
                  <div className="ml-4 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={`absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Supplier & Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => updateFormData({ supplier_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warehouse Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => updateFormData({ warehouse_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a warehouse...</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference/PO Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => updateFormData({ reference: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional reference number"
                  />
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => updateFormData({ expected_delivery_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => updateFormData({ priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Delivery Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Method
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_method}
                    onChange={(e) => updateFormData({ delivery_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Standard Shipping, Express"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => updateFormData({ contact_person: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => updateFormData({ contact_email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => updateFormData({ contact_phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or special instructions"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Products & Quantities
                </h3>
              </div>

              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by product name or SKU..."
                  />
                </div>
              </div>

              {/* Available Products */}
              {productSearch && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Available Products</h4>
                    {productsLoading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner />
                      </div>
                    ) : products.length === 0 ? (
                      <p className="text-gray-500 text-sm">No products found</p>
                    ) : (
                      <div className="space-y-2">
                        {products.map(product => (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between p-2 rounded border ${
                              selectedProducts.has(product.id) 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                SKU: {product.sku} | Cost: ${product.costPrice}
                              </div>
                            </div>
                            <button
                              onClick={() => addItem(product)}
                              disabled={selectedProducts.has(product.id)}
                              className={`ml-4 px-3 py-1 text-xs rounded ${
                                selectedProducts.has(product.id)
                                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                            >
                              {selectedProducts.has(product.id) ? 'Added' : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Items */}
              {formData.items.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Selected Items</h4>
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.product_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  SKU: {item.product_sku}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-sm text-gray-500 mr-1">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                  className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Additional Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Cost ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping_cost}
                      onChange={(e) => updateFormData({ shipping_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => updateFormData({ tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => updateFormData({ discount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">${formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({formData.tax_rate}%):</span>
                    <span className="text-gray-900">${formData.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="text-gray-900">${formData.shipping_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-gray-900">-${formData.discount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-lg font-medium">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">${formData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Review & Create Purchase Order
                </h3>
              </div>

              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Order Details</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600">Supplier:</dt>
                        <dd className="text-gray-900 font-medium">
                          {suppliers.find(s => s.id == formData.supplier_id)?.name}
                        </dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600">Warehouse:</dt>
                        <dd className="text-gray-900 font-medium">
                          {warehouses.find(w => w.id == formData.warehouse_id)?.name}
                        </dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600">Priority:</dt>
                        <dd className="text-gray-900 font-medium capitalize">{formData.priority}</dd>
                      </div>
                      {formData.expected_delivery_date && (
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600">Expected Delivery:</dt>
                          <dd className="text-gray-900 font-medium">
                            {new Date(formData.expected_delivery_date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  
                  {(formData.contact_person || formData.contact_email || formData.contact_phone) && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Contact Information</h4>
                      <dl className="space-y-1">
                        {formData.contact_person && (
                          <div className="text-sm">
                            <span className="text-gray-600">Person:</span> {formData.contact_person}
                          </div>
                        )}
                        {formData.contact_email && (
                          <div className="text-sm">
                            <span className="text-gray-600">Email:</span> {formData.contact_email}
                          </div>
                        )}
                        {formData.contact_phone && (
                          <div className="text-sm">
                            <span className="text-gray-600">Phone:</span> {formData.contact_phone}
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Financial Summary</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Items ({formData.items.length}):</span>
                          <span className="text-gray-900">${formData.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax ({formData.tax_rate}%):</span>
                          <span className="text-gray-900">${formData.tax_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="text-gray-900">${formData.shipping_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-gray-900">-${formData.discount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span className="text-gray-900">Total:</span>
                            <span className="text-blue-600">${formData.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {formData.notes && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{formData.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isLoading}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Purchase Order'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderWizard;