from fastapi import Depends, HTTPException, status
from typing import List
from app.auth.utils.auth_utils import get_current_user

# ID mapping based on init.sql
ROLE_MAP = {
    1: "ADMIN",
    2: "COMPANY",
    3: "GRADUATE",
    4: "COORDINATOR"
}

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        role_id = user.get("role_id")
        user_role_name = ROLE_MAP.get(role_id)
        
        if not user_role_name or user_role_name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción"
            )
        return user

import logging

logger = logging.getLogger(__name__)

class RBACProxy:
    """Proxy pattern for RoleChecker to add logging and audit capabilities"""
    def __init__(self, allowed_roles: List[str]):
        self.checker = RoleChecker(allowed_roles)
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        user_email = user.get("email", "Unknown")
        logger.info(f"RBACProxy: Checking if user {user_email} has one of roles {self.allowed_roles}")
        
        try:
            result = self.checker(user)
            logger.info(f"RBACProxy: Access GRANTED to {user_email}")
            return result
        except HTTPException as e:
            logger.warning(f"RBACProxy: Access DENIED to {user_email}. Reason: {e.detail}")
            raise
