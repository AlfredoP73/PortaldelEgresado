$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Destrucción Multi-AZ (Alta Disponibilidad)  " -ForegroundColor Cyan -BackgroundColor DarkRed
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Configurar y Validar Autenticación
if (Test-Path "$PSScriptRoot\credentials.ps1") { . "$PSScriptRoot\credentials.ps1" }


$IdentityJson = aws sts get-caller-identity --output json 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Credenciales inválidas." -ForegroundColor Red; exit }

Write-Host "`n[Auto Scaling] Eliminando Auto Scaling Groups..." -ForegroundColor Yellow
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name asg-portal-front --force-delete 2>$null
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name asg-portal-back --force-delete 2>$null
Start-Sleep -Seconds 10

Write-Host "`n[Launch Templates] Eliminando Launch Templates..." -ForegroundColor Yellow
aws ec2 delete-launch-template --launch-template-name lt-portal-front 2>$null
aws ec2 delete-launch-template --launch-template-name lt-portal-back 2>$null

Write-Host "`n[Load Balancers] Eliminando ALBs y Target Groups..." -ForegroundColor Yellow
$Albs = aws elbv2 describe-load-balancers --query "LoadBalancers[*].LoadBalancerArn" --output text 2>$null
$AlbArray = @($Albs -split '\s+' | Where-Object { $_ -match "alb-portal" })
if ($AlbArray.Count -gt 0) {
    foreach ($alb in $AlbArray) {
        Write-Host "Eliminando ALB: $alb" -ForegroundColor Cyan
        aws elbv2 delete-load-balancer --load-balancer-arn $alb 2>$null
    }
    Write-Host "Esperando a que los ALBs desaparezcan de la red (esto puede tomar 3 a 5 minutos)..." -ForegroundColor Yellow
    aws elbv2 wait load-balancers-deleted --load-balancer-arns $AlbArray
}

Write-Host "Eliminando Target Groups (esperando a que los ASGs los suelten)..." -ForegroundColor Cyan
$Tgs = aws elbv2 describe-target-groups --query "TargetGroups[*].TargetGroupArn" --output text 2>$null
foreach ($tg in ($Tgs -split '\s+')) {
    if ($tg -match "tg-portal-front" -or $tg -match "tg-portal-back") {
        $retry = 0
        while ($retry -lt 12) {
            aws elbv2 delete-target-group --target-group-arn $tg 2>$null
            if ($LASTEXITCODE -eq 0) { break }
            Write-Host "Target Group aún en uso, reintentando en 10s..." -ForegroundColor DarkYellow
            Start-Sleep -Seconds 10
            $retry++
        }
    }
}

Write-Host "`n[CloudWatch] Eliminando Alarmas..." -ForegroundColor Yellow
aws cloudwatch delete-alarms --alarm-names alarm-cpu-high-back alarm-cpu-low-back alarm-cpu-high-front alarm-cpu-low-front 2>$null

$Vpcs = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=portal_vpc" --query "Vpcs[*].VpcId" --output text 2>$null
$VpcArray = @($Vpcs -split '\s+' | Where-Object { $_ -match '^vpc-' })

Write-Host "`n[Instancias] Buscando y terminando TODAS las instancias..." -ForegroundColor Yellow
$Instances = aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_front,portal_back,portal_data" "Name=instance-state-name,Values=running,pending,stopped,stopping" --query "Reservations[*].Instances[*].InstanceId" --output text 2>$null
$InstArray = @($Instances -split '\s+' | Where-Object { $_ -match '^i-' })
if ($InstArray.Count -gt 0) {
    aws ec2 terminate-instances --instance-ids $InstArray | Out-Null
    Write-Host "Esperando a que las instancias se terminen..." -ForegroundColor Yellow
    aws ec2 wait instance-terminated --instance-ids $InstArray
}

Write-Host "`n[Redes] Liberando IPs Elásticas..." -ForegroundColor Yellow
$AllIps = aws ec2 describe-addresses --query "Addresses[*].AllocationId" --output text 2>$null
if ($AllIps -ne "None" -and $AllIps -ne "") {
    foreach ($IpAlloc in ($AllIps -split '\s+')) {
        if ($IpAlloc -ne "") { aws ec2 release-address --allocation-id $IpAlloc 2>$null }
    }
}

foreach ($VpcId in $VpcArray) {
    Write-Host "`n=== Limpiando VPC: $VpcId ===" -ForegroundColor DarkYellow

    $NatGws = aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VpcId" "Name=state,Values=available,pending" --query "NatGateways[*].NatGatewayId" --output text 2>$null
    $NatArray = @($NatGws -split '\s+' | Where-Object { $_ -match '^nat-' })
    if ($NatArray.Count -gt 0) {
        foreach ($nat in $NatArray) { aws ec2 delete-nat-gateway --nat-gateway-id $nat 2>$null }
        Write-Host "Esperando a que los NAT Gateways se eliminen..." -ForegroundColor Yellow
        foreach ($nat in $NatArray) { aws ec2 wait nat-gateway-deleted --nat-gateway-ids $nat }
    }

    Write-Host "Esperando 30 segundos extra para asegurar que las ENIs de los ALBs desaparezcan completamente..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    Write-Host "Eliminando Security Groups (múltiples pasadas para resolver dependencias)..." -ForegroundColor Cyan
    $SgIds = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
    if ($SgIds -ne "None" -and $SgIds -ne "") {
        # Hacer 4 pasadas para ir borrando desde el nivel más bajo (Data) hasta el más alto (ALB Ext)
        for ($i = 1; $i -le 4; $i++) {
            foreach ($sg in ($SgIds -split '\s+')) {
                if ($sg -ne "") { aws ec2 delete-security-group --group-id $sg 2>$null }
            }
        }
    }

    $Subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text 2>$null
    if ($Subnets -ne "None" -and $Subnets -ne "") {
        foreach ($sub in ($Subnets -split '\s+')) {
            if ($sub -ne "") { aws ec2 delete-subnet --subnet-id $sub 2>$null }
        }
    }

    $IgwIds = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VpcId" --query "InternetGateways[*].InternetGatewayId" --output text 2>$null
    if ($IgwIds -ne "None" -and $IgwIds -ne "") {
        foreach ($igw in ($IgwIds -split '\s+')) {
            if ($igw -ne "") {
                aws ec2 detach-internet-gateway --vpc-id $VpcId --internet-gateway-id $igw 2>$null
                aws ec2 delete-internet-gateway --internet-gateway-id $igw 2>$null
            }
        }
    }

    $AllRouteTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VpcId" --query "RouteTables[*].RouteTableId" --output text 2>$null
    $MainRouteTable = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VpcId" "Name=association.main,Values=true" --query "RouteTables[0].RouteTableId" --output text 2>$null
    $AllRtArray = @($AllRouteTables -split '\s+' | Where-Object { $_ -match '^rtb-' })
    foreach ($rt in $AllRtArray) {
        if ($rt -ne $MainRouteTable) { aws ec2 delete-route-table --route-table-id $rt 2>$null }
    }

    Write-Host "Eliminando VPC: $VpcId" -ForegroundColor Cyan
    aws ec2 delete-vpc --vpc-id $VpcId 2>$null
}

Write-Host "`n[Almacenamiento] Eliminando Buckets de S3..." -ForegroundColor Yellow
$AccountId = aws sts get-caller-identity --query Account --output text 2>$null
if ($AccountId) {
    foreach ($bucket in @("portal-cvs-$AccountId", "portal-avatars-$AccountId", "portal-deliverables-$AccountId")) {
        aws s3 rb "s3://$bucket" --force 2>$null
    }
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "¡Destrucción Multi-AZ Completada! El entorno está limpio." -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
