import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Chip
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  PhotoCamera as CameraIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const BarcodeScanner = ({ open, onClose, onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [useCamera, setUseCamera] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (open) {
      getCameraDevices();
    } else {
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [open]);

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setCameraDevices(cameras);
      
      if (cameras.length > 0) {
        // Prefer back camera if available
        const backCamera = cameras.find(camera => 
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera ? backCamera.deviceId : cameras[0].deviceId);
      }
    } catch (err) {
      setError('Unable to access camera devices');
      console.error('Error getting camera devices:', err);
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setScannedCode('');
      
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
      
      // In a real implementation, you would use a barcode scanning library here
      // such as QuaggaJS, ZXing, or similar
      simulateBarcodeDetection();
      
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error('Error starting camera:', err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  // Simulate barcode detection - in real implementation, this would be replaced
  // with actual barcode scanning library integration
  const simulateBarcodeDetection = () => {
    // This is just a simulation - real implementation would continuously
    // analyze video frames for barcodes
    const simulatedCodes = [
      '1234567890128',
      '9876543210987',
      '5555555555555',
      '1111111111111'
    ];
    
    setTimeout(() => {
      if (isScanning) {
        const randomCode = simulatedCodes[Math.floor(Math.random() * simulatedCodes.length)];
        handleBarcodeDetected(randomCode);
      }
    }, 3000);
  };

  const handleBarcodeDetected = (code) => {
    setScannedCode(code);
    setIsScanning(false);
    stopScanning();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      setScannedCode(manualCode.trim());
    }
  };

  const handleScanComplete = () => {
    const codeToUse = scannedCode || manualCode;
    if (codeToUse) {
      onScan({
        code: codeToUse,
        type: scannedCode ? 'scanned' : 'manual',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleClose = () => {
    stopScanning();
    setScannedCode('');
    setManualCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScannerIcon />
        Barcode Scanner
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useCamera}
                onChange={(e) => setUseCamera(e.target.checked)}
              />
            }
            label="Use Camera Scanner"
          />
        </Box>

        {useCamera ? (
          <Box>
            {/* Camera Scanner Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Camera Scanner
              </Typography>
              
              {cameraDevices.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Camera Device:
                  </Typography>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    style={{ 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ccc',
                      minWidth: '200px'
                    }}
                  >
                    {cameraDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substr(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </Box>
              )}

              {/* Video Preview */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 300,
                  backgroundColor: 'grey.900',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}
              >
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 200,
                        height: 100,
                        border: '2px solid #00ff00',
                        borderRadius: 1,
                        pointerEvents: 'none'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body2">
                        Position barcode within the green rectangle
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', color: 'grey.400' }}>
                    <CameraIcon sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="body1">
                      Camera preview will appear here
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Camera Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                {!isScanning ? (
                  <Button
                    variant="contained"
                    startIcon={<ScannerIcon />}
                    onClick={startScanning}
                    disabled={cameraDevices.length === 0}
                  >
                    Start Scanning
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<StopIcon />}
                    onClick={stopScanning}
                  >
                    Stop Scanning
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={getCameraDevices}
                >
                  Refresh Cameras
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <Box>
            {/* Manual Input Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Manual Entry
              </Typography>
              <TextField
                fullWidth
                label="Enter Barcode"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type or paste barcode here..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualSubmit();
                  }
                }}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
              >
                Submit Code
              </Button>
            </Paper>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Scanned Result */}
        {scannedCode && (
          <Paper sx={{ p: 2, backgroundColor: 'success.50' }}>
            <Typography variant="h6" gutterBottom color="success.main">
              Barcode Detected!
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={scannedCode}
                color="success"
                variant="outlined"
                sx={{ fontSize: '1.1em', fontFamily: 'monospace' }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Code type: {scannedCode.length === 13 ? 'EAN-13' : 
                         scannedCode.length === 12 ? 'UPC-A' : 
                         scannedCode.length === 8 ? 'EAN-8' : 'Unknown'}
            </Typography>
          </Paper>
        )}

        {/* Instructions */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="textSecondary">
            <strong>Tips:</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • Ensure good lighting for best scanning results
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • Hold the camera steady and keep the barcode in focus
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • Try different angles if the barcode isn't detected
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • Use manual entry if camera scanning doesn't work
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {(scannedCode || manualCode) && (
          <Button
            variant="contained"
            onClick={handleScanComplete}
          >
            Use This Code
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;