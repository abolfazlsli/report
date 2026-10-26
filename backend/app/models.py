"""Database models.

Structure:
  AcademicYear (دوره / سال تحصیلی) ─┐
  Grade (پایه) ─────────────────────┼─> ClassRoom (کلاس) ─> ClassSubject (درس کلاس + معلم)
                                     │         │
  User(student) ── Enrollment ───────┘         └─ Score (نمره) <── ClassSubject

Each Enrollment is one student in one class for one academic year. When a
student is promoted the old enrollment is closed (status=promoted) and a new
one is opened, so every past score stays attached to the class/year it was
given in — the academic history is never overwritten.
"""

import datetime as dt
import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Integer ,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class Status(str , enum.Enum) :
    reject = "reject"
    acsept = "acsept"


import uuid

class BasicTable(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    public_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    row_status: Mapped[Status] = mapped_column(
        Enum(Status, name="row_status"),
        nullable=False,
        default=Status.accept,
    )

    create_at: Mapped[DateTime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now(),
    )
    update_at : Mapped[DateTime] = mapped_column(
        DateTime , 
        nullable=False ,
        default=func.now() ,
        onupdate=func.now()
    )

class EnrollmentStatus(str, enum.Enum):
    active = "active"  # currently studying in this class
    promoted = "promoted"  # moved on to another class
    completed = "completed"  # finished school (graduated)
    withdrawn = "withdrawn"  # removed from the class



class Scope(BasicTable) :
    __tablename__ = "scope"
    name : Mapped[str] = mapped_column( 
        nullable=False ,
    ) # واحد ۷ 
    caption : Mapped[str | None] = mapped_column(
        nullable=True
    )



class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    national_code: Mapped[str | None] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role"))
    scope_id : Mapped[int] = mapped_column(
        ForeignKey("scope.id") , 
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="student")
    scope : Mapped[Scope] = relationship()

class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True)
    is_current: Mapped[bool] = mapped_column(default=False)


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    # Ordering used for promotions (1 = first grade, 2 = second ...)
    level: Mapped[int] = mapped_column(unique=True)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)


class ClassRoom(Base):
    __tablename__ = "classes"
    __table_args__ = (UniqueConstraint("name", "grade_id", "academic_year_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    grade_id: Mapped[int] = mapped_column(ForeignKey("grades.id", ondelete="RESTRICT"))
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT")
    )
    scope_id : Mapped[int] = mapped_column(
        ForeignKey("scope.id") , 
        nullable=False
    )
    grade: Mapped[Grade] = relationship()
    academic_year: Mapped[AcademicYear] = relationship()
    subjects: Mapped[list["ClassSubject"]] = relationship(
        back_populates="class_room", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="class_room")


class ClassSubject(Base):
    """A subject taught in a specific class, by a specific teacher."""

    __tablename__ = "class_subjects"
    __table_args__ = (UniqueConstraint("class_id", "subject_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"))
    teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    class_room: Mapped[ClassRoom] = relationship(back_populates="subjects")
    subject: Mapped[Subject] = relationship()
    teacher: Mapped[User | None] = relationship()
    scores: Mapped[list["Score"]] = relationship(back_populates="class_subject")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "class_id"),
        # A student can only have one active class at a time.
        Index(
            "uq_one_active_enrollment",
            "student_id",
            unique=True,
            postgresql_where="status = 'active'",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="RESTRICT"))
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, name="enrollment_status"),
        default=EnrollmentStatus.active,
    )
    started_at: Mapped[date] = mapped_column(Date, default=date.today)
    ended_at: Mapped[date | None] = mapped_column(Date)

    student: Mapped[User] = relationship(back_populates="enrollments")
    class_room: Mapped[ClassRoom] = relationship(back_populates="enrollments")
    scores: Mapped[list["Score"]] = relationship(
        back_populates="enrollment", cascade="all, delete-orphan"
    )


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    enrollment_id: Mapped[int] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"), index=True
    )
    class_subject_id: Mapped[int] = mapped_column(
        ForeignKey("class_subjects.id", ondelete="RESTRICT"), index=True
    )
    # The teacher who recorded the score (kept even if the class teacher changes).
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    value: Mapped[float] = mapped_column(Numeric(4, 2))
    date: Mapped[dt.date] = mapped_column(Date)
    title: Mapped[str | None] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    enrollment: Mapped[Enrollment] = relationship(back_populates="scores")
    class_subject: Mapped[ClassSubject] = relationship(back_populates="scores")
    teacher: Mapped[User | None] = relationship()


class EvaluationCriteria (BasicTable) :
    __tablename__ = "evaluation_criteria"

    name : Mapped[str] = mapped_column(nullable=False)
    scope_id : Mapped[int] = mapped_column(
        ForeignKey("scope.id") , 
        nullable=False,
    )


class EvaluationCriteriaScore(BasicTable) :
    __tablename__ = "evaluation_criteria_score"

    user_id  : Mapped[int] = mapped_column(
        ForeignKey("users.id") ,
        nullable=False
    )

    evaluation_criteria_id : Mapped[int] = mapped_column(
        ForeignKey("evaluation_criteria.id")
    )
    score : Mapped[int] = mapped_column(
        nullable=False
    )  # from 0 to 5 
    evaluation_criteria : Mapped[EvaluationCriteria] = relationship()
    