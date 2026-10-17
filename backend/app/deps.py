from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Role, User
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "لطفاً دوباره وارد شوید")
    if credentials is None:
        raise unauthorized
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise unauthorized
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise unauthorized
    return user


def require_role(*roles: Role):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "دسترسی ندارید")
        return user

    return dependency
