import os
import boto3

class MinioClient:
    """
    Cliente de almacenamiento de objetos.
    - En producción (sin MINIO_URL): usa AWS S3 real con el Rol IAM de la instancia.
    - En desarrollo (con MINIO_URL): usa MinIO como S3 compatible.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MinioClient, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.minio_url = os.getenv("MINIO_URL", "")  # Vacío en producción AWS
        s3_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

        if self.minio_url:
            # Modo desarrollo: conectar a MinIO local
            self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
            self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
            self.client = boto3.client(
                "s3",
                endpoint_url=self.minio_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=s3_region,
            )
        else:
            # Modo producción: usar AWS S3 real con Rol IAM (sin credenciales)
            self.client = boto3.client(
                "s3",
                region_name=s3_region,
            )

    @classmethod
    def get_client(cls):
        return cls().client
