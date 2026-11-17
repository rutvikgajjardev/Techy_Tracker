"""
SplitEase Upload Controller
Dedicated REST API endpoint for secure image uploads to Cloudinary.
Handles:
- Single & Multiple image uploads for bill receipts & expense attachments.
- File size pre-validation (max 10MB) with user-friendly error formatting.
- File type/extension validation (JPEG, PNG, WebP, GIF, HEIC, SVG).
- Cloudinary auto-optimization (quality: auto, fetch_format: auto).
- Image deletion by public_id or URL.
"""
import os
import re
from flask import Blueprint, jsonify, request
import cloudinary
import cloudinary.uploader
try:
    from backend.config import Config
except ImportError:
    from config import Config

# Ensure Cloudinary is configured
cloudinary.config(
    cloud_name=Config.CLOUDINARY_CLOUD_NAME,
    api_key=Config.CLOUDINARY_API_KEY,
    api_secret=Config.CLOUDINARY_API_SECRET,
    secure=True,
)

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "heic", "svg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def is_allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def format_oversized_error(filename: str, size_bytes: int) -> str:
    size_mb = round(size_bytes / (1024 * 1024), 1)
    return f"The file '{filename}' is too large ({size_mb} MB). Please upload an image under 10 MB."


@upload_bp.route("", methods=["POST"])
@upload_bp.route("/", methods=["POST"])
def upload_images():
    """
    Handles single or multi-image upload to Cloudinary.
    Accepts multipart/form-data with keys: 'images', 'image', 'files', or 'file'.
    Returns structured JSON with image URLs and Cloudinary metadata.
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

    # Filter out empty/unnamed entries
    valid_files = [f for f in files if f and f.filename and f.filename.strip()]

    if not valid_files:
        return jsonify({"success": False, "error": "No valid image file(s) provided"}), 400

    # Validate file extensions & sizes before uploading to Cloudinary
    for f in valid_files:
        if not is_allowed_file(f.filename):
            allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS)).upper()
            return jsonify({
                "success": False,
                "error": f"Invalid file type for '{f.filename}'. Allowed formats: {allowed_list}"
            }), 400

        f.seek(0, 2)
        size_bytes = f.tell()
        f.seek(0)
        if size_bytes > MAX_FILE_SIZE_BYTES:
            return jsonify({
                "success": False,
                "error": format_oversized_error(f.filename, size_bytes)
            }), 400

    try:
        folder_name = request.form.get("folder", "splitease_bills")
        uploaded = []
        for f in valid_files:
            res = cloudinary.uploader.upload(
                f,
                folder=folder_name,
                transformation=[{"quality": "auto", "fetch_format": "auto"}],
            )
            uploaded.append({
                "url": res.get("secure_url"),
                "public_id": res.get("public_id"),
                "filename": f.filename,
                "format": res.get("format"),
                "bytes": res.get("bytes")
            })

        return jsonify({
            "success": True,
            "message": f"Successfully uploaded {len(uploaded)} image(s)",
            "url": uploaded[0]["url"] if uploaded else None,
            "urls": [item["url"] for item in uploaded],
            "images": uploaded
        }), 200

    except Exception as e:
        err_str = str(e)
        match = re.search(r"File size too large\.\s*Got\s*(\d+)\.\s*Maximum is\s*(\d+)", err_str, re.IGNORECASE)
        if match:
            got_mb = round(int(match.group(1)) / (1024 * 1024), 1)
            max_mb = round(int(match.group(2)) / (1024 * 1024))
            friendly_err = f"The file you uploaded is too large ({got_mb} MB). Please upload an image under {max_mb} MB."
            return jsonify({"success": False, "error": friendly_err}), 400
        return jsonify({"success": False, "error": f"Cloudinary upload failed: {err_str}"}), 500


@upload_bp.route("/delete", methods=["DELETE", "POST"])
def delete_image():
    """
    Deletes an uploaded image from Cloudinary given its public_id or image URL.
    """
    data = request.get_json(silent=True) or {}
    public_id = data.get("public_id")
    url = data.get("url")

    if not public_id and url:
        # Extract public_id from Cloudinary URL: .../splitease_bills/xyz123.jpg
        parts = url.split("/upload/")
        if len(parts) > 1:
            after_upload = parts[1]
            # Strip version e.g. v12345678/
            after_version = re.sub(r"^v\d+/", "", after_upload)
            public_id = os.path.splitext(after_version)[0]

    if not public_id:
        return jsonify({"success": False, "error": "public_id or url is required to delete an image"}), 400

    try:
        res = cloudinary.uploader.destroy(public_id)
        if res.get("result") in ("ok", "not found"):
            return jsonify({"success": True, "message": "Image deleted successfully", "result": res}), 200
        return jsonify({"success": False, "error": f"Failed to delete image: {res.get('result')}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Image deletion failed: {str(e)}"}), 500
