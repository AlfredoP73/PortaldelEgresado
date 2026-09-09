#!/bin/bash
set -e

# ============================================================
# Script de arranque: Instancia de FRONTEND (Linux/Ubuntu)
# Se ejecuta automáticamente al crear la instancia en AWS.
# ============================================================

# 1. Instalar Docker y utilidades
apt-get update -y
apt-get install -y docker.io docker-compose curl
systemctl start docker
systemctl enable docker

# 2. Crear directorio de trabajo
mkdir -p /app && cd /app

# 3. Escribir variables de entorno del Frontend
#    VITE_*_URL apuntan al DNS del ALB para que el browser
#    del usuario haga peticiones /api/* que el ALB enruta al backend
cat > /app/.env << 'ENVEOF'
VITE_AUTH_URL=http://${alb_dns_name}
VITE_COMPANIES_URL=http://${alb_dns_name}
VITE_GRADUATES_URL=http://${alb_dns_name}
VITE_DASHBOARD_URL=http://${alb_dns_name}
VITE_MATCHMAKING_URL=http://${alb_dns_name}
ENVEOF

# 4. Descargar el docker-compose del Frontend desde GitHub
curl -fsSL https://raw.githubusercontent.com/${github_user}/${github_repo}/main/aws/docker-compose.frontend.yml -o docker-compose.yml

# 5. Levantar el contenedor del Frontend (Nginx + React)
docker-compose up -d

echo "Frontend iniciado correctamente - $(date)" >> /var/log/startup.log
