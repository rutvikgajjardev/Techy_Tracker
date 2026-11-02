"""
Email Service for Techy Tracker
Sends Password Recovery & Verification OTP emails using Python's built-in smtplib and Gmail SMTP.
"""
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import dotenv_values, load_dotenv
try:
    from backend.config import Config
except ImportError:
    from config import Config


def _get_smtp_credentials():
    """
    Dynamically loads SMTP credentials from .env on disk so any credential update
    takes effect immediately without needing to restart the backend Flask server.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    project_root = os.path.dirname(backend_dir)

    env_paths = os.path.abspath("backend/.env")
    

    disk_vars = {}
    disk_vars.update(dotenv_values(env_paths))

    # Sender Email
    email = (
        disk_vars.get("SMTP_EMAIL")
        or os.getenv("SMTP_EMAIL")
        or getattr(Config, "SMTP_EMAIL", "")
        or ""
    ).strip()

    # Sender Password (strip spaces, quotes)
    raw_pass = (
        disk_vars.get("SMTP_PASSWORD")
        or os.getenv("SMTP_PASSWORD")
        or getattr(Config, "SMTP_PASSWORD", "")
        or ""
    )
    password = raw_pass.replace(" ", "").replace('"', '').replace("'", "").strip()

    return email, password


def send_otp_email(recipient_email: str, recipient_name: str, otp_code: str) -> bool:
    """
    Sends a 6-digit OTP email to the user for Password Recovery.

    How smtplib works with Gmail:
    1. Attempts direct SSL connection on Port 465 with ssl.create_default_context().
    2. Falls back to Port 587 with STARTTLS if port 465 is blocked by network/firewall.
    3. Authenticates using SMTP / Google App Password.
    4. Delivers the multipart HTML + Plain Text email to recipient_email.
    """
    # 1. Fetch fresh credentials dynamically from .env
    sender_email, sender_password = _get_smtp_credentials()

    if not sender_email:
        raise ValueError("SMTP_EMAIL is not configured in .env file.")

    if not sender_password:
        raise ValueError("SMTP_PASSWORD is not configured in .env file.")


    # 2. Build the Email Message Container
    message = MIMEMultipart("alternative")
    message["Subject"] = f"{otp_code} is your Techy Tracker Password Reset Code"
    message["From"] = f"Techy Tracker <{sender_email}>"
    message["To"] = recipient_email

    # 3. Plain text fallback (for basic text-only email clients)
    plain_text = f"""Hello {recipient_name},

We received a request to reset your password for your Techy Tracker account.

Your 6-Digit Password Reset OTP is: {otp_code}

This code is valid for 10 minutes. Do not share this code with anyone.
If you did not request a password reset, please ignore this email.

Best regards,
The Techy Tracker Team
"""

    # 4. Modern Responsive HTML Email Template
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; padding: 36px 32px;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #4f46e5; width: 42px; height: 42px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 22px; font-weight: bold; line-height: 42px;">₹</span>
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Techy Tracker</span>
                    <span style="display: block; font-size: 11px; color: #64748b; font-weight: 500;">Personal & Group Expense Manager</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & Description -->
          <tr>
            <td style="padding-top: 28px; text-align: left;">
              <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #0f172a;">Password Reset Request</h2>
              <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6;">
                Hi <strong>{recipient_name}</strong>, we received a request to reset the password for your account (<strong>{recipient_email}</strong>).
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
                Use the 6-digit verification code below to complete your password reset:
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding: 10px 0 24px;">
              <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 2px dashed #6366f1; border-radius: 14px; padding: 18px 24px; display: inline-block; text-align: center; min-width: 240px;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #4f46e5; letter-spacing: 1.5px; margin-bottom: 4px;">Verification Code</span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #312e81; letter-spacing: 8px; margin-left: 8px;">{otp_code}</span>
              </div>
            </td>
          </tr>

          <!-- Security & Validity Notice -->
          <tr>
            <td style="padding: 0 0 24px; text-align: left;">
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  ⏱ <strong>Valid for 10 minutes only.</strong> Never share this code with anyone. Our team will never ask for your code.
                </p>
              </div>
              <p style="margin: 18px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you didn't ask to reset your password, you can safely ignore this email — your existing password will remain secure and unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 Techy Tracker. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    # 5. Attach plain text and HTML versions
    part1 = MIMEText(plain_text, "plain")
    part2 = MIMEText(html_content, "html")
    message.attach(part1)
    message.attach(part2)

    # 6. Resilient Sending with Dual-Port Architecture:
    # First attempt: Direct SSL on Port 465 (Most reliable for Gmail, avoids STARTTLS handshake drops)
    # Second attempt: STARTTLS on Port 587 (Fallback)
    last_error = None

    # Attempt 1: Port 465 (SSL)
    try:
        ssl_context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl_context, timeout=15) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, message.as_string())
            return True
    except smtplib.SMTPAuthenticationError as auth_err:
        raise ValueError(
            "Gmail Authentication failed. Please verify your SMTP_EMAIL and SMTP_PASSWORD in .env."
        ) from auth_err
    except smtplib.SMTPServerDisconnected as disc_err:
        last_error = disc_err
    except Exception as err:
        last_error = err

    # Attempt 2: Port 587 (STARTTLS)
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, message.as_string())
            return True
    except smtplib.SMTPAuthenticationError as auth_err:
        raise ValueError(
            "Gmail Authentication failed. Please verify your SMTP_EMAIL and SMTP_PASSWORD in .env."
        ) from auth_err
    except smtplib.SMTPServerDisconnected:
        raise ValueError(
            "Gmail SMTP connection closed unexpectedly. Google dropped the connection during authentication. "
            "Please check that SMTP_PASSWORD is correct and 2-Step Verification App Password is active."
        )
    except Exception as err:
        raise ValueError(f"Failed to send email via Gmail SMTP: {str(err or last_error)}")

