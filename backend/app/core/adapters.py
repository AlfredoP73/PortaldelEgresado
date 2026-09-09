from abc import ABC, abstractmethod
from typing import Optional
from fastapi import UploadFile
import httpx
import os
import uuid
import pika
import json
from circuitbreaker import circuit

class StoragePort(ABC):
    @abstractmethod
    def upload_file(self, file: UploadFile, bucket: str, prefix: str = "") -> str:
        pass

class MinioStorageAdapter(StoragePort):
    def __init__(self):
        from app.core.s3 import MinioClient
        self.s3_client = MinioClient.get_client()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def upload_file(self, file: UploadFile, bucket: str, content_type: str = "application/pdf") -> str:
        try:
            self.s3_client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                self.s3_client.create_bucket(Bucket=bucket)
            except Exception as e:
                print(f"Error creating bucket {bucket}: {e}")

        filename = f"{uuid.uuid4()}_{file.filename}"
        
        self.s3_client.upload_fileobj(
            file.file,
            bucket,
            filename,
            ExtraArgs={"ContentType": content_type}
        )
        return filename

class MatchmakingPort(ABC):
    @abstractmethod
    def trigger_recalculate(self, graduate_id: Optional[int] = None, job_offer_id: Optional[int] = None) -> bool:
        pass

class RabbitMQMatchmakingAdapter(MatchmakingPort):
    def __init__(self):
        self.rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

    @circuit(failure_threshold=5, recovery_timeout=60)
    def trigger_recalculate(self, graduate_id: Optional[int] = None, job_offer_id: Optional[int] = None) -> bool:
        payload = {}
        if graduate_id is not None:
            payload["graduate_id"] = graduate_id
        if job_offer_id is not None:
            payload["job_offer_id"] = job_offer_id
        if not payload:
            return False

        try:
            params = pika.URLParameters(self.rabbitmq_url)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue='matchmaking_queue', durable=True)
            
            channel.basic_publish(
                exchange='',
                routing_key='matchmaking_queue',
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    delivery_mode=2, # make message persistent
                )
            )
            connection.close()
            return True
        except Exception as e:
            print(f"Error publishing to RabbitMQ: {e}")
            return False

# ── Inter-Service HTTP Communication Ports & Adapters ──

class GraduatesServicePort(ABC):
    @abstractmethod
    def get_all_graduates(self) -> list: pass
    
    @abstractmethod
    def get_graduate(self, graduate_id: int) -> Optional[dict]: pass

    @abstractmethod
    def get_matchmaking_graduate(self, graduate_id: int) -> Optional[dict]: pass

    @abstractmethod
    def get_matchmaking_graduate_ids(self) -> list: pass

class HttpGraduatesAdapter(GraduatesServicePort):
    def __init__(self):
        self.base_url = os.getenv("GRADUATES_URL", "http://graduates:8000")

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_graduates(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/graduates", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_graduate(self, graduate_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/graduates/{graduate_id}", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_graduate(self, graduate_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/graduates/{graduate_id}", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_graduate_ids(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/graduates", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

class CompaniesServicePort(ABC):
    @abstractmethod
    def get_all_companies(self) -> list: pass

    @abstractmethod
    def get_all_applications(self) -> list: pass
    
    @abstractmethod
    def get_jobs(self, params: dict) -> dict: pass
    
    @abstractmethod
    def apply_for_job(self, payload: dict) -> dict: pass
    
    @abstractmethod
    def get_my_applications(self, graduate_id: int) -> list: pass

    @abstractmethod
    def get_programs(self) -> list: pass

    @abstractmethod
    def get_matchmaking_job(self, job_offer_id: int) -> Optional[dict]: pass

    @abstractmethod
    def get_matchmaking_job_ids(self) -> list: pass

class HttpCompaniesAdapter(CompaniesServicePort):
    def __init__(self):
        self.base_url = os.getenv("COMPANIES_URL", "http://companies:8000")

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_companies(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/companies", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_applications(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/applications", timeout=5.0)
        resp.raise_for_status()
        return resp.json()
        
    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_jobs(self, params: dict) -> dict:
        resp = httpx.get(f"{self.base_url}/api/internal/jobs", params=params, timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def apply_for_job(self, payload: dict) -> dict:
        resp = httpx.post(f"{self.base_url}/api/internal/applications/apply", json=payload, timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_my_applications(self, graduate_id: int) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/applications/graduate/{graduate_id}", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_programs(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/programs", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_job(self, job_offer_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/jobs/{job_offer_id}", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_job_ids(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/jobs", timeout=5.0)
        resp.raise_for_status()
        return resp.json()

class AuthServicePort(ABC):
    @abstractmethod
    def create_user(self, payload: dict) -> dict: pass

class HttpAuthAdapter(AuthServicePort):
    def __init__(self):
        self.base_url = os.getenv("AUTH_URL", "http://auth:8000")

    @circuit(failure_threshold=3, recovery_timeout=30)
    def create_user(self, payload: dict) -> dict:
        resp = httpx.post(f"{self.base_url}/api/internal/users", json=payload, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
