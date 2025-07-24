#!/usr/bin/env python3
"""
Dataset preprocessing script for EcoSnap waste detection.
This script helps prepare datasets like TACO, WasteNet, and OpenLitterMap for training.
"""

import os
import json
import shutil
import requests
from PIL import Image
import numpy as np
from pathlib import Path

class DatasetPreprocessor:
    def __init__(self, output_dir='data/waste_dataset'):
        self.output_dir = Path(output_dir)
        self.class_mapping = {
            # TACO dataset mappings
            'Plastic bag': 'Plastic',
            'Plastic bottle': 'Plastic',
            'Plastic container': 'Plastic',
            'Plastic cup': 'Plastic',
            'Plastic lid': 'Plastic',
            'Plastic straw': 'Plastic',
            'Plastic utensils': 'Plastic',
            
            # Chemical waste mappings
            'Battery': 'Chemical',
            'Aerosol': 'Chemical',
            'Paint bucket': 'Chemical',
            'Chemical container': 'Chemical',
            
            # Oil waste mappings
            'Oil container': 'Oil',
            'Motor oil': 'Oil',
            'Cooking oil': 'Oil',
            
            # Mixed waste mappings
            'Mixed waste': 'Mixed Waste',
            'General litter': 'Mixed Waste',
            'Unknown': 'Mixed Waste'
        }
        
        self.target_classes = ['Plastic', 'Chemical', 'Oil', 'Mixed Waste']
        self.target_size = (224, 224)
        
    def setup_directories(self):
        """Create directory structure for organized dataset"""
        print("Setting up directory structure...")
        
        for class_name in self.target_classes:
            class_dir = self.output_dir / class_name
            class_dir.mkdir(parents=True, exist_ok=True)
            
        print(f"Created directories in {self.output_dir}")
    
    def download_sample_images(self):
        """Download sample images for demonstration"""
        print("Downloading sample images...")
        
        # Sample URLs for different waste types (placeholder URLs)
        sample_urls = {
            'Plastic': [
                'https://via.placeholder.com/224x224/3B82F6/FFFFFF?text=Plastic+Bottle',
                'https://via.placeholder.com/224x224/3B82F6/FFFFFF?text=Plastic+Bag',
                'https://via.placeholder.com/224x224/3B82F6/FFFFFF?text=Plastic+Container'
            ],
            'Chemical': [
                'https://via.placeholder.com/224x224/EF4444/FFFFFF?text=Chemical+Waste',
                'https://via.placeholder.com/224x224/EF4444/FFFFFF?text=Battery',
                'https://via.placeholder.com/224x224/EF4444/FFFFFF?text=Paint+Can'
            ],
            'Oil': [
                'https://via.placeholder.com/224x224/F59E0B/FFFFFF?text=Oil+Spill',
                'https://via.placeholder.com/224x224/F59E0B/FFFFFF?text=Motor+Oil',
                'https://via.placeholder.com/224x224/F59E0B/FFFFFF?text=Oil+Container'
            ],
            'Mixed Waste': [
                'https://via.placeholder.com/224x224/8B5CF6/FFFFFF?text=Mixed+Waste',
                'https://via.placeholder.com/224x224/8B5CF6/FFFFFF?text=General+Litter',
                'https://via.placeholder.com/224x224/8B5CF6/FFFFFF?text=Unknown+Waste'
            ]
        }
        
        for class_name, urls in sample_urls.items():
            class_dir = self.output_dir / class_name
            
            for i, url in enumerate(urls):
                try:
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200:
                        image_path = class_dir / f'sample_{i+1}.jpg'
                        with open(image_path, 'wb') as f:
                            f.write(response.content)
                        print(f"Downloaded {image_path}")
                except Exception as e:
                    print(f"Failed to download {url}: {e}")
    
    def process_taco_dataset(self, taco_dir):
        """Process TACO dataset annotations"""
        print("Processing TACO dataset...")
        
        annotations_file = Path(taco_dir) / 'annotations.json'
        images_dir = Path(taco_dir) / 'images'
        
        if not annotations_file.exists():
            print(f"TACO annotations file not found: {annotations_file}")
            return
        
        with open(annotations_file, 'r') as f:
            data = json.load(f)
        
        # Create category mapping
        categories = {cat['id']: cat['name'] for cat in data['categories']}
        
        # Process images
        processed_count = 0
        for annotation in data['annotations']:
            try:
                # Get image info
                image_id = annotation['image_id']
                image_info = next(img for img in data['images'] if img['id'] == image_id)
                
                # Get category
                category_id = annotation['category_id']
                category_name = categories.get(category_id, 'Unknown')
                
                # Map to target class
                target_class = self.class_mapping.get(category_name, 'Mixed Waste')
                
                # Copy and process image
                source_path = images_dir / image_info['file_name']
                if source_path.exists():
                    target_dir = self.output_dir / target_class
                    target_path = target_dir / f'taco_{processed_count}.jpg'
                    
                    # Resize and save image
                    self.resize_and_save_image(source_path, target_path)
                    processed_count += 1
                    
                    if processed_count % 100 == 0:
                        print(f"Processed {processed_count} images...")
                        
            except Exception as e:
                print(f"Error processing annotation: {e}")
                continue
        
        print(f"TACO dataset processing completed. Processed {processed_count} images.")
    
    def resize_and_save_image(self, source_path, target_path):
        """Resize and save image to target size"""
        try:
            with Image.open(source_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize image
                img_resized = img.resize(self.target_size, Image.Resampling.LANCZOS)
                
                # Save image
                img_resized.save(target_path, 'JPEG', quality=85)
                
        except Exception as e:
            print(f"Error processing image {source_path}: {e}")
    
    def augment_dataset(self):
        """Apply data augmentation to increase dataset size"""
        print("Applying data augmentation...")
        
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
        
        # Data augmentation parameters
        datagen = ImageDataGenerator(
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            zoom_range=0.2,
            shear_range=0.2,
            fill_mode='nearest'
        )
        
        for class_name in self.target_classes:
            class_dir = self.output_dir / class_name
            images = list(class_dir.glob('*.jpg'))
            
            print(f"Augmenting {len(images)} images in {class_name}...")
            
            for img_path in images[:10]:  # Limit augmentation for demo
                try:
                    # Load image
                    img = Image.open(img_path)
                    img_array = np.array(img)
                    img_array = np.expand_dims(img_array, axis=0)
                    
                    # Generate augmented images
                    aug_iter = datagen.flow(img_array, batch_size=1)
                    
                    for i in range(3):  # Generate 3 augmented versions
                        aug_img = next(aug_iter)[0].astype(np.uint8)
                        aug_img_pil = Image.fromarray(aug_img)
                        
                        aug_path = class_dir / f'aug_{img_path.stem}_{i}.jpg'
                        aug_img_pil.save(aug_path, 'JPEG', quality=85)
                        
                except Exception as e:
                    print(f"Error augmenting {img_path}: {e}")
                    continue
    
    def generate_dataset_stats(self):
        """Generate statistics about the processed dataset"""
        print("\nDataset Statistics:")
        print("-" * 40)
        
        total_images = 0
        for class_name in self.target_classes:
            class_dir = self.output_dir / class_name
            image_count = len(list(class_dir.glob('*.jpg')))
            total_images += image_count
            print(f"{class_name}: {image_count} images")
        
        print(f"Total: {total_images} images")
        print(f"Dataset location: {self.output_dir}")
        
        # Check class balance
        if total_images > 0:
            print("\nClass Distribution:")
            for class_name in self.target_classes:
                class_dir = self.output_dir / class_name
                image_count = len(list(class_dir.glob('*.jpg')))
                percentage = (image_count / total_images) * 100
                print(f"{class_name}: {percentage:.1f}%")
    
    def create_sample_dataset(self):
        """Create a sample dataset for demonstration"""
        print("Creating sample dataset...")
        
        self.setup_directories()
        self.download_sample_images()
        
        # Generate some synthetic images
        self.generate_synthetic_images()
        
        self.generate_dataset_stats()
        
        print("\nSample dataset created successfully!")
        print("You can now train the model using this dataset.")
    
    def generate_synthetic_images(self):
        """Generate synthetic images for each class"""
        print("Generating synthetic images...")
        
        colors = {
            'Plastic': (59, 130, 246),    # Blue
            'Chemical': (239, 68, 68),    # Red
            'Oil': (245, 158, 11),        # Orange
            'Mixed Waste': (139, 92, 246) # Purple
        }
        
        for class_name in self.target_classes:
            class_dir = self.output_dir / class_name
            color = colors[class_name]
            
            for i in range(20):  # Generate 20 synthetic images per class
                # Create a simple synthetic image
                img_array = np.random.randint(0, 255, (*self.target_size, 3), dtype=np.uint8)
                
                # Add some color bias
                img_array[:, :, 0] = np.clip(img_array[:, :, 0] * 0.7 + color[0] * 0.3, 0, 255)
                img_array[:, :, 1] = np.clip(img_array[:, :, 1] * 0.7 + color[1] * 0.3, 0, 255)
                img_array[:, :, 2] = np.clip(img_array[:, :, 2] * 0.7 + color[2] * 0.3, 0, 255)
                
                # Save image
                img = Image.fromarray(img_array.astype(np.uint8))
                img_path = class_dir / f'synthetic_{i+1}.jpg'
                img.save(img_path, 'JPEG', quality=85)

def main():
    """Main preprocessing function"""
    preprocessor = DatasetPreprocessor()
    
    print("EcoSnap Dataset Preprocessing Tool")
    print("=" * 40)
    
    # Check if TACO dataset exists
    taco_dir = 'data/raw/taco'
    if os.path.exists(taco_dir):
        print("TACO dataset found. Processing...")
        preprocessor.setup_directories()
        preprocessor.process_taco_dataset(taco_dir)
        preprocessor.augment_dataset()
    else:
        print("No TACO dataset found. Creating sample dataset...")
        preprocessor.create_sample_dataset()
    
    preprocessor.generate_dataset_stats()
    
    print("\nDataset preprocessing completed!")
    print("You can now train the model using the processed dataset.")

if __name__ == '__main__':
    main()

