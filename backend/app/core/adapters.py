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
        import boto3
        from botocore.exceptions import ClientError
        s3_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        try:
            self.s3_client.head_bucket(Bucket=bucket)
        except ClientError:
            try:
                # us-east-1 no acepta LocationConstraint, las demás regiones sí
                if s3_region == "us-east-1":
                    self.s3_client.create_bucket(Bucket=bucket)
                else:
                    self.s3_client.create_bucket(
                        Bucket=bucket,
                        CreateBucketConfiguration={"LocationConstraint": s3_region}
                    )
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


class SQSMatchmakingAdapter(MatchmakingPort):
    """Adaptador Serverless para publicar recálculos de afinidad en Amazon SQS."""
    def __init__(self, queue_url: Optional[str] = None):
        self.queue_url = queue_url or os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()
        self.region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"

    def trigger_recalculate(self, graduate_id: Optional[int] = None, job_offer_id: Optional[int] = None) -> bool:
        if not self.queue_url:
            return False
        payload = {}
        if graduate_id is not None:
            payload["graduate_id"] = graduate_id
        if job_offer_id is not None:
            payload["job_offer_id"] = job_offer_id
        if not payload:
            return False

        try:
            import boto3
            sqs = boto3.client("sqs", region_name=self.region)
            sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(payload),
            )
            return True
        except Exception as e:
            print(f"Error publishing to Amazon SQS: {e}")
            return False


class RabbitMQMatchmakingAdapter(MatchmakingPort):
    def __init__(self):
        self.rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
        self.sqs_queue_url = os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()

    @circuit(failure_threshold=5, recovery_timeout=60)
    def trigger_recalculate(self, graduate_id: Optional[int] = None, job_offer_id: Optional[int] = None) -> bool:
        # En arquitectura Serverless AWS (SQS configurado), usar Amazon SQS automáticamente
        if self.sqs_queue_url:
            return SQSMatchmakingAdapter(self.sqs_queue_url).trigger_recalculate(
                graduate_id=graduate_id,
                job_offer_id=job_offer_id,
            )

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


def get_matchmaking_adapter() -> MatchmakingPort:
    sqs_url = os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()
    if sqs_url:
        return SQSMatchmakingAdapter(sqs_url)
    return RabbitMQMatchmakingAdapter()


INTER_SERVICE_TIMEOUT = float(os.getenv("INTER_SERVICE_TIMEOUT", "15.0"))

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

    @abstractmethod
    def get_all_saved_searches(self) -> list: pass

    @abstractmethod
    def upsert_pending_graduate(self, payload: dict) -> dict: pass

