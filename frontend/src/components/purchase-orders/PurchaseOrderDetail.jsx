import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PencilIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  TruckIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

import apiClient from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Status configuration (same as in list view)
const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    dotColor: 'bg-gray-400',
    description: 'Order is being prepared and can be modified'
  },
  sent: {
    label: 'Sent',
    color: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-400',
    description: 'Order sent to supplier, awaiting confirmation'
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-yellow-100 text-yellow-800',
    dotColor: 'bg-yellow-400',
    description: 'Supplier confirmed order, preparing for delivery'
  },
  partially_received: {
    label: 'Partially Received',
    color: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-400',
    description: 'Some items have been received and processed'
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-800',
    dotColor: 'bg-green-400',
    description: 'All items received, ready for completion'
  },
  completed: {
    label: 'Completed',
    color: 'bg-indigo-100 text-indigo-800',
    dotColor: 'bg-indigo-400',
    description: 'Order completed and archived'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    dotColor: 'bg-red-400',
    description: 'Order has been cancelled'
  }
};

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for modals and forms
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState([]);
  const [confirmData, setConfirmData] = useState({
    notes: '',
    supplierReference: '',
    expectedDeliveryDate: ''
  });
  const [cancelReason, setCancelReason] = useState('');

  // Fetch purchase order details
  const { data: orderData, isLoading, error, refetch } = useQuery(
    ['purchaseOrder', id],
    () => apiClient.getPurchaseOrder(id),
    {
      enabled: !!id
    }
  );

  // Fetch status history
  const { data: historyData } = useQuery(
    ['purchaseOrderHistory', id],
    () => apiClient.getPurchaseOrderStatusHistory(id),
    {
      enabled: !!id
    }
  );

  // Initialize receive items when order data loads
  useEffect(() => {
    if (orderData?.data?.purchase_order_items) {
      setReceiveItems(
        orderData.data.purchase_order_items.map(item => ({
          product_id: item.product_id,
          product_name: item.products?.name,
          product_sku: item.products?.sku,
          ordered_quantity: item.quantity,
          received_quantity: item.received_quantity || 0,
          remaining_quantity: item.quantity - (item.received_quantity || 0),
          receive_quantity: 0,
          unit_price: item.unit_price
        }))
      );
    }
  }, [orderData]);

  // Mutations
  const sendMutation = useMutation(
    (data) => apiClient.sendPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseOrder', id]);
        toast.success('Purchase order sent successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to send purchase order');
      }
    }
  );

  const confirmMutation = useMutation(
    (data) => apiClient.confirmPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseOrder', id]);
        setShowConfirmModal(false);
        setConfirmData({ notes: '', supplierReference: '', expectedDeliveryDate: '' });
        toast.success('Purchase order confirmed successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to confirm purchase order');
      }
    }
  );

  const receiveMutation = useMutation(
    (data) => {
      const isPartialReceive = data.items.some(item => 
        item.received_quantity < receiveItems.find(ri => ri.product_id === item.product_id)?.ordered_quantity
      );
      
      return isPartialReceive 
        ? apiClient.partiallyReceivePurchaseOrder(id, data)
        : apiClient.receivePurchaseOrder(id, data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseOrder', id]);
        setShowReceiveModal(false);
        toast.success('Purchase order received successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to receive purchase order');
      }
    }
  );

  const completeMutation = useMutation(
    (data) => apiClient.completePurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseOrder', id]);
        toast.success('Purchase order completed successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to complete purchase order');
      }
    }
  );

  const cancelMutation = useMutation(
    (data) => apiClient.cancelPurchaseOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseOrder', id]);
        setShowCancelModal(false);
        setCancelReason('');
        toast.success('Purchase order cancelled successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to cancel purchase order');
      }
    }
  );

  // Event handlers
  const handleSend = () => {
    const email = order.suppliers?.email || order.contact_email;
    if (!email) {
      toast.error('No supplier email found. Please add supplier email first.');
      return;
    }
    
    sendMutation.mutate({
      email,
      message: `Please find the attached purchase order ${order.order_number} for your review and confirmation.`
    });
  };

  const handleConfirm = () => {
    confirmMutation.mutate(confirmData);
  };

  const handleReceive = () => {
    const itemsToReceive = receiveItems
      .filter(item => item.receive_quantity > 0)
      .map(item => ({
        product_id: item.product_id,
        received_quantity: (item.received_quantity || 0) + item.receive_quantity
      }));

    if (itemsToReceive.length === 0) {
      toast.error('Please specify quantities to receive');
      return;
    }

    receiveMutation.mutate({
      items: itemsToReceive,
      notes: 'Items received via web interface'
    });
  };

  const handleComplete = () => {
    if (window.confirm('Are you sure you want to complete this purchase order? This action cannot be undone.')) {
      completeMutation.mutate({
        notes: 'Order completed via web interface'
      });
    }
  };

  const handleCancel = () => {
    cancelMutation.mutate({
      reason: cancelReason
    });
  };

  const updateReceiveQuantity = (productId, quantity) => {
    setReceiveItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, receive_quantity: Math.max(0, Math.min(quantity, item.remaining_quantity)) }
        : item
    ));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error loading purchase order: {error.message}
          <button 
            onClick={() => refetch()}
            className="ml-2 text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const order = orderData?.data;
  const history = historyData?.data || [];
  
  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">
          Purchase order not found
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const canEdit = order.status === 'draft';
  const canSend = order.status === 'draft';
  const canConfirm = order.status === 'sent';
  const canReceive = ['confirmed', 'partially_received'].includes(order.status);
  const canComplete = order.status === 'received';
  const canCancel = ['draft', 'sent', 'confirmed'].includes(order.status);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/purchase-orders')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Purchase Order {order.order_number}
                </h1>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${statusConfig.dotColor} mr-2`} />
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 mt-1">{statusConfig.description}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {canEdit && (
              <button
                onClick={() => navigate(`/purchase-orders/${id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
            
            {canSend && (
              <button
                onClick={handleSend}
                disabled={sendMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Send to Supplier
              </button>
            )}
            
            {canConfirm && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Confirm Order
              </button>
            )}
            
            {canReceive && (
              <button
                onClick={() => setShowReceiveModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <TruckIcon className="h-4 w-4 mr-2" />
                Receive Items
              </button>
            )}
            
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={completeMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Complete Order
              </button>
            )}
            
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
            )}

            <button
              onClick={() => {/* Generate PDF */}}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Order Information</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.suppliers?.name}</div>
                      <div className="text-xs text-gray-500">Supplier</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <TruckIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.warehouses?.name}</div>
                      <div className="text-xs text-gray-500">Delivery Warehouse</div>
                    </div>
                  </div>

                  {order.contact_person && (
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.contact_person}</div>
                        <div className="text-xs text-gray-500">Contact Person</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">Order Date</div>
                    </div>
                  </div>

                  {order.expected_delivery_date && (
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">Expected Delivery</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">{order.priority}</div>
                      <div className="text-xs text-gray-500">Priority</div>
                    </div>
                  </div>
                </div>
              </div>

              {order.reference && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-500">Reference:</span> {order.reference}
                  </div>
                </div>
              )}

              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-500">Notes:</span>
                    <p className="mt-1 text-gray-900">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.purchase_order_items?.map((item, index) => {
                    const receivedQty = item.received_quantity || 0;
                    const orderedQty = item.quantity;
                    const isFullyReceived = receivedQty >= orderedQty;
                    const isPartiallyReceived = receivedQty > 0 && receivedQty < orderedQty;
                    
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.products?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              SKU: {item.products?.sku}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {orderedQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receivedQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${(orderedQty * item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isFullyReceived 
                              ? 'bg-green-100 text-green-800' 
                              : isPartiallyReceived 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isFullyReceived ? 'Received' : isPartiallyReceived ? 'Partial' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Order Totals */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">${order.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({order.tax_rate || 0}%):</span>
                      <span className="text-gray-900">${order.tax_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="text-gray-900">${order.shipping_cost?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-gray-900">-${order.discount_amount?.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-blue-600">${order.total_amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          {(order.contact_email || order.contact_phone || order.suppliers?.email || order.suppliers?.phone) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {(order.contact_email || order.suppliers?.email) && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <a 
                      href={`mailto:${order.contact_email || order.suppliers?.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {order.contact_email || order.suppliers?.email}
                    </a>
                  </div>
                )}
                {(order.contact_phone || order.suppliers?.phone) && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <a 
                      href={`tel:${order.contact_phone || order.suppliers?.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {order.contact_phone || order.suppliers?.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status History */}
          {history.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Status History</h3>
              </div>
              <div className="px-6 py-4">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {history.map((event, eventIdx) => (
                      <li key={event.id}>
                        <div className="relative pb-8">
                          {eventIdx !== history.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                STATUS_CONFIG[event.to_status]?.dotColor.replace('bg-', 'bg-') || 'bg-gray-400'
                              }`}>
                                <div className="h-2 w-2 rounded-full bg-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">
                                  Changed to <span className="font-medium">{STATUS_CONFIG[event.to_status]?.label}</span>
                                </p>
                                {event.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{event.notes}</p>
                                )}
                              </div>
                              <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                                <div>{format(new Date(event.created_at), 'MMM dd, yyyy')}</div>
                                <div>{format(new Date(event.created_at), 'HH:mm')}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Purchase Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={confirmData.supplierReference}
                    onChange={(e) => setConfirmData(prev => ({ ...prev, supplierReference: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Supplier's PO reference"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={confirmData.expectedDeliveryDate}
                    onChange={(e) => setConfirmData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={confirmData.notes}
                    onChange={(e) => setConfirmData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirmation notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {confirmMutation.isLoading ? 'Confirming...' : 'Confirm Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4xl max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Items</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receiveItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.ordered_quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.received_quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.remaining_quantity}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            max={item.remaining_quantity}
                            value={item.receive_quantity}
                            onChange={(e) => updateReceiveQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={receiveMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {receiveMutation.isLoading ? 'Receiving...' : 'Receive Items'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Purchase Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Please provide a reason for cancellation..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isLoading || !cancelReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isLoading ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetail;