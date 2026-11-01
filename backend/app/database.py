import os
import time
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/egresados_db")
        force_null_pool = os.getenv("DB_NULL_POOL") == "1"
        is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
        if force_null_pool:
            self.engine = create_engine(
                self.database_url,
                poolclass=NullPool,
                connect_args={"connect_timeout": 25},
            )
        elif is_lambda:
            # Micro-pool para AWS Lambda + Aurora PostgreSQL:
            # 1 conexión persistente por contenedor tibio evita pagar TCP + SCRAM-SHA-256 (~70ms) en cada invocación,
            # mientras pool_pre_ping=True + pool_recycle=240 descartan transparentemente sockets inactivos.
            self.engine = create_engine(
                self.database_url,
                pool_size=1,
                max_overflow=2,
                pool_pre_ping=True,
                pool_recycle=240,
                connect_args={"connect_timeout": 25},
            )
        else:
            self.engine = create_engine(
                self.database_url,
                pool_pre_ping=True,
            )

        if is_lambda or force_null_pool:
            @event.listens_for(self.engine, "do_connect")
            def _aurora_serverless_wakeup_connect(dialect, conn_rec, cargs, cparams):
                last_exc = None
                for attempt in range(3):
                    try:
                        return dialect.connect(*cargs, **cparams)
                    except Exception as exc:
                        last_exc = exc
                        if attempt < 2:
                            time.sleep(1.5)
                raise last_exc
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

db_instance = Database()
engine = db_instance.engine
SessionLocal = db_instance.SessionLocal
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
