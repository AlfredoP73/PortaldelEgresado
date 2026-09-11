#!/bin/bash
set -e

DOCKER_USER=${1:-"alfredojose"}

echo -e "\e[36m=============================================\e[0m"
echo -e "\e[36m Construyendo y Subiendo Imágenes a Docker Hub \e[0m"
echo -e "\e[36m Usuario de Docker Hub: $DOCKER_USER\e[0m"
echo -e "\e[36m=============================================\e[0m"
echo ""

build_and_push() {
    local IMAGE_NAME=$1
    local CONTEXT=$2
    local DOCKERFILE=$3

    local FULL_NAME="${DOCKER_USER}/${IMAGE_NAME}:latest"
    
    echo -e "\e[33m-> Procesando: $FULL_NAME\e[0m"
    echo -e "\e[90m   [1/2] Construyendo...\e[0m"
    
    if [ -n "$DOCKERFILE" ]; then
        docker build -t "$FULL_NAME" -f "$DOCKERFILE" "$CONTEXT"
    else
        docker build -t "$FULL_NAME" "$CONTEXT"
    fi

    echo -e "\e[90m   [2/2] Subiendo a Docker Hub...\e[0m"
    docker push "$FULL_NAME"
    
    echo -e "\e[32m   OK: $FULL_NAME subido exitosamente.\e[0m"
    echo ""
}

# 1. Microservicios del Backend
build_and_push "portal_auth" "./backend" "./backend/app/auth/Dockerfile"
build_and_push "portal_companies" "./backend" "./backend/app/companies/Dockerfile"
build_and_push "portal_graduates" "./backend" "./backend/app/graduates/Dockerfile"
build_and_push "portal_matchmaking" "./backend" "./backend/app/matchmaking/Dockerfile"
build_and_push "portal_dashboard" "./backend" "./backend/app/dashboard/Dockerfile"

# 2. API Gateway (Nginx)
build_and_push "portal_api_gateway" "./nginx" "./nginx/Dockerfile"

# 3. Frontend (React)
build_and_push "portal_frontend" "./frontend" "./frontend/Dockerfile"

echo -e "\e[36m=============================================\e[0m"
echo -e "\e[32m ¡Todas las imágenes se subieron con éxito!  \e[0m"
echo -e "\e[36m=============================================\e[0m"
