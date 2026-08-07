from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# SQLite multi-thread connection configuration
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Initialize SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG
)

# Database Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base Model
Base = declarative_base()


def get_db():
    """
    Dependency generator for database sessions per request.
    Yields a SQLAlchemy session and ensures proper closing after execution.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
