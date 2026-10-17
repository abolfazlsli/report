from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..security import create_access_token, verify_password
from ..services import current_classes, user_out

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == data.username.strip()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(400, "نام کاربری یا رمز عبور اشتباه است")
    if not user.is_active:
        raise HTTPException(403, "حساب کاربری غیرفعال است")
    token = create_access_token(user.id, user.role.value)
    return schemas.TokenOut(
        access_token=token, user=user_out(user, current_classes(db, [user.id]).get(user.id))
    )


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(user, current_classes(db, [user.id]).get(user.id))
