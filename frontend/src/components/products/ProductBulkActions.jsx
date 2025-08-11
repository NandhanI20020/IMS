import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  PriceChange as PriceChangeIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  Download as ExportIcon,
  ContentCopy as DuplicateIcon,
  Visibility as SetStatusIcon
} from '@mui/icons-material';

const ProductBulkActions = ({ open, onClose, selectedProducts = [], onAction }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [actionParams, setActionParams] = useState({});
  const [confirmAction, setConfirmAction] = useState(false);

  const bulkActions = [
    {
      id: 'edit-category',
      label: 'Change Category',
      icon: <CategoryIcon />,
      description: 'Update category for selected products',
      requiresParams: true,
      destructive: false
    },
    {
      id: 'edit-supplier',
      label: 'Change Supplier',
      icon: <BusinessIcon />,
      description: 'Update supplier for selected products',
      requiresParams: true,
      destructive: false
    },
    {
      id: 'edit-price',
      label: 'Update Prices',
      icon: <PriceChangeIcon />,
      description: 'Bulk update product prices',
      requiresParams: true,
      destructive: false
    },
    {
      id: 'edit-stock',
      label: 'Update Stock',
      icon: <InventoryIcon />,
      description: 'Bulk update stock quantities',
      requiresParams: true,
      destructive: false
    },
    {
      id: 'set-status',
      label: 'Change Status',
      icon: <SetStatusIcon />,
      description: 'Activate, deactivate, or archive products',
      requiresParams: true,
      destructive: false
    },
    {
      id: 'archive',
      label: 'Archive Products',
      icon: <ArchiveIcon />,
      description: 'Move selected products to archive',
      requiresParams: false,
      destructive: true
    },
    {
      id: 'unarchive',
      label: 'Unarchive Products',
      icon: <UnarchiveIcon />,
      description: 'Restore products from archive',
      requiresParams: false,
      destructive: false
    },
    {
      id: 'duplicate',
      label: 'Duplicate Products',
      icon: <DuplicateIcon />,
      description: 'Create copies of selected products',
      requiresParams: false,
      destructive: false
    },
    {
      id: 'export',
      label: 'Export Products',
      icon: <ExportIcon />,
      description: 'Export selected products to CSV/Excel',
      requiresParams: false,
      destructive: false
    },
    {
      id: 'delete',
      label: 'Delete Products',
      icon: <DeleteIcon />,
      description: 'Permanently delete selected products',
      requiresParams: false,
      destructive: true
    }
  ];

  const handleActionSelect = (actionId) => {
    setSelectedAction(actionId);
    setActionParams({});
    
    const action = bulkActions.find(a => a.id === actionId);
    if (!action?.requiresParams) {
      setConfirmAction(true);
    }
  };

  const handleParamChange = (key, value) => {
    setActionParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExecuteAction = () => {
    onAction(selectedAction, selectedProducts, actionParams);
    handleClose();
  };

  const handleClose = () => {
    setSelectedAction('');
    setActionParams({});
    setConfirmAction(false);
    onClose();
  };

  const renderActionParams = () => {
    const action = bulkActions.find(a => a.id === selectedAction);
    if (!action?.requiresParams) return null;

    switch (selectedAction) {
      case 'edit-category':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Category</InputLabel>
            <Select
              value={actionParams.category || ''}
              label="New Category"
              onChange={(e) => handleParamChange('category', e.target.value)}
            >
              <MenuItem value="Electronics">Electronics</MenuItem>
              <MenuItem value="Clothing">Clothing</MenuItem>
              <MenuItem value="Home & Garden">Home & Garden</MenuItem>
              <MenuItem value="Sports">Sports</MenuItem>
              <MenuItem value="Books">Books</MenuItem>
            </Select>
          </FormControl>
        );

      case 'edit-supplier':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Supplier</InputLabel>
            <Select
              value={actionParams.supplier || ''}
              label="New Supplier"
              onChange={(e) => handleParamChange('supplier', e.target.value)}
            >
              <MenuItem value="supplier1">Supplier A</MenuItem>
              <MenuItem value="supplier2">Supplier B</MenuItem>
              <MenuItem value="supplier3">Supplier C</MenuItem>
            </Select>
          </FormControl>
        );

      case 'edit-price':
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Price Update Type</InputLabel>
              <Select
                value={actionParams.priceType || ''}
                label="Price Update Type"
                onChange={(e) => handleParamChange('priceType', e.target.value)}
              >
                <MenuItem value="percentage">Percentage Change</MenuItem>
                <MenuItem value="fixed">Fixed Amount Change</MenuItem>
                <MenuItem value="set">Set Fixed Price</MenuItem>
              </Select>
            </FormControl>
            
            {actionParams.priceType && (
              <TextField
                fullWidth
                label={
                  actionParams.priceType === 'percentage' ? 'Percentage (%)' :
                  actionParams.priceType === 'fixed' ? 'Amount ($)' :
                  'New Price ($)'
                }
                type="number"
                value={actionParams.priceValue || ''}
                onChange={(e) => handleParamChange('priceValue', e.target.value)}
              />
            )}
          </Box>
        );

      case 'edit-stock':
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Stock Update Type</InputLabel>
              <Select
                value={actionParams.stockType || ''}
                label="Stock Update Type"
                onChange={(e) => handleParamChange('stockType', e.target.value)}
              >
                <MenuItem value="add">Add to Current Stock</MenuItem>
                <MenuItem value="subtract">Subtract from Current Stock</MenuItem>
                <MenuItem value="set">Set Fixed Stock</MenuItem>
              </Select>
            </FormControl>
            
            {actionParams.stockType && (
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={actionParams.stockValue || ''}
                onChange={(e) => handleParamChange('stockValue', e.target.value)}
              />
            )}
          </Box>
        );

      case 'set-status':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={actionParams.status || ''}
              label="New Status"
              onChange={(e) => handleParamChange('status', e.target.value)}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
              <MenuItem value="discontinued">Discontinued</MenuItem>
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const selectedActionData = bulkActions.find(a => a.id === selectedAction);
  const canExecute = !selectedActionData?.requiresParams || 
    (selectedAction === 'edit-category' && actionParams.category) ||
    (selectedAction === 'edit-supplier' && actionParams.supplier) ||
    (selectedAction === 'edit-price' && actionParams.priceType && actionParams.priceValue) ||
    (selectedAction === 'edit-stock' && actionParams.stockType && actionParams.stockValue) ||
    (selectedAction === 'set-status' && actionParams.status);

  if (confirmAction && selectedActionData) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm Bulk Action
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={selectedActionData.destructive ? "warning" : "info"}
            sx={{ mb: 2 }}
          >
            You are about to perform the following action on {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}:
          </Alert>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {selectedActionData.icon}
            <Typography variant="h6">
              {selectedActionData.label}
            </Typography>
          </Box>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            {selectedActionData.description}
          </Typography>

          {selectedAction === 'delete' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> This action cannot be undone. The selected products will be permanently deleted.
              </Typography>
            </Alert>
          )}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Selected Products: {selectedProducts.length}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={selectedActionData.destructive ? "error" : "primary"}
            onClick={handleExecuteAction}
          >
            {selectedActionData.destructive ? "Confirm Delete" : "Execute Action"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Actions
        <Typography variant="body2" color="textSecondary">
          {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {!selectedAction ? (
          <List>
            {bulkActions.map((action, index) => (
              <React.Fragment key={action.id}>
                <ListItemButton onClick={() => handleActionSelect(action.id)}>
                  <ListItemIcon>
                    {action.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={action.label}
                    secondary={action.description}
                  />
                  {action.destructive && (
                    <Chip label="Destructive" color="error" size="small" />
                  )}
                </ListItemButton>
                {index < bulkActions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {selectedActionData.icon}
              <Typography variant="h6">
                {selectedActionData.label}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              {selectedActionData.description}
            </Typography>

            {renderActionParams()}

            {selectedActionData.destructive && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This action may be irreversible. Please proceed with caution.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {selectedAction && (
          <Button onClick={() => setSelectedAction('')}>
            Back
          </Button>
        )}
        
        {selectedAction && selectedActionData?.requiresParams && (
          <Button
            variant="contained"
            disabled={!canExecute}
            onClick={() => setConfirmAction(true)}
          >
            Continue
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductBulkActions;