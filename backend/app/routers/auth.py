from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..security import create_access_token, hash_password, verify_password
from ..services import current_classes, get_or_404, user_out

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


@router.post("/password", status_code=204)
def change_password(
    data: schemas.PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "رمز عبور فعلی اشتباه است")
    user.password_hash = hash_password(data.new_password)
    db.commit()


MAX_AVATAR_BYTES = 2 * 1024 * 1024
# Detect the real format from the file's first bytes, never trust the header alone.
AVATAR_SIGNATURES = {
    "image/jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    "image/png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    "image/webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}


@router.put("/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Body is the raw image (Content-Type: image/jpeg | image/png | image/webp)."""
    data = await request.body()
    if not data:
        raise HTTPException(400, "فایلی ارسال نشده است")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(400, "حجم تصویر نباید بیشتر از ۲ مگابایت باشد")
    kind = next((k for k, check in AVATAR_SIGNATURES.items() if check(data)), None)
    if kind is None:
        raise HTTPException(400, "فقط تصویر JPG، PNG یا WebP قابل قبول است")
    user.avatar, user.avatar_type = data, kind
    user.avatar_updated_at = datetime.now(timezone.utc)
    db.commit()
    return user_out(user, current_classes(db, [user.id]).get(user.id))


@router.delete("/avatar", response_model=schemas.UserOut)
def delete_avatar(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.avatar = user.avatar_type = user.avatar_updated_at = None
    db.commit()
    return user_out(user, current_classes(db, [user.id]).get(user.id))


@router.get("/users/{user_id}/avatar")
def get_avatar(
    user_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Photos are only served to signed-in users of the school, never publicly."""
    target = get_or_404(db, User, user_id, "کاربر یافت نشد")
    if target.avatar is None:
        raise HTTPException(404, "تصویری ثبت نشده است")
    return Response(
        content=target.avatar,
        media_type=target.avatar_type or "image/jpeg",
        # the URL carries ?v=<avatar_version>, so a new photo gets a new URL
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
