from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..database import get_db
from ..deps import require_role
from ..models import (
    ClassRoom,
    ClassSubject,
    Enrollment,
    EnrollmentStatus,
    Role,
    Score,
    User,
)
from ..services import build_report, build_sheet, get_or_404, load_class_subject, score_out

router = APIRouter(prefix="/teacher", tags=["teacher"])
teacher_only = require_role(Role.teacher)


def own_class_subject(db: Session, class_subject_id: int, teacher: User) -> ClassSubject:
    cs = load_class_subject(db, class_subject_id)
    if cs.teacher_id != teacher.id:
        raise HTTPException(403, "این درس به شما واگذار نشده است")
    return cs


def active_enrollment(db: Session, enrollment_id: int, cs: ClassSubject) -> Enrollment:
    e = get_or_404(db, Enrollment, enrollment_id, "دانش‌آموز در این کلاس یافت نشد")
    if e.class_id != cs.class_id:
        raise HTTPException(400, "دانش‌آموز عضو این کلاس نیست")
    if e.status != EnrollmentStatus.active:
        raise HTTPException(400, "برای دانش‌آموزی که در این کلاس فعال نیست نمره ثبت نمی‌شود")
    return e


def own_score(db: Session, score_id: int, teacher: User) -> Score:
    s = db.scalar(
        select(Score)
        .where(Score.id == score_id)
        .options(selectinload(Score.class_subject), selectinload(Score.teacher))
    )
    if s is None:
        raise HTTPException(404, "نمره یافت نشد")
    if s.class_subject.teacher_id != teacher.id:
        raise HTTPException(403, "این نمره متعلق به درس شما نیست")
    return s


@router.get("/assignments", response_model=list[schemas.AssignmentOut])
def my_assignments(user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ClassSubject)
        .where(ClassSubject.teacher_id == user.id)
        .options(
            selectinload(ClassSubject.subject),
            selectinload(ClassSubject.class_room).selectinload(ClassRoom.grade),
            selectinload(ClassSubject.class_room).selectinload(ClassRoom.academic_year),
            selectinload(ClassSubject.class_room).selectinload(ClassRoom.enrollments),
        )
    ).all()
    out = [
        schemas.AssignmentOut(
            class_subject_id=cs.id,
            class_id=cs.class_id,
            class_name=cs.class_room.name,
            grade_name=cs.class_room.grade.name,
            year_name=cs.class_room.academic_year.name,
            is_current_year=cs.class_room.academic_year.is_current,
            subject_name=cs.subject.name,
            student_count=sum(
                1 for e in cs.class_room.enrollments if e.status == EnrollmentStatus.active
            ),
        )
        for cs in rows
    ]
    return sorted(out, key=lambda a: (not a.is_current_year, a.year_name, a.grade_name))


@router.get("/assignments/{class_subject_id}", response_model=schemas.SheetOut)
def assignment_sheet(
    class_subject_id: int, user: User = Depends(teacher_only), db: Session = Depends(get_db)
):
    return build_sheet(db, own_class_subject(db, class_subject_id, user))


@router.post("/scores", response_model=schemas.ScoreOut, status_code=201)
def add_score(
    data: schemas.ScoreIn, user: User = Depends(teacher_only), db: Session = Depends(get_db)
):
    cs = own_class_subject(db, data.class_subject_id, user)
    e = active_enrollment(db, data.enrollment_id, cs)
    score = Score(
        enrollment_id=e.id,
        class_subject_id=cs.id,
        teacher_id=user.id,
        value=data.value,
        date=data.date,
        title=data.title,
        note=data.note,
    )
    db.add(score)
    db.commit()
    score.teacher = user
    return score_out(score)


@router.post("/scores/bulk", response_model=list[schemas.ScoreOut], status_code=201)
def add_scores_bulk(
    data: schemas.ScoreBulkIn, user: User = Depends(teacher_only), db: Session = Depends(get_db)
):
    """Record one exam/assessment for many students of a class at once."""
    cs = own_class_subject(db, data.class_subject_id, user)
    scores = []
    for item in data.items:
        e = active_enrollment(db, item.enrollment_id, cs)
        scores.append(
            Score(
                enrollment_id=e.id,
                class_subject_id=cs.id,
                teacher_id=user.id,
                value=item.value,
                date=data.date,
                title=data.title,
            )
        )
    db.add_all(scores)
    db.commit()
    for s in scores:
        s.teacher = user
    return [score_out(s) for s in scores]


@router.patch("/scores/{score_id}", response_model=schemas.ScoreOut)
def update_score(
    score_id: int,
    data: schemas.ScoreUpdate,
    user: User = Depends(teacher_only),
    db: Session = Depends(get_db),
):
    score = own_score(db, score_id, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(score, field, value)
    db.commit()
    return score_out(score)


@router.delete("/scores/{score_id}", status_code=204)
def delete_score(score_id: int, user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    db.delete(own_score(db, score_id, user))
    db.commit()


@router.get("/students/{student_id}/report", response_model=schemas.ReportOut)
def student_report(
    student_id: int, user: User = Depends(teacher_only), db: Session = Depends(get_db)
):
    """Teachers may view the full report card of students they teach."""
    teaches = db.scalar(
        select(Enrollment.id)
        .join(ClassSubject, ClassSubject.class_id == Enrollment.class_id)
        .where(Enrollment.student_id == student_id, ClassSubject.teacher_id == user.id)
        .limit(1)
    )
    if teaches is None:
        raise HTTPException(403, "این دانش‌آموز در کلاس‌های شما نیست")
    return build_report(db, get_or_404(db, User, student_id))
