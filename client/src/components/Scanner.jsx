import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Camera,
  Upload,
  MapPin,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  RotateCcw
} from 'lucide-react';
import axios from 'axios';

const Scanner = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  // Get user location
  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        getLocation();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setCapturedImage(blob);
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setCapturedImage(null);
      getLocation();
    }
  };

  // Reset capture
  const resetCapture = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    setResult(null);
    setError('');
    setDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit for detection
  const submitForDetection = async () => {
    if (!capturedImage && !selectedFile) {
      setError('Please capture or upload an image first.');
      return;
    }

    if (!location) {
      setError('Location is required for waste reporting.');
      return;
    }

    setDetecting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', capturedImage || selectedFile);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('description', description);

      const response = await axios.post('/api/reports/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
      
      // Update user stats in context
      if (response.data.userStats) {
        updateUser(response.data.userStats);
      }

    } catch (error) {
      console.error('Detection error:', error);
      setError(error.response?.data?.message || 'Failed to detect waste. Please try again.');
    } finally {
      setDetecting(false);
    }
  };

  // Get risk level color
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get waste type color
  const getWasteTypeColor = (wasteType) => {
    switch (wasteType) {
      case 'Plastic': return 'bg-blue-100 text-blue-800';
      case 'Chemical': return 'bg-red-100 text-red-800';
      case 'Oil': return 'bg-orange-100 text-orange-800';
      case 'Mixed Waste': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              </div>
              <CardTitle className="text-2xl">Detection Complete!</CardTitle>
              <CardDescription>
                Your waste report has been successfully submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Detection Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Waste Type:</span>
                  <Badge className={getWasteTypeColor(result.report.wasteType)}>
                    {result.report.wasteType}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Confidence:</span>
                  <Badge variant="outline">
                    {result.report.confidence}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Risk Level:</span>
                  <Badge className={getRiskColor(result.report.riskLevel)}>
                    {result.report.riskLevel}
                  </Badge>
                </div>
              </div>

              {/* Points Earned */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-300">
                    Points Earned!
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Eco Points:</span>
                    <span className="font-medium ml-2">{result.userStats.ecoPoints}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Rank:</span>
                    <span className="font-medium ml-2">{result.userStats.rank}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Reports:</span>
                    <span className="font-medium ml-2">{result.userStats.reportCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
                    <span className="font-medium ml-2">{result.userStats.accuracy}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <Button onClick={resetCapture} className="flex-1">
                  Scan Another
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Waste Scanner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Capture or upload an image to detect waste type
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6">
            {/* Camera/Upload Section */}
            {!capturedImage && !selectedFile && (
              <div className="space-y-6">
                {/* Camera Controls */}
                <div className="text-center">
                  {!cameraActive ? (
                    <div className="space-y-4">
                      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <Camera className="h-16 w-16 text-gray-400" />
                      </div>
                      <Button onClick={startCamera} className="w-full">
                        <Camera className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover rounded-lg"
                        />
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button onClick={capturePhoto} className="w-full">
                        <Camera className="mr-2 h-4 w-4" />
                        Capture Photo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                      or
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {(capturedImage || selectedFile) && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <img
                      src={capturedImage ? URL.createObjectURL(capturedImage) : URL.createObjectURL(selectedFile)}
                      alt="Captured waste"
                      className="max-w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      onClick={resetCapture}
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Location Status */}
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {location ? 'Location detected' : 'Getting location...'}
                  </span>
                  {location && (
                    <Badge variant="outline" className="text-xs">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any additional details about the waste..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={submitForDetection}
                  disabled={detecting || !location}
                  className="w-full"
                >
                  {detecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting Waste...
                    </>
                  ) : (
                    'Detect Waste Type'
                  )}
                </Button>
              </div>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Better Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Ensure good lighting for clear images</li>
              <li>• Focus on the waste item, avoid cluttered backgrounds</li>
              <li>• Get close enough to see details clearly</li>
              <li>• Make sure the waste item fills most of the frame</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scanner;

