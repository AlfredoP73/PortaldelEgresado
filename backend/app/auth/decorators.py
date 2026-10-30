from functools import wraps
from fastapi import HTTPException, status

def require_roles(*roles):
    """
    Decorator pattern to enforce role-based access control.
    Requires that the endpoint function has a `current_user` parameter injected via FastAPI's Depends().
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = kwargs.get('current_user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Authentication required. Make sure current_user is injected."
                )
            
            # Since current_user is a dict returned by get_current_user in auth_service
            # wait, get_current_user returns the dictionary with id, email, role_id...
            # In RoleChecker we mapped role_id to role_name.
            
            ROLE_MAP = {
                1: "ADMIN",
                2: "COMPANY",
                3: "GRADUATE",
                4: "COORDINATOR",
            }
            
            role_id = user.get("role_id")
            role_name = ROLE_MAP.get(role_id)
            
            if not role_name or role_name not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail=f"Permisos insuficientes. Requiere uno de los roles: {roles}"
                )
                
            return func(*args, **kwargs)
        return wrapper
    return decorator
