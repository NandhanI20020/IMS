import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  QrCode as BarcodeIcon,
  Scale as WeightIcon,
  Straighten as DimensionsIcon,
  Star as StarIcon,
  Visibility as ActiveIcon,
  VisibilityOff as InactiveIcon,
  Archive as ArchiveIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const ProductPreview = ({ open, onClose, product, onEdit }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!product) return null;

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStockLevelColor = (currentStock, minimumStock) => {
    if (currentStock <= 0) return 'error';
    if (currentStock <= minimumStock) return 'warning';
    if (currentStock <= minimumStock * 2) return 'info';
    return 'success';
  };

  const getStockLevelText = (currentStock, minimumStock) => {
    if (currentStock <= 0) return 'Out of Stock';
    if (currentStock <= minimumStock) return 'Low Stock';
    if (currentStock <= minimumStock * 2) return 'Moderate Stock';
    return 'Good Stock';
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Product Images */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardMedia
            component="img"
            height="300"
            image={product.imageUrl || '/api/placeholder/300/300'}
            alt={product.name}
            sx={{ objectFit: 'cover' }}
          />
        </Card>
        
        {product.images && product.images.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {product.images.slice(1, 4).map((image, index) => (
              <Card key={index} sx={{ width: 60, height: 60 }}>
                <CardMedia
                  component="img"
                  height="60"
                  image={image.url}
                  alt={`${product.name} ${index + 2}`}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
            ))}
            {product.images.length > 4 && (
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  backgroundColor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1
                }}
              >
                <Typography variant="caption">
                  +{product.images.length - 4}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Grid>

      {/* Product Details */}
      <Grid item xs={12} md={8}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h4" component="h1">
              {product.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {product.featured && (
                <Chip
                  icon={<StarIcon />}
                  label="Featured"
                  color="warning"
                  size="small"
                />
              )}
              <Chip
                icon={product.active ? <ActiveIcon /> : <InactiveIcon />}
                label={product.active ? 'Active' : 'Inactive'}
                color={product.active ? 'success' : 'default'}
                size="small"
              />
              {product.archived && (
                <Chip
                  icon={<ArchiveIcon />}
                  label="Archived"
                  color="default"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Typography variant="body1" color="textSecondary" paragraph>
            {product.description || 'No description available'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6" color="primary">
                  ${product.sellingPrice?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Selling Price
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6">
                  ${product.costPrice?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Cost Price
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6">
                  {product.currentStock?.toLocaleString() || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Current Stock
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Chip
                  label={getStockLevelText(product.currentStock, product.minimumStock)}
                  color={getStockLevelColor(product.currentStock, product.minimumStock)}
                  size="small"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                  Stock Status
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Grid>

      {/* Product Information */}
      <Grid item xs={12}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Product Information
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon><BarcodeIcon /></ListItemIcon>
                <ListItemText 
                  primary="SKU" 
                  secondary={product.sku || 'Not set'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><BarcodeIcon /></ListItemIcon>
                <ListItemText 
                  primary="Barcode" 
                  secondary={product.barcode || 'Not set'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText 
                  primary="Category" 
                  secondary={product.category || 'Uncategorized'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><BusinessIcon /></ListItemIcon>
                <ListItemText 
                  primary="Supplier" 
                  secondary={product.supplier?.name || 'Not assigned'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><WeightIcon /></ListItemIcon>
                <ListItemText 
                  primary="Weight" 
                  secondary={product.weight ? `${product.weight} ${product.weightUnit || 'kg'}` : 'Not specified'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><DimensionsIcon /></ListItemIcon>
                <ListItemText 
                  primary="Dimensions" 
                  secondary={
                    product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height)
                      ? `${product.dimensions.length || 0} × ${product.dimensions.width || 0} × ${product.dimensions.height || 0} cm`
                      : 'Not specified'
                  } 
                />
              </ListItem>
            </List>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );

  const renderInventoryTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stock Information
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Current Stock" 
                  secondary={`${product.currentStock?.toLocaleString() || 0} ${product.unit || 'units'}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Minimum Stock" 
                  secondary={`${product.minimumStock?.toLocaleString() || 0} ${product.unit || 'units'}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Maximum Stock" 
                  secondary={`${product.maximumStock?.toLocaleString() || 'Not set'} ${product.unit || 'units'}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Reorder Point" 
                  secondary={`${product.reorderPoint?.toLocaleString() || 'Not set'} ${product.unit || 'units'}`} 
                />
              </ListItem>
            </List>
            
            {product.currentStock <= product.minimumStock && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Stock level is below minimum threshold. Consider reordering.
              </Alert>
            )}
          </Box>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stock Settings
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Track Stock" 
                  secondary={product.trackStock ? 'Yes' : 'No'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Allow Backorder" 
                  secondary={product.allowBackorder ? 'Yes' : 'No'} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Unit of Measure" 
                  secondary={product.unit || 'pcs'} 
                />
              </ListItem>
            </List>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );

  const renderHistoryTab = () => (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Mock data - replace with actual audit history */}
              <TableRow>
                <TableCell>{format(new Date(), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell>Stock Updated</TableCell>
                <TableCell>John Doe</TableCell>
                <TableCell>Stock increased from 45 to 50</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{format(new Date(Date.now() - 86400000), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell>Price Updated</TableCell>
                <TableCell>Jane Smith</TableCell>
                <TableCell>Price changed from $24.99 to $29.99</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{format(new Date(Date.now() - 172800000), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell>Product Created</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Product added to catalog</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Card>
  );

  const tabContent = [
    renderOverviewTab(),
    renderInventoryTab(),
    renderHistoryTab()
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            Product Details
          </Typography>
          <Typography variant="body2" color="textSecondary">
            SKU: {product.sku}
          </Typography>
        </Box>
        
        <Box>
          {onEdit && (
            <IconButton onClick={() => onEdit(product)} color="primary">
              <EditIcon />
            </IconButton>
          )}
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Inventory" />
            <Tab label="History" />
          </Tabs>
        </Box>

        {tabContent[activeTab]}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(product)}
          >
            Edit Product
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductPreview;