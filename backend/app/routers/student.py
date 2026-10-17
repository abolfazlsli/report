from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import require_role
from ..models import Role, User
from ..services import build_report

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/report", response_model=schemas.ReportOut)
def my_report(
    user: User = Depends(require_role(Role.student)), db: Session = Depends(get_db)
):
    return build_report(db, user)
