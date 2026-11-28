
import uuid
import bcrypt

from pathlib import Path
from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, Role


EXCEL_FILE = Path("./students.xlsx")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()


def import_students(db: Session):
    workbook = load_workbook(EXCEL_FILE, read_only=True, data_only=True)
    sheet = workbook.active

    inserted = 0
    skipped = 0

    try:
        for row_number, row in enumerate(
            sheet.iter_rows(min_row=2, values_only=True),
            start=2
        ):
            (
                national_code,
                first_name,
                last_name,
                father_name,
                class_name,
                father_phone,
                mother_phone,
                grade,
            ) = row[:8]

            if not national_code:
                continue

            national_code = str(national_code).strip()

            # جلوگیری از ثبت کد ملی تکراری
            existing = db.scalar(
                select(User).where(
                    User.national_code == national_code
                )
            )

            if existing:
                print(f"SKIPPED: {national_code}")
                skipped += 1
                continue

            full_name = f"{first_name} {last_name}".strip()

            # رمز اولیه برابر کد ملی
            password_hash = hash_password(national_code)

            user = User(
                username=national_code,
                full_name=full_name,
                national_code=national_code,
                password_hash=password_hash,
                role=Role.student,
                is_active=True,
            )

            db.add(user)
            inserted += 1

            print(f"ADDED: {full_name} ({national_code})")

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        workbook.close()

    print("\nImport finished!")
    print(f"Inserted: {inserted}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    with SessionLocal() as db:
        import_students(db)
