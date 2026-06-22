from __future__ import annotations

from contextlib import contextmanager

from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from .config import AppConfig


DatabaseError = SQLAlchemyError
_config: AppConfig | None = None
_engine: Engine | None = None
SessionLocal = sessionmaker(future=True)


def configure_database(config: AppConfig) -> None:
    global _config, _engine
    _config = config
    _engine = create_engine(
        config.database_uri(),
        pool_pre_ping=True,
        pool_recycle=1800,
        future=True,
        connect_args={"charset": "utf8mb4"},
    )
    SessionLocal.configure(bind=_engine)


def engine() -> Engine:
    if _engine is None:
        raise RuntimeError("database is not configured")
    return _engine


@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def ping() -> None:
    with engine().begin() as conn:
        conn.execute(select(1))
