import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Avatar,
  IconButton,
  InputAdornment,
  Autocomplete,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  QrCode as QrCodeIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useQuery } from 'react-query';

import ImageUpload from '@/components/common/ImageUpload';
import { categoryApi, supplierApi } from '@/lib/api';

const steps = [
  'Basic Information',
  'Category & Classification',
  'Pricing & Costs',
  'Inventory & Stock',
  'Images & Media'
];

const ProductForm = ({ open, onClose, product, onSubmit, loading = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
    getValues,
    trigger
  } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      barcode: '',
      category: '',
      subcategory: '',
      brand: '',
      supplier: '',
      tags: [],
      sellingPrice: '',
      costPrice: '',
      discountPrice: '',
      tax: '',
      currency: 'USD',
      currentStock: '',
      minimumStock: '',
      maximumStock: '',
      reorderPoint: '',
      unit: 'pcs',
      weight: '',
      dimensions: {
        length: '',
        width: '',
        height: ''
      },
      images: [],
      active: true,
      trackStock: true,
      allowBackorder: false,
      featured: false
    }
  });

  const { fields: tagFields, append: appendTag, remove: removeTag } = useFieldArray({
    control,
    name: 'tags'
  });

  // Fetch categories and suppliers
  const { data: categories = [], error: categoriesError } = useQuery('categories', categoryApi.getCategories);
  const { data: suppliers = [], error: suppliersError } = useQuery('suppliers', supplierApi.getSuppliers);

  // Debug logging
  useEffect(() => {
    console.log('ProductForm - Categories:', categories);
    console.log('ProductForm - Categories error:', categoriesError);
    console.log('ProductForm - Suppliers:', suppliers);
    console.log('ProductForm - Suppliers error:', suppliersError);
  }, [categories, categoriesError, suppliers, suppliersError]);

  // Ensure suppliers and categories are arrays
  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
  const categoriesArray = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        barcode: product.barcode || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        brand: product.brand || '',
        supplier: product.supplier?.id || '',
        tags: product.tags || [],
        sellingPrice: product.sellingPrice || '',
        costPrice: product.costPrice || '',
        discountPrice: product.discountPrice || '',
        tax: product.tax || '',
        currency: product.currency || 'USD',
        currentStock: product.currentStock || '',
        minimumStock: product.minimumStock || '',
        maximumStock: product.maximumStock || '',
        reorderPoint: product.reorderPoint || '',
        unit: product.unit || 'pcs',
        weight: product.weight || '',
        dimensions: product.dimensions || { length: '', width: '', height: '' },
        images: product.images || [],
        active: product.active !== false,
        trackStock: product.trackStock !== false,
        allowBackorder: product.allowBackorder || false,
        featured: product.featured || false
      });
    } else {
      reset();
    }
  }, [product, reset]);

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setSkipped(new Set());
    }
  }, [open]);

  const watchedValues = watch();

  const isStepOptional = (step) => {
    return step === 4; // Images step is optional
  };

  const isStepSkipped = (step) => {
    return skipped.has(step);
  };

  const handleNext = () => {
    // Validate current step before proceeding
    const currentStepFields = getStepFields(activeStep);
    console.log('Current step fields:', currentStepFields);
    console.log('Current step:', activeStep);
    
    const isValid = currentStepFields.every(field => {
      const value = getValues(field);
      console.log(`Field ${field} value:`, value);
      if (field === 'category' || field === 'supplier') {
        return value && value !== '';
      }
      return true;
    });

    console.log('Step validation result:', isValid);

    if (!isValid) {
      // Trigger validation for current step
      trigger(currentStepFields);
      return;
    }

    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped((prevSkipped) => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const handleReset = () => {
    setActiveStep(0);
    reset();
  };

  const generateSKU = () => {
    const category = watchedValues.category?.substring(0, 3).toUpperCase() || 'PRD';
    const brand = watchedValues.brand?.substring(0, 3).toUpperCase() || 'GEN';
    const timestamp = Date.now().toString().slice(-6);
    const sku = `${category}-${brand}-${timestamp}`;
    setValue('sku', sku);
  };

  const onFormSubmit = (data) => {
    console.log('ProductForm - Form data being submitted:', data);
    console.log('ProductForm - Category value:', data.category);
    console.log('ProductForm - Supplier value:', data.supplier);
    console.log('ProductForm - Categories array:', categoriesArray);
    
    // Validate required fields before submission
    if (!data.category) {
      console.error('Category is required');
      return;
    }
    
    if (!data.supplier) {
      console.error('Supplier is required');
      return;
    }
    
    // Validate price comparison
    const sellingPrice = parseFloat(data.sellingPrice || 0);
    const costPrice = parseFloat(data.costPrice || 0);
    
    if (sellingPrice < costPrice) {
      console.error('Selling price must be greater than or equal to cost price');
      return;
    }
    
    onSubmit(data);
  };

  const getStepFields = (step) => {
    switch (step) {
      case 0:
        return ['name', 'sku'];
      case 1:
        return ['category', 'supplier'];
      case 2:
        return ['sellingPrice', 'costPrice'];
      case 3:
        return ['currentStock', 'minimumStock'];
      default:
        return [];
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
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
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={generateSKU} size="small">
                            <QrCodeIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

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
                    rows={4}
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="barcode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Barcode"
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Brand"
                    variant="outlined"
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="category"
                control={control}
                rules={{ required: 'Category is required' }}
                render={({ field }) => {
                  console.log('Category field value:', field.value);
                  return (
                    <FormControl fullWidth error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category" value={field.value || ''}>
                        <MenuItem value="">
                          <em>Select a category</em>
                        </MenuItem>
                        {categoriesArray.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>{errors.category?.message}</FormHelperText>
                    </FormControl>
                  );
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="subcategory"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Subcategory"
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {tagFields.map((field, index) => (
                  <Chip
                    key={field.id}
                    label={field.value}
                    onDelete={() => removeTag(index)}
                    variant="outlined"
                  />
                ))}
              </Box>
              <TextField
                fullWidth
                label="Add Tag"
                variant="outlined"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    appendTag({ value: e.target.value.trim() });
                    e.target.value = '';
                  }
                }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Controller
                name="sellingPrice"
                control={control}
                rules={{ 
                  required: 'Selling price is required', 
                  min: { value: 0, message: 'Selling price must be positive' },
                  validate: (value) => {
                    const costPrice = getValues('costPrice');
                    if (costPrice && parseFloat(value) < parseFloat(costPrice)) {
                      return 'Selling price must be greater than or equal to cost price';
                    }
                    return true;
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Selling Price"
                    type="number"
                    error={!!errors.sellingPrice}
                    helperText={errors.sellingPrice?.message}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="costPrice"
                control={control}
                rules={{ 
                  min: { value: 0, message: 'Cost price must be positive' },
                  validate: (value) => {
                    const sellingPrice = getValues('sellingPrice');
                    if (sellingPrice && parseFloat(value) > parseFloat(sellingPrice)) {
                      return 'Cost price must be less than or equal to selling price';
                    }
                    return true;
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Cost Price"
                    type="number"
                    error={!!errors.costPrice}
                    helperText={errors.costPrice?.message}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="discountPrice"
                control={control}
                rules={{ min: 0 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Discount Price"
                    type="number"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="tax"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tax Rate (%)"
                    type="number"
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select {...field} label="Currency">
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                      <MenuItem value="JPY">JPY</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Supplier</InputLabel>
                    <Select {...field} label="Supplier">
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
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="trackStock"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        color="primary"
                      />
                    }
                    label="Track Stock"
                  />
                )}
              />
            </Grid>

            {watchedValues.trackStock && (
              <>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="currentStock"
                    control={control}
                    rules={{ required: 'Current stock is required', min: 0 }}
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

                <Grid item xs={12} md={3}>
                  <Controller
                    name="minimumStock"
                    control={control}
                    rules={{ min: 0 }}
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

                <Grid item xs={12} md={3}>
                  <Controller
                    name="maximumStock"
                    control={control}
                    rules={{ min: 0 }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Maximum Stock"
                        type="number"
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="reorderPoint"
                    control={control}
                    rules={{ min: 0 }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Reorder Point"
                        type="number"
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select {...field} label="Unit">
                      <MenuItem value="pcs">Pieces</MenuItem>
                      <MenuItem value="kg">Kilograms</MenuItem>
                      <MenuItem value="lbs">Pounds</MenuItem>
                      <MenuItem value="liters">Liters</MenuItem>
                      <MenuItem value="gallons">Gallons</MenuItem>
                      <MenuItem value="meters">Meters</MenuItem>
                      <MenuItem value="feet">Feet</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Weight"
                    type="number"
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Dimensions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Controller
                    name="dimensions.length"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Length"
                        type="number"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Controller
                    name="dimensions.width"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Width"
                        type="number"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Controller
                    name="dimensions.height"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Height"
                        type="number"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Controller
                  name="allowBackorder"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={onChange}
                          color="primary"
                        />
                      }
                      label="Allow Backorder"
                    />
                  )}
                />
                <Controller
                  name="featured"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={onChange}
                          color="primary"
                        />
                      }
                      label="Featured Product"
                    />
                  )}
                />
                <Controller
                  name="active"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={onChange}
                          color="primary"
                        />
                      }
                      label="Active"
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Product Images
              </Typography>
              <Controller
                name="images"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ImageUpload
                    images={value || []}
                    onChange={onChange}
                    maxImages={5}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {product ? 'Edit Product' : 'Add New Product'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => {
            const stepProps = {};
            const labelProps = {};

            if (isStepOptional(index)) {
              labelProps.optional = (
                <Typography variant="caption">Optional</Typography>
              );
            }

            if (isStepSkipped(index)) {
              stepProps.completed = false;
            }

            return (
              <Step key={label} {...stepProps}>
                <StepLabel {...labelProps}>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          {renderStepContent(activeStep)}
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {activeStep !== 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        
        {isStepOptional(activeStep) && (
          <Button onClick={handleSkip}>
            Skip
          </Button>
        )}
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit(onFormSubmit)}
            disabled={loading}
          >
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductForm;