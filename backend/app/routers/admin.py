from datetime import date

from fastapi import APIRouter, Depends, HTTPException , Body
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from .. import schemas
from ..database import get_db
from ..deps import require_role
from ..models import (
    AcademicYear,
    ClassRoom,
    ClassSubject,
    Enrollment,
    EnrollmentStatus,
    Grade,
    Role,
    Score,
    Subject,
    User , 
    Scope
)
from ..security import hash_password
from ..services import (
    build_report,
    build_sheet,
    class_label,
    class_out,
    current_classes,
    get_or_404,
    load_class_subject,
    user_out,
)

admin_only = require_role(Role.admin)
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin_only)])


def ensure_unique(db: Session, model, column, value, message: str, exclude_id: int | None = None):
    stmt = select(model.id).where(column == value)
    if exclude_id is not None:
        stmt = stmt.where(model.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(400, message)


def get_scope_by_public_id (db : Session , public_id : str) -> Scope :
    out = db.query(Scope).filter(Scope.public_id == public_id).one_or_none()
    if not out :
        raise "cant find any data"
    return out

def class_query():
    return select(ClassRoom).options(
        selectinload(ClassRoom.grade),
        selectinload(ClassRoom.academic_year),
        selectinload(ClassRoom.enrollments),
    )


def scope_out (scope : Scope) :
    return schemas.ScopeOut.model_validate(scope)

# ======================= dashboard =======================


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    def count(stmt):
        return db.scalar(stmt) or 0

    current_year = db.scalar(select(AcademicYear).where(AcademicYear.is_current))
    recent = db.scalars(
        select(Score)
        .options(
            selectinload(Score.enrollment).selectinload(Enrollment.student),
            selectinload(Score.class_subject).selectinload(ClassSubject.subject),
            selectinload(Score.class_subject)
            .selectinload(ClassSubject.class_room)
            .selectinload(ClassRoom.grade),
            selectinload(Score.teacher),
        )
        .order_by(Score.created_at.desc(), Score.id.desc())
        .limit(10)
    ).all()
    return {
        "students": count(select(func.count()).where(User.role == Role.student)),
        "teachers": count(select(func.count()).where(User.role == Role.teacher)),
        "classes": count(
            select(func.count(ClassRoom.id)).where(
                ClassRoom.academic_year_id == current_year.id
            )
        )
        if current_year
        else 0,
        "scores": count(select(func.count(Score.id))),
        "current_year": current_year.name if current_year else None,
        "unassigned_subjects": count(
            select(func.count(ClassSubject.id)).where(ClassSubject.teacher_id.is_(None))
        ),
        "recent_scores": [
            {
                "id": s.id,
                "value": float(s.value),
                "date": s.date,
                "title": s.title,
                "student_id": s.enrollment.student_id,
                "student_name": s.enrollment.student.full_name,
                "subject_name": s.class_subject.subject.name,
                "class_name": f"{s.class_subject.class_room.grade.name} - {s.class_subject.class_room.name}",
                "teacher_name": s.teacher.full_name if s.teacher else None,
            }
            for s in recent
        ],
    }


# ======================= users =======================


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(
    role: Role | None = None,
    q: str | None = None,
    unassigned: bool = False,
    db: Session = Depends(get_db),
):
    stmt = select(User).order_by(User.full_name)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(User.full_name.ilike(like), User.username.ilike(like), User.national_code.ilike(like))
        )
    users = db.scalars(stmt).all()
    current = current_classes(db, [u.id for u in users])
    out = [user_out(u, current.get(u.id)) for u in users]
    if unassigned:
        out = [u for u in out if u.current_class_id is None]
    return out


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip()
    ensure_unique(db, User, User.username, username, "این نام کاربری قبلاً ثبت شده است")
    if data.national_code:
        ensure_unique(db, User, User.national_code, data.national_code, "این کد ملی قبلاً ثبت شده است")
    scope = get_scope_by_public_id(db , data.scope_id)
    user = User(
        username=username,
        full_name=data.full_name.strip(),
        national_code=data.national_code or None,
        password_hash=hash_password(data.password),
        scope_id = scope.id,
        role=data.role,
    )
    db.add(user)
    db.commit()
    return user_out(user, None)


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, data: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = get_or_404(db, User, user_id, "کاربر یافت نشد")
    fields = data.model_dump(exclude_unset=True)
    if "password" in fields:
        password = fields.pop("password")
        if password:
            user.password_hash = hash_password(password)
    if "national_code" in fields:
        fields["national_code"] = fields["national_code"] or None
        if fields["national_code"]:
            ensure_unique(
                db, User, User.national_code, fields["national_code"],
                "این کد ملی قبلاً ثبت شده است", exclude_id=user.id,
            )
    for field, value in fields.items():
        setattr(user, field, value)
    db.commit()
    return user_out(user, current_classes(db, [user.id]).get(user.id))



