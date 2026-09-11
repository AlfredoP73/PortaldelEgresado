#!/bin/bash
set -e

# ==============================================================================
# Script de inicialización para AWS EC2 (User Data o ejecución manual)
# Diseñado para Amazon Linux 2023
# ==============================================================================

echo "Iniciando configuración del entorno de ejecución (Fase 6)..."

# 1. Actualizar e instalar dependencias básicas y Docker
sudo dnf update -y
sudo dnf install -y docker git unzip

# Habilitar y arrancar Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Instalar Docker Compose (binario independiente)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Docker Buildx (Requerido por Docker Compose v2 para hacer builds)
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -L "https://github.com/docker/buildx/releases/download/v0.17.1/buildx-v0.17.1.linux-amd64" -o /usr/libexec/docker/cli-plugins/docker-buildx
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-buildx

# 2. Replicar el entorno de ejecución
echo "Clonando repositorio de la aplicación..."
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Variables del repositorio (ajustar si es privado)
GITHUB_USER="AlfredoP73"
GITHUB_REPO="PortaldelEgresado"
BRANCH="main"

# Descargar código (si es público se puede usar clone directo, sino curl del archivo crudo)
git clone https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git . || echo "El directorio ya existe"
git checkout $BRANCH

# Ajustar variables de entorno si es necesario
# Por defecto se asume que las variables requeridas están en docker-compose.yml o en un .env que deberás subir.
if [ -f "aws/.env.example" ]; then
    cp aws/.env.example .env
fi

# 3. Lanzar la aplicación usando el docker-compose de la raíz que orquesta todo
echo "Iniciando contenedores (Lift & Shift)..."

# Obtener IP pública dinámica de AWS (usando IMDSv2 para Amazon Linux 2023) e inyectarla
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -s)
PUBLIC_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/public-ipv4)
sed -i "s|PUBLIC_IP_PLACEHOLDER|$PUBLIC_IP|g" docker-compose.yml

sudo docker-compose pull
sudo docker-compose up -d

echo "¡Despliegue inicial finalizado exitosamente! $(date)" >> /var/log/startup.log
