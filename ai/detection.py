from flask import Blueprint, request, jsonify
from models.waste_detector import waste_detector
import traceback

detection_bp = Blueprint('detection', __name__)

@detection_bp.route('/detect', methods=['POST'])
def detect_waste():
    """Detect waste type from uploaded image"""
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data:
            return jsonify({
                'error': 'No image URL provided',
                'wasteType': 'Unknown',
                'confidence': 50.0,
                'riskLevel': 'Low'
            }), 400
        
        image_url = data['imageUrl']
        
        # Perform waste detection
        result = waste_detector.predict(image_url)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Detection error: {e}")
        print(traceback.format_exc())
        
        return jsonify({
            'error': f'Detection failed: {str(e)}',
            'wasteType': 'Unknown',
            'confidence': 50.0,
            'riskLevel': 'Low'
        }), 500

@detection_bp.route('/detect/upload', methods=['POST'])
def detect_waste_upload():
    """Detect waste type from uploaded file"""
    try:
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image file provided',
                'wasteType': 'Unknown',
                'confidence': 50.0,
                'riskLevel': 'Low'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'wasteType': 'Unknown',
                'confidence': 50.0,
                'riskLevel': 'Low'
            }), 400
        
        # Read file content
        file_content = file.read()
        
        # Perform waste detection
        result = waste_detector.predict(file_content)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Upload detection error: {e}")
        print(traceback.format_exc())
        
        return jsonify({
            'error': f'Detection failed: {str(e)}',
            'wasteType': 'Unknown',
            'confidence': 50.0,
            'riskLevel': 'Low'
        }), 500

@detection_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test model availability
        test_result = waste_detector.predict(None)
        
        return jsonify({
            'status': 'healthy',
            'message': 'AI Detection Service is running',
            'model_loaded': waste_detector.model is not None,
            'supported_types': waste_detector.class_names
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'message': f'Service error: {str(e)}'
        }), 500

@detection_bp.route('/train', methods=['POST'])
def train_model():
    """Train the model with sample data (for demonstration)"""
    try:
        waste_detector.train_with_sample_data()
        
        return jsonify({
            'message': 'Model training completed successfully',
            'status': 'success'
        }), 200
        
    except Exception as e:
        print(f"Training error: {e}")
        print(traceback.format_exc())
        
        return jsonify({
            'error': f'Training failed: {str(e)}',
            'status': 'failed'
        }), 500

@detection_bp.route('/model/info', methods=['GET'])
def model_info():
    """Get information about the current model"""
    try:
        return jsonify({
            'class_names': waste_detector.class_names,
            'risk_levels': waste_detector.risk_levels,
            'confidence_threshold': waste_detector.confidence_threshold,
            'model_loaded': waste_detector.model is not None,
            'input_shape': [224, 224, 3] if waste_detector.model else None
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get model info: {str(e)}'
        }), 500

