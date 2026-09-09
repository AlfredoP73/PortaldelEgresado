from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from typing import Optional, List, Any

ALLOWED_GRADUATE_EMAIL_DOMAINS = ["unicesar.edu.co"]

# --- Request bodies ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role_id: int = 2  # Default: COMPANY

    @model_validator(mode='after')
    def validate_graduate_email(self):
        if self.role_id == 3: # GRADUATE
            domain = self.email.split('@')[-1].lower()
            if domain not in ALLOWED_GRADUATE_EMAIL_DOMAINS:
                raise ValueError("Debes registrarte con tu correo institucional @unicesar.edu.co")
        return self


class ImpersonateRequest(BaseModel):
    user_id: int

# --- Response bodies ---

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    id: int
    email: str
    role_id: int
    role_name: str
    email_verified: bool = False

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


class RegisterResponse(BaseModel):
    message: str
    user_id: int



class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyPinRequest(BaseModel):
    email: EmailStr
    pin: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    pin: str
    new_password: str


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Resolver referencia forward
TokenResponse.model_rebuild()