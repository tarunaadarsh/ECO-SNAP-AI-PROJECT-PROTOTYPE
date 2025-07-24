#!/usr/bin/env python3
"""
Training script for EcoSnap waste detection model.
This script demonstrates how to train the model with real datasets.
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

class WasteModelTrainer:
    def __init__(self):
        self.class_names = ['Plastic', 'Chemical', 'Oil', 'Mixed Waste']
        self.img_size = (224, 224)
        self.batch_size = 32
        self.epochs = 50
        
    def create_model(self):
        """Create the waste detection model"""
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            weights='imagenet',
            include_top=False,
            input_shape=(*self.img_size, 3)
        )
        
        # Freeze base model initially
        base_model.trainable = False
        
        # Add custom classification head
        inputs = tf.keras.Input(shape=(*self.img_size, 3))
        x = base_model(inputs, training=False)
        x = GlobalAveragePooling2D()(x)
        x = Dropout(0.2)(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.5)(x)
        outputs = Dense(len(self.class_names), activation='softmax')(x)
        
        model = Model(inputs, outputs)
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def create_data_generators(self, data_dir):
        """Create data generators for training and validation"""
        # Data augmentation for training
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            zoom_range=0.2,
            shear_range=0.2,
            fill_mode='nearest',
            validation_split=0.2
        )
        
        # Only rescaling for validation
        val_datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=0.2
        )
        
        # Create generators
        train_generator = train_datagen.flow_from_directory(
            data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='training',
            classes=self.class_names
        )
        
        val_generator = val_datagen.flow_from_directory(
            data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='validation',
            classes=self.class_names
        )
        
        return train_generator, val_generator
    
    def create_synthetic_data(self):
        """Create synthetic training data for demonstration"""
        print("Creating synthetic training data...")
        
        # Generate synthetic data
        num_samples_per_class = 250
        total_samples = num_samples_per_class * len(self.class_names)
        
        # Create random images
        X = np.random.random((total_samples, *self.img_size, 3))
        
        # Create labels
        y = []
        for i, class_name in enumerate(self.class_names):
            y.extend([i] * num_samples_per_class)
        
        y = tf.keras.utils.to_categorical(y, len(self.class_names))
        
        # Split into train and validation
        split_idx = int(0.8 * total_samples)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        return (X_train, y_train), (X_val, y_val)
    
    def train_model(self, data_dir=None, use_synthetic=True):
        """Train the waste detection model"""
        print("Starting model training...")
        
        # Create model
        model = self.create_model()
        print(f"Model created with {model.count_params()} parameters")
        
        # Prepare callbacks
        callbacks = [
            ModelCheckpoint(
                'models/best_waste_detector.h5',
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        # Create models directory
        os.makedirs('models', exist_ok=True)
        
        if use_synthetic or not data_dir or not os.path.exists(data_dir):
            print("Using synthetic data for training...")
            (X_train, y_train), (X_val, y_val) = self.create_synthetic_data()
            
            # Train model
            history = model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=min(self.epochs, 10),  # Fewer epochs for synthetic data
                batch_size=self.batch_size,
                callbacks=callbacks,
                verbose=1
            )
        else:
            print(f"Using real data from {data_dir}")
            train_gen, val_gen = self.create_data_generators(data_dir)
            
            # Train model
            history = model.fit(
                train_gen,
                validation_data=val_gen,
                epochs=self.epochs,
                callbacks=callbacks,
                verbose=1
            )
        
        # Save final model
        model.save('models/waste_detector.h5')
        print("Training completed! Model saved to models/waste_detector.h5")
        
        return model, history
    
    def fine_tune_model(self, model):
        """Fine-tune the model by unfreezing some layers"""
        print("Starting fine-tuning...")
        
        # Unfreeze the top layers of the base model
        base_model = model.layers[1]
        base_model.trainable = True
        
        # Fine-tune from this layer onwards
        fine_tune_at = 100
        
        # Freeze all the layers before fine_tune_at
        for layer in base_model.layers[:fine_tune_at]:
            layer.trainable = False
        
        # Use a lower learning rate for fine-tuning
        model.compile(
            optimizer=Adam(learning_rate=0.0001/10),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model

def main():
    """Main training function"""
    trainer = WasteModelTrainer()
    
    # Check for data directory
    data_dir = 'data/waste_dataset'
    use_synthetic = not os.path.exists(data_dir)
    
    if use_synthetic:
        print("No real dataset found. Using synthetic data for demonstration.")
        print("To use real data, organize your dataset as follows:")
        print("data/waste_dataset/")
        print("  ├── Plastic/")
        print("  ├── Chemical/")
        print("  ├── Oil/")
        print("  └── Mixed Waste/")
    
    # Train the model
    model, history = trainer.train_model(data_dir, use_synthetic)
    
    print("\nTraining completed successfully!")
    print("Model saved to: models/waste_detector.h5")
    
    # Print training summary
    if hasattr(history, 'history'):
        final_acc = history.history['accuracy'][-1]
        final_val_acc = history.history['val_accuracy'][-1]
        print(f"Final training accuracy: {final_acc:.4f}")
        print(f"Final validation accuracy: {final_val_acc:.4f}")

if __name__ == '__main__':
    main()

