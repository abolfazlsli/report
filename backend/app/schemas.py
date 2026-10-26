import datetime as dt

from pydantic import BaseModel, ConfigDict, Field

from .models import EnrollmentStatus, Role


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth / users ----------


class LoginIn(BaseModel):
    username: str
    password: str


class UserBrief(ORM):
    id: int
    username: str
    full_name: str


class UserOut(UserBrief):
    national_code: str | None = None
    role: Role
    is_active: bool
    current_class_id: int | None = None
    current_class: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=4)
    role: Role
    scope_id : str
    national_code: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    password: str | None = Field(default=None, min_length=4)
    national_code: str | None = None
    is_active: bool | None = None


# ---------- structure ----------


class YearIn(BaseModel):
    name: str = Field(min_length=2, max_length=30)
    is_current: bool = False


class YearUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=30)
    is_current: bool | None = None


class YearOut(ORM):
    id: int
    name: str
    is_current: bool


class GradeIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    level: int = Field(ge=1)


class GradeOut(ORM):
    id: int
    name: str
    level: int


class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class SubjectOut(ORM):
    id: int
    name: str


class ClassIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    grade_id: int
    academic_year_id: int


class ClassUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)


class ClassOut(ORM):
    id: int
    name: str
    grade: GradeOut
    academic_year: YearOut
    student_count: int = 0


class ClassSubjectIn(BaseModel):
    subject_id: int
    teacher_id: int | None = None


class ClassSubjectUpdate(BaseModel):
    teacher_id: int | None = None


class ClassSubjectOut(ORM):
    id: int
    subject: SubjectOut
    teacher: UserBrief | None = None
    score_count: int = 0


class EnrollmentOut(ORM):
    id: int
    status: EnrollmentStatus
    started_at: dt.date
    ended_at: dt.date | None = None
    student: UserBrief


class ClassDetail(ClassOut):
    subjects: list[ClassSubjectOut]
    enrollments: list[EnrollmentOut]


class EnrollIn(BaseModel):
    student_ids: list[int] = Field(min_length=1)


class PromoteIn(BaseModel):
    source_class_id: int
    # None means the students finished school (graduated).
    target_class_id: int | None = None
    # None means every active student of the source class.
    student_ids: list[int] | None = None


class PromoteOut(BaseModel):
    moved: int
    skipped: list[str]


# ---------- scores ----------


class ScoreIn(BaseModel):
    class_subject_id: int
    enrollment_id: int
    value: float = Field(ge=0, le=20)
    date: dt.date
    title: str | None = Field(default=None, max_length=100)
    note: str | None = None


class ScoreBulkItem(BaseModel):
    enrollment_id: int
    value: float = Field(ge=0, le=20)


class ScoreBulkIn(BaseModel):
    class_subject_id: int
    date: dt.date
    title: str | None = Field(default=None, max_length=100)
    items: list[ScoreBulkItem] = Field(min_length=1)


class ScoreUpdate(BaseModel):
    value: float | None = Field(default=None, ge=0, le=20)
    date: dt.date | None = None
    title: str | None = Field(default=None, max_length=100)
    note: str | None = None


class ScoreOut(ORM):
    id: int
    value: float
    date: dt.date
    title: str | None = None
    note: str | None = None
    teacher_name: str | None = None


# ---------- report card ----------


class ReportSubject(BaseModel):
    class_subject_id: int
    subject_id: int
    subject_name: str
    teacher_name: str | None
    scores: list[ScoreOut]
    average: float | None


class ReportEnrollment(BaseModel):
    enrollment_id: int
    class_id: int
    class_name: str
    grade_name: str
    grade_level: int
    year_name: str
    status: EnrollmentStatus
    started_at: dt.date
    ended_at: dt.date | None
    subjects: list[ReportSubject]
    average: float | None


class ReportOut(BaseModel):
    student: UserBrief
    current_class: str | None
    enrollments: list[ReportEnrollment]


# ---------- score sheet (one subject of one class) ----------


class SheetStudent(BaseModel):
    enrollment_id: int
    student: UserBrief
    status: EnrollmentStatus
    scores: list[ScoreOut]
    average: float | None


class SheetOut(BaseModel):
    class_subject_id: int
    class_id: int
    class_name: str
    grade_name: str
    year_name: str
    subject_name: str
    teacher_name: str | None
    students: list[SheetStudent]


class AssignmentOut(BaseModel):
    class_subject_id: int
    class_id: int
    class_name: str
    grade_name: str
    year_name: str
    is_current_year: bool
    subject_name: str
    student_count: int



class CreateScopeDto (BaseModel) :
    scope_name : str 
    caption : str | None




class ScopeOut (ORM) :
    name : str
    caption : str | None