from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from .config import settings
from .database import engine, init_schema
from .routers import admin, auth, student, teacher


@asynccontextmanager
async def lifespan(_: FastAPI):
    # For an MVP the schema is created on startup; move to Alembic migrations
    # before the schema starts changing in production.
    init_schema()
    yield


app = FastAPI(title="سامانه کارنامه", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)
app.include_router(student.router)


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError:
        return JSONResponse({"status": "error", "database": "unreachable"}, status_code=503)
    return {"status": "ok", "database": "ok"}