@router.post("/create-scope")
async def create_scope(
    data : schemas.CreateScopeDto,
    db : Session = Depends(get_db) ,
    me : User = Depends(admin_only) ,
) :
    scope = Scope(
        name = data.name , 
        caption = data.caption if data.caption else None
    )
    db.add(scope)
    db.commit()
    return JSONResponse(
        content={
            "result" : "scope created"
        } , 
        status_code=200
    )


@router.put("/edit-scope/{scope_id}")
async def edit_scope (
    scope_id : str ,
    db : Session = Depends(get_db) ,
    user : User = Depends(admin_only) ,
    data : schemas.CreateScopeDto = Body()
) :
    scope = get_scope_by_public_id(db , scope_id)
    scope.name = data.scope_name
    scope.caption = data.caption
    db.commit()
    return JSONResponse( content={
        "result" : "scope edited"
    } , status_code=200
    )

@router.get("/scopes")
async def get_scopes(
    db : Session = Depends(get_db) , 
    user : User = Depends(admin_only)
) :
    return



@router.get("/scope/{scope_id}")
async def get_scope_by_id (
    scope_id : str ,
    db : Session = Depends(get_db) , 
    user : User = Depends(admin_only) , 
) : 
    scope = get_scope_by_public_id(db , scope_id)
    return JSONResponse(
        content={
            "result" : scope_out(scope)
        } ,
        status_code=200
    )


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), me: User = Depends(admin_only)):
    user = get_or_404(db, User, user_id, "کاربر یافت نشد")
    if user.id == me.id:
        raise HTTPException(400, "نمی‌توانید حساب خودتان را حذف کنید")
    has_history = db.scalar(
        select(Score.id)
        .join(Enrollment, Enrollment.id == Score.enrollment_id)
        .where(or_(Enrollment.student_id == user.id, Score.teacher_id == user.id))
        .limit(1)
    )
    if has_history:
        raise HTTPException(
            400, "این کاربر سابقه نمره دارد؛ برای حفظ سوابق به جای حذف، او را غیرفعال کنید"
        )
    db.delete(user)
    db.commit()


# ======================= academic years (دوره) =======================


@router.get("/years", response_model=list[schemas.YearOut])
def list_years(db: Session = Depends(get_db)):
    return db.scalars(select(AcademicYear).order_by(AcademicYear.name.desc())).all()


def _set_current(db: Session, year: AcademicYear):
    db.execute(update(AcademicYear).where(AcademicYear.id != year.id).values(is_current=False))
    year.is_current = True


@router.post("/years", response_model=schemas.YearOut, status_code=201)
def create_year(data: schemas.YearIn, db: Session = Depends(get_db)):
    ensure_unique(db, AcademicYear, AcademicYear.name, data.name, "این دوره قبلاً ثبت شده است")
    year = AcademicYear(name=data.name.strip())
    db.add(year)
    db.flush()
    if data.is_current:
        _set_current(db, year)
    db.commit()
    return year


@router.patch("/years/{year_id}", response_model=schemas.YearOut)
def update_year(year_id: int, data: schemas.YearUpdate, db: Session = Depends(get_db)):
    year = get_or_404(db, AcademicYear, year_id)
    if data.name:
        ensure_unique(db, AcademicYear, AcademicYear.name, data.name, "این دوره قبلاً ثبت شده است", year.id)
        year.name = data.name.strip()
    if data.is_current:
        _set_current(db, year)
    elif data.is_current is False:
        year.is_current = False
    db.commit()
    return year


@router.delete("/years/{year_id}", status_code=204)
def delete_year(year_id: int, db: Session = Depends(get_db)):
    year = get_or_404(db, AcademicYear, year_id)
    if db.scalar(select(ClassRoom.id).where(ClassRoom.academic_year_id == year.id).limit(1)):
        raise HTTPException(400, "این دوره کلاس دارد و قابل حذف نیست")
    db.delete(year)
    db.commit()


# ======================= grades (پایه) =======================


@router.get("/grades", response_model=list[schemas.GradeOut])
def list_grades(db: Session = Depends(get_db)):
    return db.scalars(select(Grade).order_by(Grade.level)).all()


@router.post("/grades", response_model=schemas.GradeOut, status_code=201)
def create_grade(data: schemas.GradeIn, db: Session = Depends(get_db)):
    ensure_unique(db, Grade, Grade.name, data.name, "این پایه قبلاً ثبت شده است")
    ensure_unique(db, Grade, Grade.level, data.level, "پایه‌ای با این ترتیب وجود دارد")
    grade = Grade(name=data.name.strip(), level=data.level)
    db.add(grade)
    db.commit()
    return grade


@router.patch("/grades/{grade_id}", response_model=schemas.GradeOut)
def update_grade(grade_id: int, data: schemas.GradeIn, db: Session = Depends(get_db)):
    grade = get_or_404(db, Grade, grade_id)
    ensure_unique(db, Grade, Grade.name, data.name, "این پایه قبلاً ثبت شده است", grade.id)
    ensure_unique(db, Grade, Grade.level, data.level, "پایه‌ای با این ترتیب وجود دارد", grade.id)
    grade.name, grade.level = data.name.strip(), data.level
    db.commit()
    return grade


@router.delete("/grades/{grade_id}", status_code=204)
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    grade = get_or_404(db, Grade, grade_id)
    if db.scalar(select(ClassRoom.id).where(ClassRoom.grade_id == grade.id).limit(1)):
        raise HTTPException(400, "این پایه کلاس دارد و قابل حذف نیست")
    db.delete(grade)
    db.commit()


# ======================= subjects (درس) =======================


