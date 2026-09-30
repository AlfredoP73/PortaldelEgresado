$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Destrucción 3-Tier en AWS Learner Lab " -ForegroundColor Cyan -BackgroundColor DarkRed
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Configurar y Validar Autenticación
# Las credenciales deben estar ya configuradas en tu terminal (pegándolas desde Learner Lab)
$env:AWS_DEFAULT_REGION = "us-east-1"

$IdentityJson = aws sts get-caller-identity --output json 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Credenciales inválidas." -ForegroundColor Red; exit }

# 2. Obtener VPC
$VpcId = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=portal_vpc" --query "Vpcs[0].VpcId" --output text 2>$null
if ($VpcId -eq "None" -or -not $VpcId) {
    Write-Host "La VPC 'portal_vpc' no se encontró. Saliendo." -ForegroundColor Green
    exit
}

# 3. Terminar instancias en la VPC
Write-Host "`n[Instancias] Buscando y terminando todas las instancias en la VPC..." -ForegroundColor Yellow
$Instances = aws ec2 describe-instances --filters "Name=vpc-id,Values=$VpcId" "Name=instance-state-name,Values=running,pending,stopped,stopping" --query "Reservations[*].Instances[*].InstanceId" --output text 2>$null
if ($Instances -ne "None" -and $Instances -ne "") {
    $InstArray = $Instances -split '\s+'
    Write-Host "Terminando instancias: $Instances" -ForegroundColor Cyan
    aws ec2 terminate-instances --instance-ids $InstArray | Out-Null
    Write-Host "Esperando terminación (puede tardar minutos)..." -ForegroundColor Yellow
    aws ec2 wait instance-terminated --instance-ids $InstArray
}

# 4. Liberar EIPs sueltas
Write-Host "`n[Redes] Liberando IPs Elásticas..." -ForegroundColor Yellow
$UnassociatedIps = aws ec2 describe-addresses --query "Addresses[?AssociationId==null].AllocationId" --output text 2>$null
if ($UnassociatedIps -ne "None" -and $UnassociatedIps -ne "") {
    foreach ($IpAlloc in ($UnassociatedIps -split '\s+')) {
        if ($IpAlloc -ne "") { aws ec2 release-address --allocation-id $IpAlloc 2>$null }
    }
}

# 5. Eliminar Security Groups (Con reintentos por depedencias de red)
Write-Host "`n[Seguridad] Eliminando Security Groups..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$SgIds = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
if ($SgIds -ne "None" -and $SgIds -ne "") {
    # Eliminar reglas dependientes primero
    foreach ($sg in ($SgIds -split '\s+')) {
        if ($sg -ne "") {
            aws ec2 revoke-security-group-ingress --group-id $sg --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissions' --output json)" 2>$null
        }
    }
    # Eliminar grupos
    foreach ($sg in ($SgIds -split '\s+')) {
        if ($sg -ne "") { aws ec2 delete-security-group --group-id $sg 2>$null }
    }
}

# 6. Eliminar Subredes
Write-Host "`n[Redes] Eliminando Subredes..." -ForegroundColor Yellow
$Subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text 2>$null
if ($Subnets -ne "None" -and $Subnets -ne "") {
    foreach ($sub in ($Subnets -split '\s+')) {
        if ($sub -ne "") { aws ec2 delete-subnet --subnet-id $sub 2>$null }
    }
}

# 7. IGW y Tablas de Enrutamiento
Write-Host "`n[Redes] Desasociando Tablas de Enrutamiento e Internet Gateway..." -ForegroundColor Yellow
$IgwIds = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VpcId" --query "InternetGateways[*].InternetGatewayId" --output text 2>$null
if ($IgwIds -ne "None" -and $IgwIds -ne "") {
    foreach ($igw in ($IgwIds -split '\s+')) {
        if ($igw -ne "") {
            aws ec2 detach-internet-gateway --vpc-id $VpcId --internet-gateway-id $igw 2>$null
            aws ec2 delete-internet-gateway --internet-gateway-id $igw 2>$null
        }
    }
}

$RtIds = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VpcId" --query "RouteTables[?Associations[0].Main!=`true`].RouteTableId" --output text 2>$null
if ($RtIds -ne "None" -and $RtIds -ne "") {
    foreach ($rt in ($RtIds -split '\s+')) {
        if ($rt -ne "") { aws ec2 delete-route-table --route-table-id $rt 2>$null }
    }
}

# 8. Eliminar VPC
Write-Host "`n[Redes] Eliminando VPC..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
aws ec2 delete-vpc --vpc-id $VpcId 2>$null

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "¡Destrucción 3-Tier Completada!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
