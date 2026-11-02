"""
Auth Controller & JWT Decorator
Provides clean REST token verification and user authentication endpoints (Login, Register, Users list).
"""
from datetime import datetime, timedelta, timezone
from functools import wraps
import cloudinary.uploader  # type: ignore
import bcrypt
import jwt
import secrets
from flask import Blueprint, jsonify, request
try:
    from backend.config import Config
except ImportError:
    from config import Config
try:
    from backend.services.email_service import send_otp_email
except ImportError:
    from services.email_service import send_otp_email
from prisma import Prisma

auth_bp = Blueprint("auth", __name__)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Authorization token missing or malformed"}), 401

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            current_user_id = payload.get("user_id")
            if not current_user_id:
                return jsonify({"success": False, "error": "Invalid token payload"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "error": "Token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "error": "Invalid token"}), 401

        return f(current_user_id=current_user_id, *args, **kwargs)
    return decorated


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    async def _do_login():
        db = Prisma()
        await db.connect()
        try:
            user = await db.user.find_unique(where={"email": email})
            if not user or not bcrypt.checkpw(password.encode("utf-8"), user.passwordHash.encode("utf-8")):
                return jsonify({"success": False, "error": "Invalid email or password"}), 401

            token_payload = {
                "user_id": user.id,
                "email": user.email,
                "name": user.name,
                "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
            }
            token = jwt.encode(token_payload, Config.JWT_SECRET, algorithm="HS256")
            return jsonify({
                "success": True,
                "token": token,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "upi_id": getattr(user, "upi_id", None)
                }
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_do_login())


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    raw_upi = (data.get("upi_id") or "").strip().lower()
    upi_id = raw_upi if raw_upi else None

    if not name or not email or not password:
        return jsonify({"success": False, "error": "Name, email, and password are required"}), 400

    async def _do_register():
        db = Prisma()
        await db.connect()
        try:
            exists = await db.user.find_unique(where={"email": email})
            if exists:
                return jsonify({"success": False, "error": "User with this email already exists"}), 400

            if upi_id:
                upi_exists = await db.user.find_unique(where={"upi_id": upi_id})
                if upi_exists:
                    return jsonify({"success": False, "error": "User with this UPI ID already exists"}), 400

            hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            user_data = {
                "name": name,
                "email": email,
                "passwordHash": hashed,
            }
            if upi_id:
                user_data["upi_id"] = upi_id

            new_user = await db.user.create(data=user_data)

            # Generate and return JWT token so the user is authenticated immediately
            token_payload = {
                "user_id": new_user.id,
                "email": new_user.email,
                "name": new_user.name,
                "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
            }
            token = jwt.encode(token_payload, Config.JWT_SECRET, algorithm="HS256")

            return jsonify({
                "success": True,
                "message": "User registered successfully",
                "token": token,
                "user": {
                    "id": new_user.id,
                    "name": new_user.name,
                    "email": new_user.email,
                    "upi_id": getattr(new_user, "upi_id", None)
                }
            }), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_do_register())


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me(current_user_id):
    """Fetch current user profile including upi_id"""
    async def _fetch_me():
        db = Prisma()
        await db.connect()
        try:
            user = await db.user.find_unique(where={"id": current_user_id})
            if not user:
                return jsonify({"success": False, "error": "User not found"}), 404
            return jsonify({
                "success": True,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "upi_id": getattr(user, "upi_id", None)
                }
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_fetch_me())


@auth_bp.route("/profile", methods=["PUT", "PATCH"])
@token_required
def update_profile(current_user_id):
    """Update current user profile (name and/or upi_id)"""
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    upi_id = data.get("upi_id")

    async def _update():
        db = Prisma()
        await db.connect()
        try:
            update_data = {}
            if name is not None:
                cleaned_name = name.strip()
                if not cleaned_name:
                    return jsonify({"success": False, "error": "Name cannot be empty"}), 400
                update_data["name"] = cleaned_name

            if upi_id is not None:
                cleaned_upi = upi_id.strip().lower() or None
                if cleaned_upi:
                    existing = await db.user.find_unique(where={"upi_id": cleaned_upi})
                    if existing and existing.id != current_user_id:
                        return jsonify({"success": False, "error": "User with this UPI ID already exists"}), 400
                update_data["upi_id"] = cleaned_upi

            if not update_data:
                return jsonify({"success": False, "error": "No update fields provided"}), 400

            updated_user = await db.user.update(where={"id": current_user_id}, data=update_data)
            return jsonify({
                "success": True,
                "message": "Profile updated successfully",
                "user": {
                    "id": updated_user.id,
                    "name": updated_user.name,
                    "email": updated_user.email,
                    "upi_id": getattr(updated_user, "upi_id", None)
                }
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_update())


@auth_bp.route("/users", methods=["GET"])
@token_required
def list_users(current_user_id):
    """List registered members for dynamic 'Paid by' dropdown and split selection"""
    async def _fetch():
        db = Prisma()
        await db.connect()
        try:
            users = await db.user.find_many(where={"isActive": True}, order={"name": "asc"})
            return jsonify({
                "success": True,
                "users": [{"id": u.id, "name": u.name, "email": u.email, "upi_id": getattr(u, "upi_id", None)} for u in users]
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_fetch())

@auth_bp.route("/profile/image", methods=["POST"])
@auth_bp.route("/upload", methods=["POST"])
@token_required
def upload_profile_image(current_user_id):
    """Upload user profile picture using Cloudinary and save to User.profileImage"""
    async def _do_upload():
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No image file provided"}), 400
        
        file = request.files["image"]

        if file.filename == "":
            return jsonify({"success": False, "error": "No selected file"}), 400

        db = Prisma()
        try:
            # Cloudinary upload
            upload_result = cloudinary.uploader.upload(
                file,
                folder="my_project_uploads",
                transformation=[{"quality": "auto", "fetch_format": "auto"}]
            )

            # Update user profile with image URL
            await db.connect()

            updated_user = await db.user.update(
                where={"id": current_user_id},
                data={"profileImage": upload_result.get("secure_url")}
            )

            return jsonify({
                "success": True,
                "message": "Profile image uploaded successfully",
                "user": {
                    "id": updated_user.id,
                    "name": updated_user.name,
                    "email": updated_user.email,
                    "profileImage": updated_user.profileImage,
                    "upi_id": getattr(updated_user, "upi_id", None)
                }
            }), 200

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_do_upload())


@auth_bp.route("/verify-password", methods=["POST"])
@token_required
def verify_password(current_user_id):
    """Verify if the provided current password matches the user's password."""
    data = request.get_json(silent=True) or {}
    password = (data.get("currentPassword") or data.get("password") or "").strip()

    if not password:
        return jsonify({"success": False, "error": "Current password is required"}), 400

    async def _verify():
        db = Prisma()
        await db.connect()
        try:
            user = await db.user.find_unique(where={"id": current_user_id})
            if not user:
                return jsonify({"success": False, "error": "User not found"}), 404

            is_valid = bcrypt.checkpw(password.encode("utf-8"), user.passwordHash.encode("utf-8"))
            if not is_valid:
                return jsonify({"success": False, "error": "Current password is incorrect"}), 400

            return jsonify({
                "success": True,
                "message": "Current password verified successfully"
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_verify())


@auth_bp.route("/change-password", methods=["POST", "PUT"])
@token_required
def change_password(current_user_id):
    """Change user password after verifying current password and confirming new password."""
    data = request.get_json(silent=True) or {}
    current_password = (data.get("currentPassword") or "").strip()
    new_password = (data.get("newPassword") or "").strip()
    confirm_password = (data.get("confirmPassword") or "").strip()

    if not current_password:
        return jsonify({"success": False, "error": "Current password is required"}), 400

    if not new_password:
        return jsonify({"success": False, "error": "New password is required"}), 400

    if not confirm_password:
        return jsonify({"success": False, "error": "Please confirm your new password"}), 400

    if new_password != confirm_password:
        return jsonify({"success": False, "error": "New password and confirm password must match"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters long"}), 400

    if current_password == new_password:
        return jsonify({"success": False, "error": "New password must be different from current password"}), 400

    async def _change():
        db = Prisma()
        await db.connect()
        try:
            user = await db.user.find_unique(where={"id": current_user_id})
            if not user:
                return jsonify({"success": False, "error": "User not found"}), 404

            is_valid = bcrypt.checkpw(current_password.encode("utf-8"), user.passwordHash.encode("utf-8"))
            if not is_valid:
                return jsonify({"success": False, "error": "Current password is incorrect"}), 400

            new_hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            await db.user.update(
                where={"id": current_user_id},
                data={"passwordHash": new_hashed}
            )

            return jsonify({
                "success": True,
                "message": "Password changed successfully"
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_change())


# =====================================================================
# STEP 1: SEND VERIFICATION OTP (FORGOT PASSWORD)
# Endpoint: POST /api/auth/forgot-password
# Takes: { "email": "user@example.com" }
# Verifies email in DB, generates 6-digit random OTP, saves expiry (now + 10 mins),
# and sends the OTP to the user's Gmail using smtplib.
# =====================================================================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    # 1. Validation: Email is required
    if not email:
        return jsonify({"success": False, "error": "Please enter your registered email address"}), 400

    async def _send_otp():
        db = Prisma()
        await db.connect()
        try:
            # 2. Check if user exists in Prisma and account is active
            user = await db.user.find_unique(where={"email": email})
            if not user or not user.isActive:
                # Security note: Return clear message so legitimate users know account status
                return jsonify({"success": False, "error": "No active account found with this email address"}), 404

            # 3. Generate a secure, cryptographic 6-digit random OTP (100000 to 999999)
            otp_code = f"{secrets.randbelow(900000) + 100000}"

            # 4. Set 10-minute expiry timestamp in UTC
            otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

            # 5. Save OTP and expiry in Prisma DB
            await db.user.update(
                where={"id": user.id},
                data={
                    "resetOtp": otp_code,
                    "resetOtpExpiry": otp_expiry
                }
            )

            # 6. Send the verification email using Python smtplib (Gmail SMTP)
            try:
                send_otp_email(
                    recipient_email=user.email,
                    recipient_name=user.name or "User",
                    otp_code=otp_code
                )
            except Exception as mail_err:
                # If mail sending fails, clear the OTP so no dangling OTP remains
                await db.user.update(
                    where={"id": user.id},
                    data={"resetOtp": None, "resetOtpExpiry": None}
                )
                return jsonify({
                    "success": False,
                    "error": f"Failed to send verification email. {str(mail_err)}"
                }), 500

            return jsonify({
                "success": True,
                "message": f"Verification OTP has been sent to {user.email}. Please check your inbox (or spam folder)."
            }), 200

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_send_otp())


# =====================================================================
# STEP 2: VERIFY OTP & RESET PASSWORD
# Endpoint: POST /api/auth/reset-password
# Takes: { "email": "...", "otp": "123456", "newPassword": "...", "confirmPassword": "..." }
# Validates OTP match and 10-minute expiration, then hashes new password and clears OTP.
# =====================================================================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp_input = (data.get("otp") or "").strip()
    new_password = (data.get("newPassword") or "").strip()
    confirm_password = (data.get("confirmPassword") or "").strip()

    # 1. Validation checks
    if not email:
        return jsonify({"success": False, "error": "Email address is required"}), 400

    if not otp_input:
        return jsonify({"success": False, "error": "6-digit verification OTP is required"}), 400

    if len(otp_input) != 6 or not otp_input.isdigit():
        return jsonify({"success": False, "error": "Please enter a valid 6-digit numeric OTP"}), 400

    if not new_password:
        return jsonify({"success": False, "error": "New password is required"}), 400

    if not confirm_password:
        return jsonify({"success": False, "error": "Please confirm your new password"}), 400

    if new_password != confirm_password:
        return jsonify({"success": False, "error": "New password and confirm password must match"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "New password must be at least 6 characters long"}), 400

    async def _verify_and_reset():
        db = Prisma()
        await db.connect()
        try:
            # 2. Fetch user by email
            user = await db.user.find_unique(where={"email": email})
            if not user:
                return jsonify({"success": False, "error": "No account found with this email address"}), 404

            # 3. Check if an OTP was actually requested
            if not user.resetOtp or not user.resetOtpExpiry:
                return jsonify({
                    "success": False,
                    "error": "No active password reset request found. Please request a new OTP first."
                }), 400

            # 4. Check if the OTP matches
            if user.resetOtp.strip() != otp_input:
                return jsonify({
                    "success": False,
                    "error": "Invalid verification code. Please check your email and try again."
                }), 400

            # 5. Check if the OTP is expired (10-minute window)
            now_utc = datetime.now(timezone.utc)
            if user.resetOtpExpiry.tzinfo is None:
                is_expired = datetime.utcnow() > user.resetOtpExpiry
            else:
                is_expired = now_utc > user.resetOtpExpiry

            if is_expired:
                # Clear expired OTP
                await db.user.update(
                    where={"id": user.id},
                    data={"resetOtp": None, "resetOtpExpiry": None}
                )
                return jsonify({
                    "success": False,
                    "error": "Verification code has expired. Please request a new OTP."
                }), 400

            # 6. Securely hash the new password using bcrypt (same standard used across app)
            new_hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            # 7. Update password and invalidate the OTP immediately (single-use protection)
            await db.user.update(
                where={"id": user.id},
                data={
                    "passwordHash": new_hashed,
                    "resetOtp": None,
                    "resetOtpExpiry": None
                }
            )

            return jsonify({
                "success": True,
                "message": "Password reset successfully! You can now log in with your new password."
            }), 200

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_verify_and_reset())


    