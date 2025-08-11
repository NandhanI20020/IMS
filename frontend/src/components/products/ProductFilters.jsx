import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Grid,
  Slider,
  InputAdornment,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { categoryApi, supplierApi } from '@/lib/api';

const ProductFilters = ({ 
  open, 
  onClose, 
  filters, 
  onFiltersChange, 
  searchTerm, 
  onSearchChange 
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [stockRange, setStockRange] = useState([0, 100]);

  // Fetch filter options
  const { data: categories = [] } = useQuery('categories', categoryApi.getCategories);
  const { data: suppliers = [] } = useQuery('suppliers', supplierApi.getSuppliers);

  // Ensure suppliers and categories are arrays
  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
  const categoriesArray = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    setLocalFilters(filters);
    setLocalSearchTerm(searchTerm);
  }, [filters, searchTerm, open]);

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onSearchChange(localSearchTerm);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      category: '',
      supplier: '',
      status: 'active',
      stockLevel: '',
      priceMin: '',
      priceMax: '',
      stockMin: '',
      stockMax: '',
      featured: false,
      lowStock: false,
      outOfStock: false
    };
    setLocalFilters(clearedFilters);
    setLocalSearchTerm('');
    setPriceRange([0, 1000]);
    setStockRange([0, 100]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localSearchTerm) count++;
    if (localFilters.category) count++;
    if (localFilters.supplier) count++;
    if (localFilters.status !== 'active') count++;
    if (localFilters.stockLevel) count++;
    if (localFilters.priceMin || localFilters.priceMax) count++;
    if (localFilters.stockMin || localFilters.stockMax) count++;
    if (localFilters.featured) count++;
    if (localFilters.lowStock) count++;
    if (localFilters.outOfStock) count++;
    return count;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterIcon />
        Product Filters
        {getActiveFilterCount() > 0 && (
          <Chip 
            label={`${getActiveFilterCount()} active`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Search */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search Products"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: localSearchTerm && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => setLocalSearchTerm('')}
                    >
                      <ClearIcon />
                    </Button>
                  </InputAdornment>
                )
              }}
              placeholder="Search by name, SKU, barcode, or description..."
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
              Categories & Classification
            </Typography>
          </Grid>

          {/* Category */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={localFilters.category}
                label="Category"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categoriesArray.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Supplier */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Supplier</InputLabel>
              <Select
                value={localFilters.supplier}
                label="Supplier"
                onChange={(e) => handleFilterChange('supplier', e.target.value)}
              >
                <MenuItem value="">All Suppliers</MenuItem>
                {suppliersArray.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider />
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
              Status & Availability
            </Typography>
          </Grid>

          {/* Status */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={localFilters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Stock Level */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Stock Level</InputLabel>
              <Select
                value={localFilters.stockLevel}
                label="Stock Level"
                onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
              >
                <MenuItem value="">All Stock Levels</MenuItem>
                <MenuItem value="in-stock">In Stock</MenuItem>
                <MenuItem value="low-stock">Low Stock</MenuItem>
                <MenuItem value="out-of-stock">Out of Stock</MenuItem>
                <MenuItem value="discontinued">Discontinued</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Quick Filters */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localFilters.featured || false}
                    onChange={(e) => handleFilterChange('featured', e.target.checked)}
                  />
                }
                label="Featured Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={localFilters.lowStock || false}
                    onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
                  />
                }
                label="Low Stock"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={localFilters.outOfStock || false}
                    onChange={(e) => handleFilterChange('outOfStock', e.target.checked)}
                  />
                }
                label="Out of Stock"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
              Price Range
            </Typography>
          </Grid>

          {/* Price Range */}
          <Grid item xs={12}>
            <Box sx={{ px: 2 }}>
              <Slider
                value={priceRange}
                onChange={(e, newValue) => {
                  setPriceRange(newValue);
                  handleFilterChange('priceMin', newValue[0]);
                  handleFilterChange('priceMax', newValue[1]);
                }}
                valueLabelDisplay="auto"
                min={0}
                max={1000}
                step={10}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 250, label: '$250' },
                  { value: 500, label: '$500' },
                  { value: 750, label: '$750' },
                  { value: 1000, label: '$1000+' }
                ]}
              />
            </Box>
          </Grid>

          {/* Manual Price Input */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Price"
              type="number"
              value={localFilters.priceMin}
              onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Price"
              type="number"
              value={localFilters.priceMax}
              onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
              Stock Range
            </Typography>
          </Grid>

          {/* Stock Range */}
          <Grid item xs={12}>
            <Box sx={{ px: 2 }}>
              <Slider
                value={stockRange}
                onChange={(e, newValue) => {
                  setStockRange(newValue);
                  handleFilterChange('stockMin', newValue[0]);
                  handleFilterChange('stockMax', newValue[1]);
                }}
                valueLabelDisplay="auto"
                min={0}
                max={1000}
                step={10}
                marks={[
                  { value: 0, label: '0' },
                  { value: 250, label: '250' },
                  { value: 500, label: '500' },
                  { value: 750, label: '750' },
                  { value: 1000, label: '1000+' }
                ]}
              />
            </Box>
          </Grid>

          {/* Manual Stock Input */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Stock"
              type="number"
              value={localFilters.stockMin}
              onChange={(e) => handleFilterChange('stockMin', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Stock"
              type="number"
              value={localFilters.stockMax}
              onChange={(e) => handleFilterChange('stockMax', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClearFilters} color="inherit">
          Clear All
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApplyFilters}
          startIcon={<FilterIcon />}
        >
          Apply Filters ({getActiveFilterCount()})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductFilters;