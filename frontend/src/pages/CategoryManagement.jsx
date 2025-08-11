import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  FolderIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { categoryApi } from '../lib/api';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent_id: '',
    sort_order: 0,
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchCategoryTree();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('Fetching categories...');
      const categoriesData = await categoryApi.getCategories();
      console.log('Fetched categories:', categoriesData);
      console.log('Categories type:', typeof categoriesData);
      console.log('Categories length:', categoriesData?.length);
      
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
        console.log('Categories set successfully:', categoriesData.length, 'items');
      } else {
        console.error('Categories data is not an array:', categoriesData);
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryTree = async () => {
    try {
      const response = await categoryApi.getCategories();
      // Build tree structure from flat categories
      const categoryMap = new Map();
      const rootCategories = [];

      // Create map of all categories
      response.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      // Build tree
      response.forEach(category => {
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(category.id));
          }
        } else {
          rootCategories.push(categoryMap.get(category.id));
        }
      });

      setCategoryTree(rootCategories);
    } catch (error) {
      console.error('Failed to fetch category tree:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => {
        fetchCategories();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const openModal = (category = null) => {
    setEditingCategory(category);
    setFormData({
      name: category?.name || '',
      code: category?.code || '',
      description: category?.description || '',
      parent_id: category?.parent_id || '',
      sort_order: category?.sort_order || 0,
      is_active: category?.is_active ?? true
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      parent_id: '',
      sort_order: 0,
      is_active: true
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Category code is required';
    }
    
    if (formData.sort_order < 0) {
      newErrors.sort_order = 'Sort order must be non-negative';
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
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        sort_order: parseInt(formData.sort_order)
      };

      if (editingCategory) {
        await categoryApi.updateCategory({ id: editingCategory.id, ...submitData });
      } else {
        await categoryApi.createCategory(submitData);
      }
      
      closeModal();
      fetchCategories();
      fetchCategoryTree();
    } catch (error) {
      console.error('Failed to save category:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save category';
      setErrors({ submit: errorMessage });
    }
  };

  const handleDelete = async () => {
    try {
      await categoryApi.deleteCategory(deleteDialog.category.id);
      setDeleteDialog({ open: false, category: null });
      fetchCategories();
      fetchCategoryTree();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="tree-node">
        <div 
          className="flex items-center py-2 px-3 hover:bg-gray-50 rounded-md"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="w-5 h-5 mr-2 flex items-center justify-center"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-5 h-5 mr-2" />
            )}
            
            <FolderIcon className="w-5 h-5 text-blue-500 mr-2" />
            
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{node.name}</span>
                <span className="ml-2 text-sm text-gray-500">({node.code})</span>
                {!node.is_active && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-sm text-gray-600 mt-1">{node.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openModal(node)}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteDialog({ open: true, category: node })}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {categories.map((category) => (
          <li key={category.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <FolderIcon className="w-5 h-5 text-blue-500 mr-3" />
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      <span className="ml-2 text-sm text-gray-500">({category.code})</span>
                      {!category.is_active && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>Sort Order: {category.sort_order}</span>
                      {category.parent_id && (
                        <span className="ml-4">
                          Parent: {categories.find(c => c.id === category.parent_id)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openModal(category)}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteDialog({ open: true, category })}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
              <p className="text-gray-600 mt-1">Organize and manage product categories</p>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Category
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">View:</span>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 text-sm rounded-md ${
                  viewMode === 'tree' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tree
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <LoadingSpinner />
                </div>
              ) : categories.length > 0 ? (
                viewMode === 'tree' ? (
                  <div className="space-y-1">
                    {categoryTree.map(node => renderTreeNode(node))}
                  </div>
                ) : (
                  renderListView()
                )
              ) : (
                <div className="text-center py-12">
                  <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating a new category'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                
                {errors.submit && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {errors.submit}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter category name"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter category code"
                    />
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="3"
                      placeholder="Enter category description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category
                    </label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select parent category (optional)</option>
                      {categories.filter(c => c.id !== editingCategory?.id).map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.sort_order ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors.sort_order && <p className="text-red-500 text-xs mt-1">{errors.sort_order}</p>}
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
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
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, category: null })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteDialog.category?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
};

export default CategoryManagement;