@router.get("/subjects", response_model=list[schemas.SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.scalars(select(Subject).order_by(Subject.name)).all()


@router.post("/subjects", response_model=schemas.SubjectOut, status_code=201)
def create_subject(data: schemas.SubjectIn, db: Session = Depends(get_db)):
    ensure_unique(db, Subject, Subject.name, data.name, "این درس قبلاً ثبت شده است")
    subject = Subject(name=data.name.strip())
    db.add(subject)
    db.commit()
    return subject


@router.patch("/subjects/{subject_id}", response_model=schemas.SubjectOut)
def update_subject(subject_id: int, data: schemas.SubjectIn, db: Session = Depends(get_db)):
    subject = get_or_404(db, Subject, subject_id)
    ensure_unique(db, Subject, Subject.name, data.name, "این درس قبلاً ثبت شده است", subject.id)
    subject.name = data.name.strip()
    db.commit()
    return subject


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = get_or_404(db, Subject, subject_id)
    if db.scalar(select(ClassSubject.id).where(ClassSubject.subject_id == subject.id).limit(1)):
        raise HTTPException(400, "این درس در کلاس‌ها استفاده شده و قابل حذف نیست")
    db.delete(subject)
    db.commit()


# ======================= classes (کلاس) =======================


@router.get("/classes", response_model=list[schemas.ClassOut])
def list_classes(
    year_id: int | None = None, grade_id: int | None = None, db: Session = Depends(get_db)
):
    stmt = class_query()
    if year_id:
        stmt = stmt.where(ClassRoom.academic_year_id == year_id)
    if grade_id:
        stmt = stmt.where(ClassRoom.grade_id == grade_id)
    classes = db.scalars(stmt).all()
    classes = sorted(
        classes, key=lambda c: (-c.academic_year.is_current, c.academic_year.name, c.grade.level, c.name)
    )
    return [class_out(c) for c in classes]


@router.post("/classes", response_model=schemas.ClassOut, status_code=201)
def create_class(data: schemas.ClassIn, db: Session = Depends(get_db)):
    get_or_404(db, Grade, data.grade_id, "پایه یافت نشد")
    get_or_404(db, AcademicYear, data.academic_year_id, "دوره یافت نشد")
    exists = db.scalar(
        select(ClassRoom.id).where(
            ClassRoom.name == data.name.strip(),
            ClassRoom.grade_id == data.grade_id,
            ClassRoom.academic_year_id == data.academic_year_id,
        )
    )
    if exists:
        raise HTTPException(400, "این کلاس در این پایه و دوره وجود دارد")
    c = ClassRoom(name=data.name.strip(), grade_id=data.grade_id, academic_year_id=data.academic_year_id)
    db.add(c)
    db.commit()
    return class_out(db.scalar(class_query().where(ClassRoom.id == c.id)))


@router.get("/classes/{class_id}", response_model=schemas.ClassDetail)
def class_detail(class_id: int, db: Session = Depends(get_db)):
    c = db.scalar(
        class_query()
        .where(ClassRoom.id == class_id)
        .options(
            selectinload(ClassRoom.subjects).selectinload(ClassSubject.subject),
            selectinload(ClassRoom.subjects).selectinload(ClassSubject.teacher),
            selectinload(ClassRoom.subjects).selectinload(ClassSubject.scores),
            selectinload(ClassRoom.enrollments).selectinload(Enrollment.student),
        )
    )
    if c is None:
        raise HTTPException(404, "کلاس یافت نشد")
    status_order = {s: i for i, s in enumerate(EnrollmentStatus)}
    return schemas.ClassDetail(
        **class_out(c).model_dump(),
        subjects=[
            schemas.ClassSubjectOut(
                id=cs.id,
                subject=schemas.SubjectOut.model_validate(cs.subject),
                teacher=schemas.UserBrief.model_validate(cs.teacher) if cs.teacher else None,
                score_count=len(cs.scores),
            )
            for cs in sorted(c.subjects, key=lambda cs: cs.subject.name)
        ],
        enrollments=[
            schemas.EnrollmentOut.model_validate(e)
            for e in sorted(c.enrollments, key=lambda e: (status_order[e.status], e.student.full_name))
        ],
    )


@router.patch("/classes/{class_id}", response_model=schemas.ClassOut)
def update_class(class_id: int, data: schemas.ClassUpdate, db: Session = Depends(get_db)):
    c = get_or_404(db, ClassRoom, class_id, "کلاس یافت نشد")
    if data.name:
        c.name = data.name.strip()
    db.commit()
    return class_out(db.scalar(class_query().where(ClassRoom.id == c.id)))


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    c = get_or_404(db, ClassRoom, class_id, "کلاس یافت نشد")
    if db.scalar(select(Enrollment.id).where(Enrollment.class_id == c.id).limit(1)):
        raise HTTPException(400, "این کلاس دانش‌آموز یا سابقه دارد و قابل حذف نیست")
    db.delete(c)
    db.commit()


# ---------- subjects of a class (+ teacher assignment) ----------


def _check_teacher(db: Session, teacher_id: int | None):
    if teacher_id is None:
        return
    teacher = get_or_404(db, User, teacher_id, "معلم یافت نشد")
    if teacher.role != Role.teacher:
        raise HTTPException(400, "کاربر انتخاب‌شده معلم نیست")


@router.post("/classes/{class_id}/subjects", status_code=201)
def add_class_subject(class_id: int, data: schemas.ClassSubjectIn, db: Session = Depends(get_db)):
    get_or_404(db, ClassRoom, class_id, "کلاس یافت نشد")
    get_or_404(db, Subject, data.subject_id, "درس یافت نشد")
    _check_teacher(db, data.teacher_id)
    exists = db.scalar(
        select(ClassSubject.id).where(
            ClassSubject.class_id == class_id, ClassSubject.subject_id == data.subject_id
        )
    )
    if exists:
        raise HTTPException(400, "این درس قبلاً به کلاس اضافه شده است")
    cs = ClassSubject(class_id=class_id, subject_id=data.subject_id, teacher_id=data.teacher_id)
    db.add(cs)
    db.commit()
    return {"id": cs.id}


@router.patch("/class-subjects/{class_subject_id}")
def update_class_subject(
    class_subject_id: int, data: schemas.ClassSubjectUpdate, db: Session = Depends(get_db)
):
    cs = get_or_404(db, ClassSubject, class_subject_id, "درس یافت نشد")
    _check_teacher(db, data.teacher_id)
    cs.teacher_id = data.teacher_id
    db.commit()
    return {"id": cs.id}


@router.delete("/class-subjects/{class_subject_id}", status_code=204)
def delete_class_subject(class_subject_id: int, db: Session = Depends(get_db)):
    cs = get_or_404(db, ClassSubject, class_subject_id, "درس یافت نشد")
    if db.scalar(select(Score.id).where(Score.class_subject_id == cs.id).limit(1)):
        raise HTTPException(400, "برای این درس نمره ثبت شده و قابل حذف نیست")
    db.delete(cs)
    db.commit()


@router.get("/class-subjects/{class_subject_id}/sheet", response_model=schemas.SheetOut)
def class_subject_sheet(class_subject_id: int, db: Session = Depends(get_db)):
    return build_sheet(db, load_class_subject(db, class_subject_id))


# ---------- students of a class ----------


@router.post("/classes/{class_id}/enrollments", status_code=201)
def enroll_students(class_id: int, data: schemas.EnrollIn, db: Session = Depends(get_db)):
    get_or_404(db, ClassRoom, class_id, "کلاس یافت نشد")
    students = db.scalars(select(User).where(User.id.in_(data.student_ids))).all()
    if len(students) != len(set(data.student_ids)):
        raise HTTPException(404, "برخی دانش‌آموزان یافت نشدند")
    current = current_classes(db, [s.id for s in students])
    for s in students:
        if s.role != Role.student:
            raise HTTPException(400, f"«{s.full_name}» دانش‌آموز نیست")
        if s.id in current:
            raise HTTPException(
                400,
                f"«{s.full_name}» در کلاس {class_label(current[s.id])} فعال است؛ "
                "برای جابجایی از بخش ارتقا استفاده کنید",
            )
        old = db.scalar(
            select(Enrollment).where(Enrollment.student_id == s.id, Enrollment.class_id == class_id)
        )
        if old:  # re-activate a previously withdrawn enrollment, keeping its scores
            old.status, old.ended_at = EnrollmentStatus.active, None
        else:
            db.add(Enrollment(student_id=s.id, class_id=class_id))
    db.commit()
    return {"enrolled": len(students)}


@router.delete("/enrollments/{enrollment_id}", status_code=204)
def remove_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    """Remove a student from a class. If they already have scores, the
    enrollment is kept as 'withdrawn' so the history is not lost."""
    e = get_or_404(db, Enrollment, enrollment_id, "ثبت‌نام یافت نشد")
    if db.scalar(select(Score.id).where(Score.enrollment_id == e.id).limit(1)):
        e.status, e.ended_at = EnrollmentStatus.withdrawn, date.today()
    else:
        db.delete(e)
    db.commit()


# ---------- promotion (انتقال به پایه بالاتر) ----------


@router.post("/promote", response_model=schemas.PromoteOut)
def promote(data: schemas.PromoteIn, db: Session = Depends(get_db)):
    get_or_404(db, ClassRoom, data.source_class_id, "کلاس مبدا یافت نشد")
    if data.target_class_id is not None:
        if data.target_class_id == data.source_class_id:
            raise HTTPException(400, "کلاس مبدا و مقصد نمی‌تواند یکسان باشد")
        get_or_404(db, ClassRoom, data.target_class_id, "کلاس مقصد یافت نشد")

    stmt = (
        select(Enrollment)
        .where(
            Enrollment.class_id == data.source_class_id,
            Enrollment.status == EnrollmentStatus.active,
        )
        .options(selectinload(Enrollment.student))
    )
    if data.student_ids is not None:
        stmt = stmt.where(Enrollment.student_id.in_(data.student_ids))
    enrollments = db.scalars(stmt).all()
    if not enrollments:
        raise HTTPException(400, "دانش‌آموز فعالی برای انتقال انتخاب نشده است")

    skipped: list[str] = []
    to_open: list[int] = []
    today = date.today()
    for e in enrollments:
        if data.target_class_id is not None:
            already = db.scalar(
                select(Enrollment.id).where(
                    Enrollment.student_id == e.student_id,
                    Enrollment.class_id == data.target_class_id,
                )
            )
            if already:
                skipped.append(e.student.full_name)
                continue
            e.status = EnrollmentStatus.promoted
            to_open.append(e.student_id)
        else:
            e.status = EnrollmentStatus.completed
        e.ended_at = today

    # Close the old enrollments first so the "one active class" index holds.
    db.flush()
    for student_id in to_open:
        db.add(Enrollment(student_id=student_id, class_id=data.target_class_id, started_at=today))
    db.commit()
    return schemas.PromoteOut(moved=len(enrollments) - len(skipped), skipped=skipped)


# ---------- oversight ----------


@router.get("/students/{student_id}/report", response_model=schemas.ReportOut)
def student_report(student_id: int, db: Session = Depends(get_db)):
    student = get_or_404(db, User, student_id, "دانش‌آموز یافت نشد")
    if student.role != Role.student:
        raise HTTPException(400, "کاربر دانش‌آموز نیست")
    return build_report(db, student)
