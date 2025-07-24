import tensorflow as tf
import numpy as np
from PIL import Image
import io
import requests
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
import os

class WasteDetector:
    def __init__(self):
        self.model = None
        self.class_names = ['Plastic', 'Chemical', 'Oil', 'Mixed Waste']
        self.risk_levels = {
            'Plastic': 'Medium',
            'Chemical': 'Critical', 
            'Oil': 'High',
            'Mixed Waste': 'Medium'
        }
        self.confidence_threshold = 0.6
        self.load_model()
    
    def create_model(self):
        """Create a simple CNN model for waste classification"""
        # Use MobileNetV2 as base model for transfer learning
        base_model = MobileNetV2(
            weights='imagenet',
            include_top=False,
            input_shape=(224, 224, 3)
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Add custom classification head
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.5)(x)
        predictions = Dense(len(self.class_names), activation='softmax')(x)
        
        model = Model(inputs=base_model.input, outputs=predictions)
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def load_model(self):
        """Load pre-trained model or create a new one"""
        model_path = 'models/waste_detector.h5'
        
        if os.path.exists(model_path):
            try:
                self.model = tf.keras.models.load_model(model_path)
                print("Loaded existing waste detection model")
            except Exception as e:
                print(f"Error loading model: {e}")
                self.model = self.create_model()
                print("Created new waste detection model")
        else:
            self.model = self.create_model()
            print("Created new waste detection model")
    
    def save_model(self):
        """Save the trained model"""
        os.makedirs('models', exist_ok=True)
        self.model.save('models/waste_detector.h5')
        print("Model saved successfully")
    
    def preprocess_image(self, image_input):
        """Preprocess image for prediction"""
        try:
            # Handle different input types
            if isinstance(image_input, str):
                # URL or file path
                if image_input.startswith('http'):
                    response = requests.get(image_input)
                    image = Image.open(io.BytesIO(response.content))
                else:
                    image = Image.open(image_input)
            elif isinstance(image_input, bytes):
                # Raw bytes
                image = Image.open(io.BytesIO(image_input))
            else:
                # PIL Image or numpy array
                image = image_input
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to model input size
            image = image.resize((224, 224))
            
            # Convert to numpy array and normalize
            image_array = np.array(image) / 255.0
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            return image_array
            
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            return None
    
    def predict(self, image_input):
        """Predict waste type from image"""
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_input)
            if processed_image is None:
                return self._create_error_result("Failed to preprocess image")
            
            # Make prediction
            predictions = self.model.predict(processed_image, verbose=0)
            
            # Get the predicted class and confidence
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx]) * 100
            
            # Get waste type and risk level
            waste_type = self.class_names[predicted_class_idx]
            risk_level = self.risk_levels[waste_type]
            
            # Apply confidence threshold
            if confidence < self.confidence_threshold * 100:
                waste_type = 'Unknown'
                risk_level = 'Low'
                confidence = max(confidence, 50.0)  # Minimum confidence for unknown
            
            return {
                'wasteType': waste_type,
                'confidence': round(confidence, 2),
                'riskLevel': risk_level,
                'allPredictions': {
                    self.class_names[i]: round(float(predictions[0][i]) * 100, 2)
                    for i in range(len(self.class_names))
                }
            }
            
        except Exception as e:
            print(f"Error during prediction: {e}")
            return self._create_error_result(f"Prediction failed: {str(e)}")
    
    def _create_error_result(self, error_message):
        """Create a default result for errors"""
        return {
            'wasteType': 'Unknown',
            'confidence': 50.0,
            'riskLevel': 'Low',
            'error': error_message,
            'allPredictions': {name: 25.0 for name in self.class_names}
        }
    
    def train_with_sample_data(self):
        """Train model with synthetic data (for demonstration)"""
        print("Training with synthetic data...")
        
        # Generate synthetic training data
        num_samples = 100
        X_train = np.random.random((num_samples, 224, 224, 3))
        y_train = tf.keras.utils.to_categorical(
            np.random.randint(0, len(self.class_names), num_samples),
            len(self.class_names)
        )
        
        # Train for a few epochs
        self.model.fit(
            X_train, y_train,
            epochs=3,
            batch_size=16,
            verbose=1
        )
        
        # Save the trained model
        self.save_model()
        print("Training completed and model saved")

# Global model instance
waste_detector = WasteDetector()

