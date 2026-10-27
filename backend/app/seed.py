"""Create the admin account and (optionally) demo data.

    python -m app.seed          # admin + demo data
    python -m app.seed --bare   # admin only
"""

import random
import sys
from datetime import date, timedelta

from sqlalchemy import select

from .database import SessionLocal, init_schema
from .models import (
    AcademicYear,
    ClassRoom,
    ClassSubject,
    Criterion,
    CriterionScore,
    Enrollment,
    EnrollmentStatus,
    Grade,
    Role,
    Score,
    Subject,
    Unit,
    User,
)
from .security import hash_password


def get_or_create_user(db, username, full_name, role, password):
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        user = User(
            username=username,
            full_name=full_name,
            role=role,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.flush()
    return user


def add_scores(db, enrollment, class_subject, teacher, start: date, count: int, rng):
    level = rng.uniform(14, 19)
    for i in range(count):
        level = min(20, max(8, level + rng.uniform(-1.5, 1.5)))
        db.add(
            Score(
                enrollment_id=enrollment.id,
                class_subject_id=class_subject.id,
                teacher_id=teacher.id,
                value=round(level * 4) / 4,  # quarter points, like 17.25
                date=start + timedelta(days=21 * i),
                title=f"ارزشیابی {i + 1}",
            )
        )


def seed_demo(db):
    if db.scalar(select(Grade.id).limit(1)):
        print("Demo data already present, skipping.")
        return
    rng = random.Random(42)

    grades = [
        Grade(name=n, level=i + 1)
        for i, n in enumerate(["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم"])
    ]
    subjects = {n: Subject(name=n) for n in ["علوم", "ریاضی", "فارسی", "قرآن", "هدیه‌های آسمان"]}
    unit_a = Unit(name="واحد ۱ - دبستان دخترانه", description="پایه‌های اول تا سوم")
    unit_b = Unit(name="واحد ۲ - دبستان پسرانه", description="پایه‌های اول تا ششم")
    past = AcademicYear(name="1404-1405")
    current = AcademicYear(name="1405-1406", is_current=True)
    db.add_all([*grades, *subjects.values(), unit_a, unit_b, past, current])
    db.flush()

    t_science = get_or_create_user(db, "teacher1", "مریم احمدی", Role.teacher, "teacher123")
    t_math = get_or_create_user(db, "teacher2", "رضا کریمی", Role.teacher, "teacher123")
    t_farsi = get_or_create_user(db, "teacher3", "زهرا موسوی", Role.teacher, "teacher123")
    teachers = {"علوم": t_science, "ریاضی": t_math, "فارسی": t_farsi}

    students = [
        get_or_create_user(db, f"student{i + 1}", name, Role.student, "student123")
        for i, name in enumerate(
            ["علی رضایی", "محمد حسینی", "فاطمه محمدی", "سارا جعفری", "امیر قاسمی"]
        )
    ]

    criteria = {
        "علوم": ["مشاهده و آزمایش", "پرسشگری", "کار گروهی"],
        "ریاضی": ["حل مسئله", "محاسبه ذهنی", "دقت و نظم"],
        "فارسی": ["روخوانی", "املا", "درک مطلب", "نگارش"],
    }
    criteria_rows = {
        sname: [
            Criterion(subject_id=subjects[sname].id, title=t, order=i)
            for i, t in enumerate(titles)
        ]
        for sname, titles in criteria.items()
    }
    db.add_all([c for rows in criteria_rows.values() for c in rows])
    db.flush()

    def add_ratings(enrollment, class_subject, teacher, sname):
        for c in criteria_rows[sname]:
            db.add(
                CriterionScore(
                    enrollment_id=enrollment.id,
                    criterion_id=c.id,
                    class_subject_id=class_subject.id,
                    teacher_id=teacher.id,
                    value=rng.choice([3, 4, 4, 5, 5]),
                )
            )

    def make_class(name, grade, year, unit=unit_a):
        c = ClassRoom(name=name, grade_id=grade.id, unit_id=unit.id, academic_year_id=year.id)
        db.add(c)
        db.flush()
        css = {}
        for sname, teacher in teachers.items():
            cs = ClassSubject(class_id=c.id, subject_id=subjects[sname].id, teacher_id=teacher.id)
            db.add(cs)
            css[sname] = cs
        db.flush()
        return c, css

    # Last year: grade 1, everyone finished and was promoted.
    c1, c1_subjects = make_class("الف", grades[0], past)
    # This year: grade 2.
    c2, c2_subjects = make_class("الف", grades[1], current)
    make_class("ب", grades[1], current, unit_b)

    for s in students:
        old = Enrollment(
            student_id=s.id,
            class_id=c1.id,
            status=EnrollmentStatus.promoted,
            started_at=date(2025, 9, 23),
            ended_at=date(2026, 6, 20),
        )
        db.add(old)
        db.flush()
        new = Enrollment(student_id=s.id, class_id=c2.id, started_at=date(2026, 9, 23))
        db.add(new)
        db.flush()
        for sname, cs in c1_subjects.items():
            add_scores(db, old, cs, teachers[sname], date(2025, 10, 5), 9, rng)
            add_ratings(old, cs, teachers[sname], sname)
        for sname, cs in c2_subjects.items():
            add_scores(db, new, cs, teachers[sname], date(2026, 9, 28), 1, rng)

    print("Demo data created.")


def main():
    init_schema()
    with SessionLocal() as db:
        get_or_create_user(db, "admin", "مدیر سامانه", Role.admin, "admin123")
        if "--bare" not in sys.argv:
            seed_demo(db)
        db.commit()
    print("Done. Admin login: admin / admin123")


if __name__ == "__main__":
    main()
