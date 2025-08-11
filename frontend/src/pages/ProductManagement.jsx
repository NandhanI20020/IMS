import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Copy as CopyIcon,
  FilterList as FilterIcon,
  Upload as UploadIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { productApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import ProductForm from '@/components/products/ProductForm';
import ProductPreview from '@/components/products/ProductPreview';
import ProductBulkActions from '@/components/products/ProductBulkActions';
import ProductImport from '@/components/products/ProductImport';
import BarcodeScanner from '@/components/products/BarcodeScanner';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

const ProductManagement = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    supplier: '',
    status: 'active',
    stockLevel: ''
  });
  const [sortModel, setSortModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25
  });
  
  // Dialog states
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  
  // Notification states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch products with filters and search
  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['products', debouncedSearchTerm, filters, sortModel, paginationModel],
    () => productApi.getProducts({
      search: debouncedSearchTerm,
      filters,
      sort: sortModel[0],
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Provide default data structure to prevent undefined errors
      placeholderData: {
        products: [],
        total: 0,
        page: 1,
        totalPages: 1
      }
    }
  );

  // Mutations
  const createProductMutation = useMutation(productApi.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setProductFormOpen(false);
      setSelectedProduct(null);
      showSnackbar('Product created successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to create product', 'error');
    }
  });

  const updateProductMutation = useMutation(productApi.updateProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setProductFormOpen(false);
      setSelectedProduct(null);
      showSnackbar('Product updated successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to update product', 'error');
    }
  });

  const deleteProductMutation = useMutation(productApi.deleteProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showSnackbar('Product deleted successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to delete product', 'error');
    }
  });

  const archiveProductMutation = useMutation(productApi.archiveProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showSnackbar('Product archived successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to archive product', 'error');
    }
  });

  const duplicateProductMutation = useMutation(productApi.duplicateProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showSnackbar('Product duplicated successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to duplicate product', 'error');
    }
  });

  // Helper functions
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleMenuOpen = useCallback((event, product) => {
    setAnchorEl(event.currentTarget);
    setCurrentProduct(product);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setCurrentProduct(null);
  }, []);

  const handleEdit = useCallback((product) => {
    setSelectedProduct(product);
    setProductFormOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleView = useCallback((product) => {
    setSelectedProduct(product);
    setPreviewOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleDuplicate = useCallback((product) => {
    duplicateProductMutation.mutate(product.id);
    handleMenuClose();
  }, [duplicateProductMutation, handleMenuClose]);

  const handleDelete = useCallback((product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleArchive = useCallback((product) => {
    archiveProductMutation.mutate({
      id: product.id,
      archived: !product.archived
    });
    handleMenuClose();
  }, [archiveProductMutation, handleMenuClose]);

  const handleBulkAction = useCallback((action, productIds) => {
    // Handle bulk actions
    console.log('Bulk action:', action, productIds);
    setBulkActionsOpen(false);
  }, []);

  const handleImportComplete = useCallback((importedCount) => {
    queryClient.invalidateQueries(['products']);
    setImportOpen(false);
    showSnackbar(`Successfully imported ${importedCount} products`, 'success');
  }, [queryClient, showSnackbar]);

  const handleScanComplete = useCallback((scannedData) => {
    // Handle barcode scan result
    console.log('Scanned:', scannedData);
    setScannerOpen(false);
    // Optionally search for the product or create new one
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [deleteProductMutation, productToDelete]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  }, []);

  // DataGrid columns
  const columns = useMemo(() => [
    {
      field: 'image',
      headerName: 'Image',
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box 
          sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: 1,
            backgroundColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {params.row.imageUrl ? (
            <img 
              src={params.row.imageUrl} 
              alt={params.row.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No Image
            </Typography>
          )}
        </Box>
      )
    },
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            SKU: {params.row.sku}
          </Typography>
        </Box>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          variant="outlined"
          color="primary"
        />
      )
    },
    {
      field: 'currentStock',
      headerName: 'Stock',
      width: 120,
      type: 'number',
      renderCell: (params) => {
        const stockLevel = params.row.currentStock;
        const minStock = params.row.minimumStock;
        const isLow = stockLevel <= minStock;
        const isCritical = stockLevel <= minStock * 0.5;
        
        return (
          <Box>
            <Typography 
              variant="body2" 
              color={isCritical ? 'error' : isLow ? 'warning.main' : 'text.primary'}
              fontWeight="medium"
            >
              {stockLevel?.toLocaleString() || 0}
            </Typography>
            {isLow && (
              <Typography variant="caption" color="error">
                Low Stock
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          ${params.value?.toFixed(2) || '0.00'}
        </Typography>
      )
    },
    {
      field: 'supplier',
      headerName: 'Supplier',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.supplier?.name || 'N/A'}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value;
        const color = status === 'active' ? 'success' : 
                     status === 'inactive' ? 'default' : 'warning';
        
        return (
          <Chip 
            label={status} 
            size="small" 
            color={color}
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, params.row)}
        >
          <MoreVertIcon />
        </IconButton>
      )
    }
  ], [handleMenuOpen]);

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  // Handle loading and error states
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load products: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Product Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={() => setScannerOpen(true)}
          >
            Scan
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedProduct(null);
              setProductFormOpen(true);
            }}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Bulk Actions - Temporarily disabled while fixing selection */}
      {false && selectedProducts.length > 0 && (
        <Box sx={{ p: 2, mb: 2, backgroundColor: 'primary.50' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </Typography>
            <Button
              variant="contained"
              onClick={() => setBulkActionsOpen(true)}
            >
              Bulk Actions
            </Button>
          </Box>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={products}
          columns={columns}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          checkboxSelection={false}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={totalProducts}
          paginationMode="server"
          sortingMode="server"
          getRowId={(row) => row.id || row.sku || Math.random()}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 }
            }
          }}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleView(currentProduct)}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleEdit(currentProduct)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDuplicate(currentProduct)}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleArchive(currentProduct)}>
          <ListItemIcon>
            {currentProduct?.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {currentProduct?.archived ? 'Unarchive' : 'Archive'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDelete(currentProduct)}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <ProductForm
        open={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSubmit={(data) => {
          if (selectedProduct) {
            updateProductMutation.mutate({ id: selectedProduct.id, ...data });
          } else {
            createProductMutation.mutate(data);
          }
        }}
        loading={createProductMutation.isLoading || updateProductMutation.isLoading}
      />

      <ProductBulkActions
        open={bulkActionsOpen}
        onClose={() => setBulkActionsOpen(false)}
        selectedProducts={selectedProducts}
        onAction={handleBulkAction}
      />

      <ProductImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={handleImportComplete}
      />

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanComplete}
      />

      <ProductPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        product={selectedProduct}
      />

      <ProductFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductManagement;