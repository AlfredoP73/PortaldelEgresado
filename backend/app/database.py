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
        use_null_pool = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("DB_NULL_POOL") == "1")
        if use_null_pool:
            # En AWS Lambda + Amazon Aurora Serverless v2 (Scale-to-Zero / 0 ACUs):
            # 1. NullPool cierra cada conexión al finalizar la invocación sin retener sockets congelados.
            # 2. connect_timeout=25 + reintento automático absorben la reanudación de Aurora desde 0.0 ACUs (~10-15s).
            self.engine = create_engine(
                self.database_url,
                poolclass=NullPool,
                connect_args={"connect_timeout": 25},
            )

            @event.listens_for(self.engine, "do_connect")
            def _aurora_serverless_wakeup_connect(dialect, conn_rec, cargs, cparams):
                last_exc = None
                for attempt in range(3):
                    try:
                        return dialect.connect(*cargs, **cparams)
                    except Exception as exc:
                        last_exc = exc
                        if attempt < 2:
                            time.sleep(2.0)
                raise last_exc
        else:
            self.engine = create_engine(
                self.database_url,
                pool_pre_ping=True,
            )
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
