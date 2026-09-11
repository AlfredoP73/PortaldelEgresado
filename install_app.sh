#!/bin/bash
set -e

# ==============================================================================
# Script de inicialización para AWS EC2 (User Data o ejecución manual)
# Diseñado para ubuntu 22.04 LTS (según Fase 1)
# ==============================================================================

echo "Iniciando configuración del entorno de ejecución (Fase 6)..."

# 1. Actualizar e instalar dependencias básicas y Docker
sudo apt-get update -y
sudo apt-get install -y docker.io curl git unzip
sudo apt-get install -y docker-compose

# Habilitar y arrancar Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# 2. Replicar el entorno de ejecución
echo "Clonando repositorio de la aplicación..."
mkdir -p /home/ubuntu/app
cd /home/ubuntu/app

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
sudo docker-compose pull
sudo docker-compose up -d

echo "¡Despliegue inicial finalizado exitosamente! $(date)" >> /var/log/startup.log
