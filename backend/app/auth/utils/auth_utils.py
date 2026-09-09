"""
auth_utils.py — Utilidades JWT compartidas entre microservicios.
Cada microservicio importa desde aquí para validar tokens.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY no está definida en el .env")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl apunta al microservicio de auth
import os
AUTH_URL = os.getenv("AUTH_URL", "http://auth:8000")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{AUTH_URL}/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    """
    Dependencia reutilizable en cualquier microservicio.
    Valida el JWT y devuelve el usuario actual decodificando el payload.
    No realiza consultas a la base de datos (Stateless).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id = payload.get("id")
        role_id = payload.get("role_id")
        if email is None or user_id is None or role_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return {"id": user_id, "email": email, "role_id": role_id}