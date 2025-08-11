import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  Link
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const steps = ['Upload File', 'Map Columns', 'Validate Data', 'Import'];

const requiredFields = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'sku', label: 'SKU', required: true },
  { key: 'price', label: 'Price', required: true },
  { key: 'category', label: 'Category', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'stock', label: 'Current Stock', required: false },
  { key: 'minStock', label: 'Minimum Stock', required: false },
  { key: 'supplier', label: 'Supplier', required: false },
  { key: 'barcode', label: 'Barcode', required: false },
  { key: 'weight', label: 'Weight', required: false }
];

const ProductImport = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResults, setValidationResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(csv|xlsx|xls)$/)) {
      setErrors(['Please upload a CSV or Excel file']);
      return;
    }

    setFile(uploadedFile);
    setErrors([]);
    
    // Parse CSV file
    if (uploadedFile.type === 'text/csv' || uploadedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const headerLine = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const dataLines = lines.slice(1).filter(line => line.trim()).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );
        
        setHeaders(headerLine);
        setCsvData(dataLines);
        setActiveStep(1);
      };
      reader.readAsText(uploadedFile);
    } else {
      // For Excel files, you would need a library like xlsx
      setErrors(['Excel file parsing not implemented yet. Please use CSV format.']);
    }
  };

  const handleColumnMapping = (field, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  const validateData = () => {
    const results = [];
    const requiredMappings = requiredFields.filter(f => f.required);
    
    // Check if all required fields are mapped
    const missingRequired = requiredMappings.filter(field => 
      columnMapping[field.key] === undefined
    );
    
    if (missingRequired.length > 0) {
      setErrors([`Missing required field mappings: ${missingRequired.map(f => f.label).join(', ')}`]);
      return;
    }

    // Validate each row
    csvData.forEach((row, index) => {
      const rowResult = {
        rowIndex: index + 1,
        data: {},
        errors: [],
        warnings: []
      };

      requiredFields.forEach(field => {
        const columnIndex = columnMapping[field.key];
        if (columnIndex !== undefined) {
          const value = row[columnIndex];
          rowResult.data[field.key] = value;

          // Validate required fields
          if (field.required && (!value || value.trim() === '')) {
            rowResult.errors.push(`${field.label} is required`);
          }

          // Validate specific field types
          if (field.key === 'price' && value) {
            const price = parseFloat(value);
            if (isNaN(price) || price < 0) {
              rowResult.errors.push('Price must be a valid positive number');
            }
          }

          if ((field.key === 'stock' || field.key === 'minStock') && value) {
            const stock = parseInt(value);
            if (isNaN(stock) || stock < 0) {
              rowResult.errors.push(`${field.label} must be a valid non-negative number`);
            }
          }

          if (field.key === 'sku' && value) {
            // Check for duplicate SKUs in the same file
            const duplicates = csvData.filter((r, i) => 
              i !== index && r[columnIndex] === value
            );
            if (duplicates.length > 0) {
              rowResult.warnings.push('Duplicate SKU found in file');
            }
          }
        }
      });

      results.push(rowResult);
    });

    setValidationResults(results);
    setActiveStep(2);
  };

  const executeImport = async () => {
    setImporting(true);
    setImportProgress(0);

    const validRows = validationResults.filter(r => r.errors.length === 0);
    const totalRows = validRows.length;
    let importedCount = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        // Simulate import delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Here you would make the actual API call to import the product
        // await productApi.createProduct(row.data);
        
        importedCount++;
        setImportProgress((importedCount / totalRows) * 100);
      }

      onComplete(importedCount);
      handleReset();
    } catch (error) {
      setErrors([`Import failed: ${error.message}`]);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({});
    setValidationResults([]);
    setImporting(false);
    setImportProgress(0);
    setErrors([]);
  };

  const downloadTemplate = () => {
    const templateHeaders = requiredFields.map(f => f.label);
    const sampleData = [
      'Sample Product 1,SP001,29.99,Electronics,A sample product,100,10,Supplier A,123456789,0.5',
      'Sample Product 2,SP002,49.99,Clothing,Another sample,50,5,Supplier B,987654321,0.3'
    ];
    
    const csvContent = [templateHeaders.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Product Data
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Upload a CSV or Excel file containing your product data. Make sure your file includes columns for product name, SKU, and price at minimum.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
                sx={{ mb: 2 }}
              >
                Download Template
              </Button>
              <Typography variant="caption" display="block" color="textSecondary">
                Download a sample template to see the expected format
              </Typography>
            </Box>

            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'grey.300',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.50'
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : 'Drop your file here or click to browse'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supports CSV and Excel files (up to 10MB)
              </Typography>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </Paper>

            {file && (
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Map Columns
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Map the columns from your file to the corresponding product fields. Required fields are marked with an asterisk.
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product Field</TableCell>
                    <TableCell>File Column</TableCell>
                    <TableCell>Sample Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requiredFields.map((field) => (
                    <TableRow key={field.key}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {field.label}
                          {field.required && (
                            <Chip label="Required" size="small" color="error" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={columnMapping[field.key] || ''}
                            onChange={(e) => handleColumnMapping(field.key, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>Not mapped</em>
                            </MenuItem>
                            {headers.map((header, index) => (
                              <MenuItem key={index} value={index}>
                                {header}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {columnMapping[field.key] !== undefined && csvData[0] && (
                          <Typography variant="body2" color="textSecondary">
                            {csvData[0][columnMapping[field.key]] || 'No data'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 2:
        const validRows = validationResults.filter(r => r.errors.length === 0);
        const errorRows = validationResults.filter(r => r.errors.length > 0);
        const warningRows = validationResults.filter(r => r.warnings.length > 0);

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Validation Results
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Chip
                icon={<SuccessIcon />}
                label={`${validRows.length} Valid`}
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${errorRows.length} Errors`}
                color="error"
                variant="outlined"
              />
              <Chip
                icon={<WarningIcon />}
                label={`${warningRows.length} Warnings`}
                color="warning"
                variant="outlined"
              />
            </Box>

            {errorRows.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorRows.length} row{errorRows.length !== 1 ? 's' : ''} contain errors and will be skipped during import.
              </Alert>
            )}

            {warningRows.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {warningRows.length} row{warningRows.length !== 1 ? 's' : ''} contain warnings but will still be imported.
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Issues</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow key={result.rowIndex}>
                      <TableCell>{result.rowIndex}</TableCell>
                      <TableCell>
                        {result.errors.length > 0 ? (
                          <Chip label="Error" color="error" size="small" />
                        ) : result.warnings.length > 0 ? (
                          <Chip label="Warning" color="warning" size="small" />
                        ) : (
                          <Chip label="Valid" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{result.data.name || 'N/A'}</TableCell>
                      <TableCell>{result.data.sku || 'N/A'}</TableCell>
                      <TableCell>
                        {[...result.errors, ...result.warnings].join('; ') || 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Import Progress
            </Typography>
            
            {importing ? (
              <Box>
                <LinearProgress 
                  variant="determinate" 
                  value={importProgress} 
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Importing products... {Math.round(importProgress)}%
                </Typography>
              </Box>
            ) : (
              <Alert severity="success">
                Import completed successfully!
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        Import Products
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          {importing ? 'Importing...' : 'Cancel'}
        </Button>
        
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={() => setActiveStep(activeStep - 1)}>
            Back
          </Button>
        )}
        
        {activeStep === 0 && file && csvData.length > 0 && (
          <Button variant="contained" onClick={() => setActiveStep(1)}>
            Next
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button variant="contained" onClick={validateData}>
            Validate Data
          </Button>
        )}
        
        {activeStep === 2 && validationResults.filter(r => r.errors.length === 0).length > 0 && (
          <Button 
            variant="contained" 
            onClick={executeImport}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Start Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductImport;