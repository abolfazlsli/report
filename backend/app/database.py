from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    # fail fast instead of hanging requests when Postgres is down
    connect_args={"connect_timeout": 5},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_schema():
    """Create missing tables and apply the few additive column changes that
    `create_all` can't (it never alters existing tables)."""
    from . import models  # noqa: F401  register models

    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE classes ADD COLUMN IF NOT EXISTS unit_id INTEGER "
                "REFERENCES units(id) ON DELETE RESTRICT"
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_classes_unit_id ON classes (unit_id)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar BYTEA"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20)"))
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ")
        )
