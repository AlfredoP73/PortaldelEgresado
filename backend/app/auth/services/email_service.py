"""
email_service.py — Servicio de envío de correos de verificación.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Asegurar que se cargue el .env correcto desde la raíz del proyecto
env_path = os.path.join(os.path.dirname(__file__), "../../../../../.env")
load_dotenv(dotenv_path=os.path.abspath(env_path))

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@portaldelegresados.upc.edu.co")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_verification_email(to_email: str, token: str):
    """Envía un correo de verificación con un enlace para activar la cuenta."""
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verifica tu correo — Portal de Egresados UPC"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email

    text_body = f"""
Bienvenido al Portal de Egresados de la UPC.

Para activar tu cuenta, haz clic en el siguiente enlace:
{verify_url}

Si no solicitaste esta cuenta, ignora este correo.

— Oficina de Seguimiento a Egresados
Universidad Popular del Cesar
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#0e4832,#22a86e);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Portal de Egresados</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">Universidad Popular del Cesar</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;font-weight:700;">Verifica tu correo electrónico</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
          ¡Gracias por registrarte! Para activar tu cuenta y acceder a todas las funcionalidades del portal, haz clic en el botón de abajo.
        </p>
        <table role="presentation" width="100%">
          <tr>
            <td align="center">
              <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#0e4832,#22a86e);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;">
                Verificar mi correo
              </a>
            </td>
          </tr>
        </table>
        <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:28px 0 0;">
          Si el botón no funciona, copia y pega esta URL en tu navegador:<br>
          <a href="{verify_url}" style="color:#22a86e;word-break:break-all;">{verify_url}</a>
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          Este correo fue enviado automáticamente. Si no solicitaste esta cuenta, ignora este mensaje.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASS:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        print(f"[EMAIL] Correo de verificación enviado a {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] No se pudo enviar correo a {to_email}: {e}")

def send_password_reset_pin_email(to_email: str, pin: str):
    """Envía un correo con el PIN de 6 dígitos para recuperar la contraseña."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Código de Recuperación de Contraseña — Portal de Egresados UPC"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email

    text_body = f"""
Has solicitado restablecer tu contraseña.

Tu código de recuperación es: {pin}

Este código es válido por 15 minutos. Si no solicitaste este cambio, ignora este correo.
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#0e4832,#22a86e);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Recuperación de Contraseña</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">Portal de Egresados UPC</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px;text-align:center;">
        <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;font-weight:700;">Tu código de seguridad</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Ingresa el siguiente PIN de 6 dígitos en la aplicación para restablecer tu contraseña.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h1 style="color:#0e4832;font-size:36px;letter-spacing:6px;margin:0;">{pin}</h1>
        </div>
        <p style="color:#ef4444;font-size:13px;line-height:1.5;margin:0;">
          * Este código expirará en 15 minutos.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          Si no solicitaste este cambio, por favor ignora este correo. Tu contraseña seguirá siendo la misma.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASS:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        print(f"[EMAIL] PIN de recuperación enviado a {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] No se pudo enviar el PIN a {to_email}: {e}")
