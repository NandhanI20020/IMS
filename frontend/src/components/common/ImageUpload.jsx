import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Card,
  CardMedia,
  CardActions,
  Grid,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';

const ImageUpload = ({ 
  images = [], 
  onChange, 
  maxImages = 5, 
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    setError('');
    const fileArray = Array.from(files);
    
    // Validate file count
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate files
    const validFiles = [];
    for (const file of fileArray) {
      if (!acceptedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Accepted types: ${acceptedTypes.join(', ')}`);
        continue;
      }
      
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    
    // Convert files to base64 URLs for preview
    const promises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            file: file,
            url: e.target.result,
            name: file.name,
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(newImages => {
      onChange([...images, ...newImages]);
      setUploading(false);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const handleRemoveImage = (imageId) => {
    onChange(images.filter(img => img.id !== imageId));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      {/* Upload Area */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          backgroundColor: dragOver ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          mb: 2,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50'
          }
        }}
        onClick={openFileDialog}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag & drop images here
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          or click to browse files
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Maximum {maxImages} images, up to {Math.round(maxSize / 1024 / 1024)}MB each
        </Typography>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="textSecondary">
            Uploading images...
          </Typography>
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <Grid container spacing={2}>
          {images.map((image, index) => (
            <Grid item xs={6} sm={4} md={3} key={image.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="150"
                  image={image.url}
                  alt={image.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardActions sx={{ p: 1, justifyContent: 'space-between' }}>
                  <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                    {image.name}
                  </Typography>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => window.open(image.url, '_blank')}
                    >
                      <ZoomInIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Status */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          {images.length} of {maxImages} images
        </Typography>
        {images.length < maxImages && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadIcon />}
            onClick={openFileDialog}
          >
            Add More
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ImageUpload;