param (
    [string]$DockerUser = "alfredojose",
    [switch]$SkipBuild = $false
)

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY COMPLETO: Build -> Push -> Terraform Apply      " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# ── FASE 1: Build & Push ──────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "FASE 1: Construyendo y subiendo imágenes a Docker Hub..." -ForegroundColor Yellow
    Write-Host ""
    
    & ".\build_and_push.ps1" -DockerUser $DockerUser
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Falló el Build & Push. Abortando despliegue." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "FASE 1: (Omitida - se usarán las imágenes ya subidas)" -ForegroundColor Gray
    Write-Host ""
}

# ── FASE 2: Terraform Apply ───────────────────────────────────────
Write-Host "FASE 2: Desplegando infraestructura en AWS con Terraform..." -ForegroundColor Yellow
Write-Host ""

Push-Location "aws\terraform"

# Inicializar Terraform (seguro ejecutarlo múltiples veces)
Write-Host "-> Inicializando Terraform..." -ForegroundColor Gray
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló terraform init." -ForegroundColor Red
    Pop-Location
    exit 1
}

# Aplicar los cambios con auto-approve para no pedir confirmación manual
Write-Host ""
Write-Host "-> Aplicando infraestructura (terraform apply)..." -ForegroundColor Gray
terraform apply -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló terraform apply." -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# ── RESULTADO ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "   ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!                   " -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "La URL del Balanceador de Carga aparece arriba como:" -ForegroundColor White
Write-Host "  alb_dns_name = <tu-url>.elb.amazonaws.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Cuando termines de usar el proyecto, ejecuta:" -ForegroundColor Yellow
Write-Host "  cd aws\terraform && terraform destroy" -ForegroundColor Red
Write-Host ""
