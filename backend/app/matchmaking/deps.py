"""
Dependencias de autorización del microservicio Matchmaking.

Combina los checkers de rol compartidos (app.auth.rbac) con un control
adicional para las llamadas internas entre microservicios (token interno).
"""

import os
from typing import Optional

from fastapi import Depends, Header, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.rbac import RoleChecker
from app.auth.utils.auth_utils import ALGORITHM, SECRET_KEY, get_current_user
from app.database import get_db

require_admin = RoleChecker(["ADMIN"])
require_graduate = RoleChecker(["GRADUATE"])
require_company = RoleChecker(["COMPANY"])
require_company_or_admin = RoleChecker(["COMPANY", "ADMIN"])
require_graduate_or_admin = RoleChecker(["GRADUATE", "ADMIN"])

INTERNAL_TOKEN = os.getenv("MATCHMAKING_INTERNAL_TOKEN", "token_interno_servicios")

# tokenUrl solo se usa para el esquema OpenAPI de 401.
AUTH_URL = os.getenv("AUTH_URL", "http://auth:8000")
optional_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{AUTH_URL}/api/auth/login",
    auto_error=False,
)


def get_optional_current_user(
    token: Optional[str] = Depends(optional_oauth2),
    db: Session = Depends(get_db),
) -> Optional[dict]:
    """Valida el JWT solo si viene; devuelve None si no hay token o es inválido."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    email = payload.get("sub")
    if not email:
        return None
    result = db.execute(
        text("SELECT id, email, role_id FROM users WHERE email = :email"),
        {"email": email},
    ).fetchone()
    if result is None:
        return None
    return {"id": result[0], "email": result[1], "role_id": result[2]}


def require_internal_or_admin(
    x_internal_token: Optional[str] = Header(default=None),
    user: Optional[dict] = Depends(get_optional_current_user),
) -> dict:
    """Permite el recálculo a los microservicios internos o a un administrador."""
    if x_internal_token == INTERNAL_TOKEN:
        return {"id": None, "email": "internal", "role_id": None}
    if user and user.get("role_id") == 1:
        return user
    raise HTTPException(status_code=403, detail="No autorizado")


def require_graduate_owner_or_admin(
    graduate_id: int,
    user: dict = Depends(get_current_user),
) -> dict:
    """Un GRADUATE solo accede a sus propios datos; ADMIN a cualquier egresado."""
    if user.get("role_id") == 1:
        return user
    if user.get("role_id") == 3 and user.get("id") == graduate_id:
        return user
    raise HTTPException(status_code=403, detail="No autorizado")


def require_any_owner(
    graduate_id: int,
    user: dict = Depends(get_current_user),
) -> dict:
    """ADMIN/COMPANY acceden libremente; GRADUATE solo a sus propios datos."""
    if user.get("role_id") in (1, 2):
        return user
    if user.get("role_id") == 3 and user.get("id") == graduate_id:
        return user
    raise HTTPException(status_code=403, detail="No autorizado")