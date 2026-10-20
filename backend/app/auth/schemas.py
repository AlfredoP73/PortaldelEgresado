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
    accept_privacy_policy: bool
    authorize_data_treatment: bool

    @model_validator(mode='after')
    def validate_graduate_email(self):
        if self.role_id == 3: # GRADUATE
            domain = self.email.split('@')[-1].lower()
            if domain not in ALLOWED_GRADUATE_EMAIL_DOMAINS:
                raise ValueError("Debes registrarte con tu correo institucional @unicesar.edu.co")
        
        if not self.accept_privacy_policy:
            raise ValueError("Debes aceptar el aviso de privacidad para registrarte.")
        if not self.authorize_data_treatment:
            raise ValueError("Debes autorizar el tratamiento de tus datos personales.")
            
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
    is_active: bool = True
    email_verified: bool = False
    privacy_policy_accepted: bool = False
    data_treatment_authorized: bool = False

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str


class AdminUpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class AccountUpdateResponse(BaseModel):
    """Respuesta de cambios de cuenta. Si cambió el email del usuario autenticado
    se devuelve un nuevo token (el JWT usa el email como 'sub')."""
    message: str
    access_token: Optional[str] = None
    user: Optional[UserInfo] = None


class ServiceStatus(BaseModel):
    key: str
    name: str
    description: str
    status: str  # operational | degraded | down
    latency_ms: Optional[int] = None
    http_status: Optional[int] = None
    detail: Optional[str] = None


class SystemStatusResponse(BaseModel):
    overall: str  # operational | degraded | down
    checked_at: datetime
    services: List[ServiceStatus]


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: Optional[str] = None
    payload: Optional[dict] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreateInternalNotificationRequest(BaseModel):
    user_id: int
    title: str
    message: str
    type: Optional[str] = "system"
    payload: Optional[dict] = None
    dedup_key: Optional[str] = None


class DeviceTokenRegisterRequest(BaseModel):
    token: str
    platform: Optional[str] = "android"


class ValidateGraduateEmailRequest(BaseModel):
    email: EmailStr


class ValidateGraduateEmailResponse(BaseModel):
    valid: bool = True
    message: str
    email: str


class MessageCreate(BaseModel):
    body: str


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_email: Optional[str] = None
    body: str
    created_at: datetime
    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    context_type: str
    context_id: Optional[int] = None
    participant_ids: List[int]


class ConversationResponse(BaseModel):
    id: int
    context_type: str
    context_id: Optional[int] = None
    created_at: datetime
    participants: List[int] = []
    unread_count: int = 0
    last_message: Optional[MessageResponse] = None
    title: Optional[str] = None
    participant_names: List[str] = []
    participant_emails: List[str] = []
    class Config:
        from_attributes = True


# Resolver referencia forward
TokenResponse.model_rebuild()