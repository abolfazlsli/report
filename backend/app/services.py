"""Read-side helpers shared by the admin, teacher and student routers."""

from collections import defaultdict
from statistics import mean

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import schemas
from .models import ClassRoom, ClassSubject, Enrollment, EnrollmentStatus, Score, User


def get_or_404(db: Session, model, obj_id: int, message: str = "یافت نشد"):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(404, message)
    return obj


def class_label(c: ClassRoom) -> str:
    # U+2066/U+2069 isolate the year so "1405-1406" isn't reordered inside Persian text.
    return f"{c.grade.name} - {c.name} (⁦{c.academic_year.name}⁩)"


def average(values) -> float | None:
    values = [float(v) for v in values]
    return round(mean(values), 2) if values else None


def score_out(s: Score) -> schemas.ScoreOut:
    return schemas.ScoreOut(
        id=s.id,
        value=float(s.value),
        date=s.date,
        title=s.title,
        note=s.note,
        teacher_name=s.teacher.full_name if s.teacher else None,
    )


def class_out(c: ClassRoom) -> schemas.ClassOut:
    return schemas.ClassOut(
        id=c.id,
        name=c.name,
        grade=schemas.GradeOut.model_validate(c.grade),
        academic_year=schemas.YearOut.model_validate(c.academic_year),
        student_count=sum(1 for e in c.enrollments if e.status == EnrollmentStatus.active),
    )


def current_classes(db: Session, student_ids: list[int]) -> dict[int, ClassRoom]:
    """Map student id -> class of their active enrollment."""
    if not student_ids:
        return {}
    rows = db.scalars(
        select(Enrollment)
        .where(
            Enrollment.student_id.in_(student_ids),
            Enrollment.status == EnrollmentStatus.active,
        )
        .options(
            selectinload(Enrollment.class_room).selectinload(ClassRoom.grade),
            selectinload(Enrollment.class_room).selectinload(ClassRoom.academic_year),
        )
    ).all()
    return {e.student_id: e.class_room for e in rows}


def user_out(user: User, current: ClassRoom | None) -> schemas.UserOut:
    out = schemas.UserOut.model_validate(user)
    if current is not None:
        out.current_class_id = current.id
        out.current_class = class_label(current)
    return out


def build_report(db: Session, student: User) -> schemas.ReportOut:
    """Full academic history of a student, grouped by enrollment then subject."""
    enrollments = db.scalars(
        select(Enrollment)
        .where(Enrollment.student_id == student.id)
        .options(
            selectinload(Enrollment.class_room).selectinload(ClassRoom.grade),
            selectinload(Enrollment.class_room).selectinload(ClassRoom.academic_year),
            selectinload(Enrollment.class_room)
            .selectinload(ClassRoom.subjects)
            .selectinload(ClassSubject.subject),
            selectinload(Enrollment.class_room)
            .selectinload(ClassRoom.subjects)
            .selectinload(ClassSubject.teacher),
            selectinload(Enrollment.scores).selectinload(Score.teacher),
        )
    ).all()
    enrollments = sorted(
        enrollments,
        key=lambda e: (e.class_room.grade.level, e.class_room.academic_year.name, e.started_at),
    )

    current = None
    items: list[schemas.ReportEnrollment] = []
    for e in enrollments:
        c = e.class_room
        if e.status == EnrollmentStatus.active:
            current = class_label(c)

        by_subject: dict[int, list[Score]] = defaultdict(list)
        for s in e.scores:
            by_subject[s.class_subject_id].append(s)

        subjects = []
        for cs in sorted(c.subjects, key=lambda cs: cs.subject.name):
            scores = sorted(by_subject.get(cs.id, []), key=lambda s: (s.date, s.id))
            subjects.append(
                schemas.ReportSubject(
                    class_subject_id=cs.id,
                    subject_id=cs.subject_id,
                    subject_name=cs.subject.name,
                    teacher_name=cs.teacher.full_name if cs.teacher else None,
                    scores=[score_out(s) for s in scores],
                    average=average(s.value for s in scores),
                )
            )

        items.append(
            schemas.ReportEnrollment(
                enrollment_id=e.id,
                class_id=c.id,
                class_name=c.name,
                grade_name=c.grade.name,
                grade_level=c.grade.level,
                year_name=c.academic_year.name,
                status=e.status,
                started_at=e.started_at,
                ended_at=e.ended_at,
                subjects=subjects,
                average=average(s.average for s in subjects if s.average is not None),
            )
        )

    return schemas.ReportOut(
        student=schemas.UserBrief.model_validate(student),
        current_class=current,
        enrollments=items,
    )


def load_class_subject(db: Session, class_subject_id: int) -> ClassSubject:
    cs = db.scalar(
        select(ClassSubject)
        .where(ClassSubject.id == class_subject_id)
        .options(
            selectinload(ClassSubject.subject),
            selectinload(ClassSubject.teacher),
            selectinload(ClassSubject.class_room).selectinload(ClassRoom.grade),
            selectinload(ClassSubject.class_room).selectinload(ClassRoom.academic_year),
        )
    )
    if cs is None:
        raise HTTPException(404, "درس یافت نشد")
    return cs


def build_sheet(db: Session, cs: ClassSubject) -> schemas.SheetOut:
    """Every student of the class with their scores in this one subject."""
    enrollments = db.scalars(
        select(Enrollment)
        .where(
            Enrollment.class_id == cs.class_id,
            Enrollment.status != EnrollmentStatus.withdrawn,
        )
        .options(selectinload(Enrollment.student))
    ).all()
    scores = db.scalars(
        select(Score)
        .where(Score.class_subject_id == cs.id)
        .options(selectinload(Score.teacher))
        .order_by(Score.date, Score.id)
    ).all()
    by_enrollment: dict[int, list[Score]] = defaultdict(list)
    for s in scores:
        by_enrollment[s.enrollment_id].append(s)

    students = [
        schemas.SheetStudent(
            enrollment_id=e.id,
            student=schemas.UserBrief.model_validate(e.student),
            status=e.status,
            scores=[score_out(s) for s in by_enrollment.get(e.id, [])],
            average=average(s.value for s in by_enrollment.get(e.id, [])),
        )
        for e in sorted(enrollments, key=lambda e: e.student.full_name)
    ]
    c = cs.class_room
    return schemas.SheetOut(
        class_subject_id=cs.id,
        class_id=c.id,
        class_name=c.name,
        grade_name=c.grade.name,
        year_name=c.academic_year.name,
        subject_name=cs.subject.name,
        teacher_name=cs.teacher.full_name if cs.teacher else None,
        students=students,
    )
