#!/bin/bash
set -e

# ============================================================
# Script de arranque: Instancia de BACKEND (Linux/Ubuntu)
# Se ejecuta automáticamente al crear la instancia en AWS.
# ============================================================

# 1. Instalar Docker y utilidades
apt-get update -y
apt-get install -y docker.io docker-compose curl
systemctl start docker
systemctl enable docker

# 2. Crear directorio de trabajo
mkdir -p /app && cd /app

# 3. Escribir las variables de entorno en un archivo .env que
#    docker-compose leerá automáticamente (env_file: .env)
cat > /app/.env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:password@${db_private_ip}:5432/postgres
SECRET_KEY=cambia_esto_en_produccion_usa_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
RABBITMQ_URL=amqp://guest:guest@${db_private_ip}:5672/
MINIO_URL=http://${db_private_ip}:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password
MINIO_BUCKET_NAME=cvs
MATCHMAKING_URL=http://localhost:8000
MATCHMAKING_INTERNAL_TOKEN=token_interno_servicios
DOCKER_USER=${docker_user}
ENVEOF

# 4. Descargar el docker-compose del Backend desde GitHub
curl -fsSL https://raw.githubusercontent.com/${github_user}/${github_repo}/main/aws/docker-compose.backend.yml -o docker-compose.yml

# 5. Levantar todos los microservicios
docker-compose up -d

echo "Backend iniciado correctamente - $(date)" >> /var/log/startup.log