class HttpGraduatesAdapter(GraduatesServicePort):
    def __init__(self):
        self.base_url = os.getenv("GRADUATES_URL", "http://graduates:8000")

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_graduates(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/graduates", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_graduate(self, graduate_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/graduates/{graduate_id}", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_graduate(self, graduate_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/graduates/{graduate_id}", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_graduate_ids(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/graduates", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_saved_searches(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/saved-searches", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    def upsert_pending_graduate(self, payload: dict) -> dict:
        resp = httpx.post(
            f"{self.base_url}/api/internal/graduates/register-pending",
            json=payload,
            timeout=INTER_SERVICE_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()

class CompaniesServicePort(ABC):
    @abstractmethod
    def get_all_companies(self) -> list: pass

    @abstractmethod
    def get_companies_directory(self) -> list: pass

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

class ExternalJobBoardPort(ABC):
    """Puerto Hexagonal para conectar bolsas de empleo externas (ej. Bolsa de Empleo UPC)."""
    @abstractmethod
    def is_enabled(self) -> bool: pass

    @abstractmethod
    def fetch_jobs(self, params: dict) -> list: pass

    @abstractmethod
    def forward_application(self, payload: dict) -> Optional[dict]: pass

    @abstractmethod
    def fetch_graduate_applications(self, graduate_id: int) -> list: pass


class UpcJobBoardAdapter(ExternalJobBoardPort):
    """
    Adaptador para la Bolsa de Empleo institucional de la Universidad Popular del Cesar (UPC).
    Se activa configurando UPC_JOB_BOARD_URL (y opcionalmente UPC_JOB_BOARD_API_KEY).
    Permite federar ofertas de empresas externas, postular egresados y sincronizar el avance
    por todas las etapas del proceso (POSTULADO -> EN_EVALUACION -> ENTREVISTADO -> CONTRATADO/RECHAZADO).
    """
    def __init__(self):
        self.base_url = os.getenv("UPC_JOB_BOARD_URL", "").strip().rstrip("/")
        self.api_key = os.getenv("UPC_JOB_BOARD_API_KEY", "").strip()

    def is_enabled(self) -> bool:
        return bool(self.base_url)

    def _headers(self) -> dict:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    @circuit(failure_threshold=3, recovery_timeout=30)
    def fetch_jobs(self, params: dict) -> list:
        if not self.is_enabled():
            return []
        resp = httpx.get(f"{self.base_url}/jobs", params=params, headers=self._headers(), timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        normalized = []
        for item in items if isinstance(items, list) else []:
            item.setdefault("source", "BOLSA_EMPLEO_UPC")
            normalized.append(item)
        return normalized

    @circuit(failure_threshold=3, recovery_timeout=30)
    def forward_application(self, payload: dict) -> Optional[dict]:
        if not self.is_enabled():
            return None
        resp = httpx.post(f"{self.base_url}/applications", json=payload, headers=self._headers(), timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def fetch_graduate_applications(self, graduate_id: int) -> list:
        if not self.is_enabled():
            return []
        resp = httpx.get(
            f"{self.base_url}/applications/graduate/{graduate_id}",
            headers=self._headers(),
            timeout=INTER_SERVICE_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []


class HttpCompaniesAdapter(CompaniesServicePort):
    def __init__(self):
        self.base_url = os.getenv("COMPANIES_URL", "http://companies:8000")
        self.upc_job_board = UpcJobBoardAdapter()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_companies(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/companies", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_companies_directory(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/companies-directory", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_all_applications(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/applications", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_job_applications(self, job_offer_id: int) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/applications/job/{job_offer_id}", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
        
    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_jobs(self, params: dict) -> list | dict:
        resp = httpx.get(f"{self.base_url}/api/internal/jobs", params=params, timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        local_data = resp.json()

        if self.upc_job_board.is_enabled():
            try:
                ext_jobs = self.upc_job_board.fetch_jobs(params)
                if ext_jobs:
                    if isinstance(local_data, list):
                        existing_ids = {j.get("id") for j in local_data}
                        for ej in ext_jobs:
                            if ej.get("id") not in existing_ids:
                                local_data.append(ej)
                    elif isinstance(local_data, dict) and "items" in local_data:
                        existing_ids = {j.get("id") for j in local_data["items"]}
                        for ej in ext_jobs:
                            if ej.get("id") not in existing_ids:
                                local_data["items"].append(ej)
                                local_data["total"] = local_data.get("total", 0) + 1
            except Exception as e:
                print(f"Warning: No se pudieron obtener ofertas del microservicio Bolsa de Empleo UPC: {e}")

        return local_data

    @circuit(failure_threshold=3, recovery_timeout=30)
    def apply_for_job(self, payload: dict) -> dict:
        resp = httpx.post(f"{self.base_url}/api/internal/applications/apply", json=payload, timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        app_result = resp.json()

        if self.upc_job_board.is_enabled():
            try:
                self.upc_job_board.forward_application({
                    **payload,
                    "portal_application_id": app_result.get("id"),
                })
            except Exception as e:
                print(f"Warning: No se pudo reenviar postulación a Bolsa de Empleo UPC: {e}")

        return app_result

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_my_applications(self, graduate_id: int) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/applications/graduate/{graduate_id}", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        local_apps = resp.json()

        if self.upc_job_board.is_enabled():
            try:
                ext_apps = self.upc_job_board.fetch_graduate_applications(graduate_id)
                if ext_apps:
                    local_ids = {a.get("id") for a in local_apps}
                    for ea in ext_apps:
                        if ea.get("id") not in local_ids:
                            local_apps.append(ea)
            except Exception as e:
                print(f"Warning: No se pudieron consultar postulaciones externas en Bolsa de Empleo UPC: {e}")

        return local_apps

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_programs(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/programs", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_job(self, job_offer_id: int) -> Optional[dict]:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/jobs/{job_offer_id}", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    @circuit(failure_threshold=3, recovery_timeout=30)
    def get_matchmaking_job_ids(self) -> list:
        resp = httpx.get(f"{self.base_url}/api/internal/matchmaking/jobs", timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

class AuthServicePort(ABC):
    @abstractmethod
    def create_user(self, payload: dict) -> dict: pass

    @abstractmethod
    def send_notification(self, user_id: int, title: str, message: str, type: str = "system", payload: dict = None, dedup_key: str = None) -> dict: pass

    @abstractmethod
    def create_conversation(self, context_type: str, participant_ids: list, context_id: int = None) -> dict: pass

    @abstractmethod
    def get_users_map(self) -> dict: pass

    @abstractmethod
    def update_user_verification(self, user_id: int, verification_status: str, verification_notes: str = None, full_name: str = "") -> dict: pass

class HttpAuthAdapter(AuthServicePort):
    def __init__(self):
        self.base_url = os.getenv("AUTH_URL", "http://auth:8000")

    @circuit(failure_threshold=3, recovery_timeout=30)
    def create_user(self, payload: dict) -> dict:
        resp = httpx.post(f"{self.base_url}/api/internal/users", json=payload, timeout=INTER_SERVICE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    def get_users_map(self) -> dict:
        try:
            resp = httpx.get(f"{self.base_url}/api/internal/users/map", timeout=INTER_SERVICE_TIMEOUT)
            if resp.status_code == 404:
                resp = httpx.get(f"{self.base_url}/api/auth/internal/users/map", timeout=INTER_SERVICE_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Safe fallback in get_users_map: {e}")
            return {}

    def update_user_verification(
        self,
        user_id: int,
        verification_status: str,
        verification_notes: str = None,
        full_name: str = "",
    ) -> dict:
        body = {
            "verification_status": verification_status,
            "verification_notes": verification_notes,
            "full_name": full_name,
        }
        try:
            resp = httpx.put(
                f"{self.base_url}/api/internal/users/{user_id}/verification",
                json=body,
                timeout=INTER_SERVICE_TIMEOUT,
            )
            if resp.status_code == 404:
                resp = httpx.put(
                    f"{self.base_url}/api/auth/internal/users/{user_id}/verification",
                    json=body,
                    timeout=INTER_SERVICE_TIMEOUT,
                )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Safe fallback in update_user_verification: {e}")
            return {"status": "error", "detail": str(e)}

    @circuit(failure_threshold=3, recovery_timeout=30)
    def send_notification(self, user_id: int, title: str, message: str, type: str = "system", payload: dict = None, dedup_key: str = None) -> dict:
        body = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "payload": payload,
            "dedup_key": dedup_key
        }
        try:
            resp = httpx.post(f"{self.base_url}/api/auth/internal/notifications", json=body, timeout=INTER_SERVICE_TIMEOUT)
            if resp.status_code == 404:
                resp = httpx.post(f"{self.base_url}/api/internal/notifications", json=body, timeout=INTER_SERVICE_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Safe fallback in send_notification: {e}")
            return {"status": "error", "detail": str(e)}

    @circuit(failure_threshold=3, recovery_timeout=30)
    def create_conversation(self, context_type: str, participant_ids: list, context_id: int = None) -> dict:
        body = {
            "context_type": context_type,
            "context_id": context_id,
            "participant_ids": participant_ids
        }
        try:
            resp = httpx.post(f"{self.base_url}/api/auth/internal/conversations", json=body, timeout=INTER_SERVICE_TIMEOUT)
            if resp.status_code == 404:
                resp = httpx.post(f"{self.base_url}/api/internal/conversations", json=body, timeout=INTER_SERVICE_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Safe fallback in create_conversation: {e}")
            return {"status": "error", "detail": str(e)}
