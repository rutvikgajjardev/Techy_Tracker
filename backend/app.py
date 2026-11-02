"""
SplitEase REST API Backend
Flask + Prisma client with clean modular Blueprint architecture, CORS, and centralized error handling.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path for backend package imports
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import cloudinary  # type: ignore
import cloudinary.uploader  # type: ignore
from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.config import Config
from backend.controllers.auth_controller import auth_bp
from backend.controllers.dashboard_controller import dashboard_bp
from backend.controllers.expense_controller import expense_bp
from backend.controllers.category_controller import category_bp

# Configure Cloudinary from centralized Config
cloudinary.config(
    cloud_name=Config.CLOUDINARY_CLOUD_NAME,
    api_key=Config.CLOUDINARY_API_KEY,
    api_secret=Config.CLOUDINARY_API_SECRET,
    secure=True
)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # 1. Seamless CORS for React frontend communication
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",  # Can be tightened via Config.CORS_ORIGINS
                "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                "expose_headers": ["Content-Range", "X-Total-Count"],
                "max_age": 86400
            }
        }
    )

   

    # 3. Register RESTful Blueprints 
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(category_bp, url_prefix="/api/categories")

    # 4. Standard Global Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"success": False, "error": getattr(error, "description", "Bad Request")}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"success": False, "error": "Authentication required or token expired"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"success": False, "error": "You do not have permission to perform this action"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"success": False, "error": "Internal server error occurred"}), 500

    # 5. Core API Routes
    @app.route("/", methods=["GET"])
    def home():
        return jsonify({"message": "Server is running successfully!"}), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "service": "SplitEase API", "version": "2.0.0"}), 200

    @app.route("/api/upload", methods=["POST"])
    def upload_images():
        """
        Handles single or multi-image upload to Cloudinary.
        Accepts multipart/form-data with keys: 'images', 'image', or 'files'.
        """
        files = (
            request.files.getlist("images")
            or request.files.getlist("image")
            or request.files.getlist("files")
        )
        if not files:
            for fallback_key in ("image", "file", "images", "files"):
                if fallback_key in request.files:
                    f = request.files[fallback_key]
                    if f and f.filename:
                        files = [f]
                        break

        # Filter out empty entries
        valid_files = [f for f in files if f and f.filename and f.filename.strip()]

        if not valid_files:
            return jsonify({"success": False, "error": "No valid image file(s) provided"}), 400

        try:
            uploaded = []
            for f in valid_files:
                res = cloudinary.uploader.upload(
                    f,
                    folder="splitease_bills",
                    transformation=[{"quality": "auto", "fetch_format": "auto"}],
                )
                uploaded.append({
                    "url": res.get("secure_url"),
                    "public_id": res.get("public_id"),
                    "filename": f.filename
                })

            return jsonify({
                "success": True,
                "message": f"Successfully uploaded {len(uploaded)} image(s)",
                "url": uploaded[0]["url"] if uploaded else None,
                "urls": [item["url"] for item in uploaded],
                "images": uploaded
            }), 200

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    return app

if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)