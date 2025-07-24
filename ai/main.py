import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.detection import detection_bp

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, origins="*")
    
    # Register blueprints
    app.register_blueprint(detection_bp, url_prefix='/api')
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'message': 'EcoSnap AI Detection Service',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'detect': '/api/detect',
                'detect_upload': '/api/detect/upload',
                'health': '/api/health',
                'train': '/api/train',
                'model_info': '/api/model/info'
            }
        })
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'EcoSnap AI Detection Service'
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint not found',
            'message': 'The requested endpoint does not exist'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal server error',
            'message': 'Something went wrong on the server'
        }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Get port from environment or default to 5001
    port = int(os.environ.get('AI_PORT', 5001))
    
    print(f"Starting EcoSnap AI Detection Service on port {port}")
    print("Available endpoints:")
    print("  - POST /api/detect - Detect waste from image URL")
    print("  - POST /api/detect/upload - Detect waste from uploaded file")
    print("  - GET /api/health - Health check")
    print("  - POST /api/train - Train model with sample data")
    print("  - GET /api/model/info - Get model information")
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )

