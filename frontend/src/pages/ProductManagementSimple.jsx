import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { productApi, categoryApi, supplierApi } from '@/lib/api';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

const ProductManagementSimple = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const queryClient = useQueryClient();

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      category: '',
      price: '',
      costPrice: '',
      currentStock: '',
      minimumStock: '',
      supplier: '',
      status: 'active'
    }
  });

  // Fetch products
  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['products', page, rowsPerPage],
    () => productApi.getProducts({
      page: page + 1,
      limit: rowsPerPage
    }),
    {
      keepPreviousData: true,
      placeholderData: {
        products: [],
        total: 0
      }
    }
  );

  // Fetch categories and suppliers
  const { data: categories = [], error: categoriesError } = useQuery('categories', categoryApi.getCategories);
  const { data: suppliers = [], error: suppliersError } = useQuery('suppliers', supplierApi.getSuppliers);

  // Debug logging
  useEffect(() => {
    console.log('ProductManagementSimple - Categories:', categories);
    console.log('ProductManagementSimple - Categories error:', categoriesError);
    console.log('ProductManagementSimple - Suppliers:', suppliers);
    console.log('ProductManagementSimple - Suppliers error:', suppliersError);
  }, [categories, categoriesError, suppliers, suppliersError]);

  // Ensure suppliers and categories are arrays
  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
  const categoriesArray = Array.isArray(categories) ? categories : [];

  // Mutations
  const createProductMutation = useMutation(productApi.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setFormOpen(false);
      setSelectedProduct(null);
      reset();
      showSnackbar('Product created successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to create product', 'error');
    }
  });

  const updateProductMutation = useMutation(productApi.updateProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setFormOpen(false);
      setSelectedProduct(null);
      reset();
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

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  // Helper functions
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleMenuOpen = (event, product) => {
    setAnchorEl(event.currentTarget);
    setCurrentProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentProduct(null);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    reset();
    setFormOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    // Populate form with product data
    reset({
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      category: product.categoryId || product.categories?.id || product.category_id || '',
      price: product.price || '',
      costPrice: product.costPrice || '',
      currentStock: product.currentStock || '',
      minimumStock: product.minimumStock || '',
      supplier: product.supplier?.id || product.suppliers?.id || product.supplierId || product.supplier_id || '',
      status: product.status || 'active'
    });
    setFormOpen(true);
    handleMenuClose();
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleFormSubmit = (data) => {
    if (selectedProduct) {
      // Update existing product
      updateProductMutation.mutate({
        id: selectedProduct.id,
        ...data,
        price: parseFloat(data.price) || 0,
        costPrice: parseFloat(data.costPrice) || 0,
        currentStock: parseInt(data.currentStock) || 0,
        minimumStock: parseInt(data.minimumStock) || 0
      });
    } else {
      // Create new product
      createProductMutation.mutate({
        ...data,
        price: parseFloat(data.price) || 0,
        costPrice: parseFloat(data.costPrice) || 0,
        currentStock: parseInt(data.currentStock) || 0,
        minimumStock: parseInt(data.minimumStock) || 0
      });
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedProduct(null);
    reset();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStockLevelColor = (currentStock, minimumStock) => {
    if (currentStock <= 0) return 'error';
    if (currentStock <= minimumStock) return 'warning';
    return 'success';
  };

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
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddProduct}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Products Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography>Loading products...</Typography>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary">No products found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Avatar
                        src={product.imageUrl}
                        variant="rounded"
                        sx={{ width: 50, height: 50 }}
                      >
                        {product.name.charAt(0)}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          SKU: {product.sku}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          product.category ||
                          categoriesArray.find(c => c.id === (product.categoryId || product.category_id))?.name ||
                          product.categories?.name || 'Uncategorized'
                        } 
                        size="small" 
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {product.currentStock?.toLocaleString() || 0}
                        </Typography>
                        <Chip
                          label={
                            product.currentStock <= 0 ? 'Out' :
                            product.currentStock <= product.minimumStock ? 'Low' : 'Good'
                          }
                          size="small"
                          color={getStockLevelColor(product.currentStock, product.minimumStock)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        ${product.price?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.supplier?.name ||
                         product.suppliers?.name ||
                         suppliersArray.find(s => s.id === (product.supplierId || product.supplier_id))?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={product.status} 
                        size="small" 
                        color={product.status === 'active' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, product)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalProducts}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditProduct(currentProduct)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteProduct(currentProduct)}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Product Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={handleFormClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              {/* Product Name */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Product name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Product Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* SKU */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="sku"
                  control={control}
                  rules={{ required: 'SKU is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="SKU"
                      error={!!errors.sku}
                      helperText={errors.sku?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Category */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: 'Category is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {categoriesArray.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>{errors.category?.message}</FormHelperText>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Supplier */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="supplier"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Supplier</InputLabel>
                      <Select {...field} label="Supplier">
                        <MenuItem value="">
                          <em>No Supplier</em>
                        </MenuItem>
                        {suppliersArray.map((supplier) => (
                          <MenuItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Price */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="price"
                  control={control}
                  rules={{ 
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Selling Price ($)"
                      type="number"
                      step="0.01"
                      error={!!errors.price}
                      helperText={errors.price?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Cost Price */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="costPrice"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Cost Price ($)"
                      type="number"
                      step="0.01"
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Current Stock */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="currentStock"
                  control={control}
                  rules={{ 
                    required: 'Current stock is required',
                    min: { value: 0, message: 'Stock cannot be negative' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Current Stock"
                      type="number"
                      error={!!errors.currentStock}
                      helperText={errors.currentStock?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Minimum Stock */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="minimumStock"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Minimum Stock"
                      type="number"
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="discontinued">Discontinued</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleFormClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createProductMutation.isLoading || updateProductMutation.isLoading}
            >
              {createProductMutation.isLoading || updateProductMutation.isLoading
                ? 'Saving...'
                : selectedProduct
                ? 'Update Product'
                : 'Add Product'
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar for notifications */}
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

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
      />
    </Box>
  );
};

export default ProductManagementSimple;