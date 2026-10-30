from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from typing import Optional, List, Any

# Registro abierto multi-dominio: se permite cualquier proveedor de correo válido
# (gmail.com, hotmail.com, outlook.com, yahoo.com, unicesar.edu.co, etc.)
ALLOWED_GRADUATE_EMAIL_DOMAINS: list[str] = []

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

    # Campos de acreditación académica para Registro Abierto de Egresados (role_id == 3)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    document_id: Optional[str] = None
    program_id: Optional[int] = None
    graduation_year: Optional[int] = None
    degree_act_number: Optional[str] = None
    diploma_number: Optional[str] = None
    phone: Optional[str] = None

    @model_validator(mode='after')
    def validate_graduate_email(self):
        if not self.accept_privacy_policy:
            raise ValueError("Debes aceptar el aviso de privacidad para registrarte.")
        if not self.authorize_data_treatment:
            raise ValueError("Debes autorizar el tratamiento de tus datos personales.")

        return self


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role_id: int = 2
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    program_id: Optional[int] = None
    graduation_year: Optional[int] = None


class InternalUserVerificationUpdate(BaseModel):
    verification_status: str  # PENDING_VERIFICATION | APPROVED | REJECTED
    verification_notes: Optional[str] = None
    full_name: Optional[str] = None


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
    verification_status: Optional[str] = "APPROVED"
    verification_notes: Optional[str] = None
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
    pre_imported: bool = False
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