param (
    [string]$DockerUser = "alfredojose"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Construyendo y Subiendo Imágenes a Docker Hub " -ForegroundColor Cyan
Write-Host " Usuario de Docker Hub: $DockerUser" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Función auxiliar para construir y subir
function Build-And-Push {
    param (
        [string]$ImageName,
        [string]$Context,
        [string]$Dockerfile
    )

    $FullName = "${DockerUser}/${ImageName}:latest"
    Write-Host "-> Procesando: $FullName" -ForegroundColor Yellow
    
    Write-Host "   [1/2] Construyendo..." -ForegroundColor Gray
    if ($Dockerfile) {
        docker build -t $FullName -f $Dockerfile $Context
    } else {
        docker build -t $FullName $Context
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Falló la construcción de $FullName" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "   [2/2] Subiendo a Docker Hub..." -ForegroundColor Gray
    docker push $FullName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Falló la subida de $FullName" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "   OK: $FullName subido exitosamente." -ForegroundColor Green
    Write-Host ""
}

# 1. Microservicios del Backend
Build-And-Push -ImageName "portal_auth" -Context "./backend" -Dockerfile "./backend/app/auth/Dockerfile"
Build-And-Push -ImageName "portal_companies" -Context "./backend" -Dockerfile "./backend/app/companies/Dockerfile"
Build-And-Push -ImageName "portal_graduates" -Context "./backend" -Dockerfile "./backend/app/graduates/Dockerfile"
Build-And-Push -ImageName "portal_matchmaking" -Context "./backend" -Dockerfile "./backend/app/matchmaking/Dockerfile"
Build-And-Push -ImageName "portal_dashboard" -Context "./backend" -Dockerfile "./backend/app/dashboard/Dockerfile"

# 2. API Gateway (Nginx)
Build-And-Push -ImageName "portal_api_gateway" -Context "./nginx" -Dockerfile "./nginx/Dockerfile"

# 3. Frontend (React)
Build-And-Push -ImageName "portal_frontend" -Context "./frontend" -Dockerfile "./frontend/Dockerfile"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " ¡Todas las imágenes se subieron con éxito!  " -ForegroundColor Green
Write-Host " Ahora puedes ejecutar Terraform (terraform apply) o" -ForegroundColor Green
Write-Host " reiniciar tus instancias para que descarguen los cambios." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
