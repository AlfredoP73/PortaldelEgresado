$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Despliegue Multi-AZ (3 Instancias + 2 ALBs) " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=======================================================" -ForegroundColor Cyan

# Credenciales: se cargan desde aws/credentials.ps1 (ignorado por git).
if (Test-Path "$PSScriptRoot\credentials.ps1") { . "$PSScriptRoot\credentials.ps1" }

$AZ_A = "us-east-1a"
$AZ_B = "us-east-1b"

$oldErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$IdentityJson = aws sts get-caller-identity --output json 2>$null
$Ec2Test = aws ec2 describe-vpcs --max-items 1 2>&1
$ErrorActionPreference = $oldErr

if ($LASTEXITCODE -ne 0 -or $Ec2Test -match "voc-cancel-cred" -or $Ec2Test -match "UnauthorizedOperation") { 
    Write-Host "`n=======================================================" -ForegroundColor Red
    Write-Host "[ERROR] Tu sesión de AWS Learner Lab ha expirado o está detenida." -ForegroundColor Red
    Write-Host "=======================================================" -ForegroundColor Red
    Write-Host "Causa: Las credenciales caducaron o se aplicó la política 'voc-cancel-cred'." -ForegroundColor DarkYellow
    Write-Host "`nPasos para continuar:" -ForegroundColor Yellow
    Write-Host "1. Ve a tu plataforma de AWS Academy / Learner Lab." -ForegroundColor White
    Write-Host "2. Haz clic en 'Start Lab' y espera a que el círculo se ponga verde." -ForegroundColor White
    Write-Host "3. Haz clic en 'AWS Details' -> 'AWS CLI' y copia las credenciales nuevas." -ForegroundColor White
    Write-Host "4. Pégalas en el archivo aws/credentials.ps1 y vuelve a ejecutar este script." -ForegroundColor White
    exit 1 
}

$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
Write-Host "AWS Account ID: $AccountId" -ForegroundColor Cyan

Write-Host "`n[Fase 1: Red Multi-AZ] Creando VPC y 6 Subredes..." -ForegroundColor Yellow
$VpcId = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=portal_vpc}]" --query "Vpc.VpcId" --output text 2>$null

aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-support | Out-Null
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-hostnames | Out-Null

# AZ A Subnets
$SubPubA = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.1.0/24 --availability-zone $AZ_A --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_front_a}]" --query "Subnet.SubnetId" --output text
$SubAppA = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.3.0/24 --availability-zone $AZ_A --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_back_a}]" --query "Subnet.SubnetId" --output text
$SubDbA  = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.5.0/24 --availability-zone $AZ_A --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_data_a}]" --query "Subnet.SubnetId" --output text

# AZ B Subnets
$SubPubB = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.2.0/24 --availability-zone $AZ_B --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_front_b}]" --query "Subnet.SubnetId" --output text
$SubAppB = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.4.0/24 --availability-zone $AZ_B --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_back_b}]" --query "Subnet.SubnetId" --output text
$SubDbB  = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.6.0/24 --availability-zone $AZ_B --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_data_b}]" --query "Subnet.SubnetId" --output text

aws ec2 modify-subnet-attribute --subnet-id $SubPubA --map-public-ip-on-launch | Out-Null
aws ec2 modify-subnet-attribute --subnet-id $SubPubB --map-public-ip-on-launch | Out-Null

$IgwId = aws ec2 create-internet-gateway --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=portal_igw}]" --query "InternetGateway.InternetGatewayId" --output text
aws ec2 attach-internet-gateway --vpc-id $VpcId --internet-gateway-id $IgwId | Out-Null

$RtPub = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=portal_rt_pub}]" --query "RouteTable.RouteTableId" --output text
aws ec2 create-route --route-table-id $RtPub --destination-cidr-block 0.0.0.0/0 --gateway-id $IgwId | Out-Null
aws ec2 associate-route-table --subnet-id $SubPubA --route-table-id $RtPub | Out-Null
aws ec2 associate-route-table --subnet-id $SubPubB --route-table-id $RtPub | Out-Null

Write-Host "Creando 2 NAT Gateways (Uno por AZ para salida segura a internet)..." -ForegroundColor Yellow
$NatEipAllocA = aws ec2 allocate-address --domain vpc --query "AllocationId" --output text
$NatEipAllocB = aws ec2 allocate-address --domain vpc --query "AllocationId" --output text

$NatGwIdA = aws ec2 create-nat-gateway --subnet-id $SubPubA --allocation-id $NatEipAllocA --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=portal_nat_gw_a}]" --query "NatGateway.NatGatewayId" --output text
$NatGwIdB = aws ec2 create-nat-gateway --subnet-id $SubPubB --allocation-id $NatEipAllocB --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=portal_nat_gw_b}]" --query "NatGateway.NatGatewayId" --output text

aws ec2 wait nat-gateway-available --nat-gateway-ids $NatGwIdA $NatGwIdB

$RtPrivA = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=portal_rt_priv_a}]" --query "RouteTable.RouteTableId" --output text
aws ec2 create-route --route-table-id $RtPrivA --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NatGwIdA | Out-Null
aws ec2 associate-route-table --subnet-id $SubAppA --route-table-id $RtPrivA | Out-Null
aws ec2 associate-route-table --subnet-id $SubDbA --route-table-id $RtPrivA | Out-Null

$RtPrivB = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=portal_rt_priv_b}]" --query "RouteTable.RouteTableId" --output text
aws ec2 create-route --route-table-id $RtPrivB --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NatGwIdB | Out-Null
aws ec2 associate-route-table --subnet-id $SubAppB --route-table-id $RtPrivB | Out-Null
aws ec2 associate-route-table --subnet-id $SubDbB --route-table-id $RtPrivB | Out-Null

Write-Host "`n[Fase 2: Security Groups (Seguridad en 3 Capas)]" -ForegroundColor Yellow
$SgAlbExt = aws ec2 create-security-group --group-name "sg_alb_ext" --description "ALB Externo Publico" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgAlbExt --tags Key=Name,Value=sg_alb_ext | Out-Null

$SgFront  = aws ec2 create-security-group --group-name "sg_front" --description "Frontend EC2 ASG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgFront --tags Key=Name,Value=sg_front | Out-Null

$SgAlbInt = aws ec2 create-security-group --group-name "sg_alb_int" --description "ALB Interno Privado" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgAlbInt --tags Key=Name,Value=sg_alb_int | Out-Null

$SgBack   = aws ec2 create-security-group --group-name "sg_back" --description "Backend EC2 ASG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgBack --tags Key=Name,Value=sg_back | Out-Null

$SgData   = aws ec2 create-security-group --group-name "sg_data" --description "Data EC2" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgData --tags Key=Name,Value=sg_data | Out-Null

# Reglas de Ingress
aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null

aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 80 --source-group $SgAlbExt | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbInt --protocol tcp --port 80 --source-group $SgFront | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgBack --protocol tcp --port 80 --source-group $SgAlbInt | Out-Null

# Acceso de Back hacia Data (Postgres, RabbitMQ, Loki)
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5432 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5672 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 3100 --source-group $SgBack | Out-Null

$AmiId = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query "Parameters[0].Value" --output text
$KeyName = "portal_egresado_key"
$IamProfile = "LabInstanceProfile"

# Script base para aprovisionar Docker y clonar la app
$DockerBase = @"
yum update -y
yum install -y git docker
systemctl enable docker
systemctl start docker
usermod -a -G docker ec2-user
mkdir -p /usr/local/lib/docker/cli-plugins
curl -L "https://github.com/docker/buildx/releases/download/v0.17.1/buildx-v0.17.1.linux-amd64" -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
cd /home/ec2-user
git clone https://github.com/AlfredoP73/PortaldelEgresado.git app || git clone https://github.com/AlfredoP73/PortalcelEgresado.git app
chown -R ec2-user:ec2-user app
cd app
"@

Write-Host "`n[S3] Creando buckets para almacenamiento de archivos (CVs, Avatares, Entregables)..." -ForegroundColor Yellow
Write-Host "  -> NOTA: En esta Arquitectura 1 (IaaS Tradicional), el FRONTEND se ejecuta 100% en EC2" -ForegroundColor Cyan
Write-Host "     dentro de un contenedor Nginx con React. S3 solo guarda adjuntos de usuarios." -ForegroundColor Cyan
$BucketCvs      = "portal-cvs-$AccountId"
$BucketAvatars  = "portal-avatars-$AccountId"
$BucketDeliver  = "portal-deliverables-$AccountId"
foreach ($bucket in @($BucketCvs, $BucketAvatars, $BucketDeliver)) {
    aws s3 mb "s3://$bucket" --region us-east-1 2>$null
}

Write-Host "`n[Fase 3: Capa Data - Instancia EC2 1/3 (portal_data)]" -ForegroundColor Yellow
$DataUserData = @"
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
$DockerBase
cat <<'EOF' > .env.data
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PasswordSegura123
POSTGRES_DB=postgres
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
EOF
/usr/local/bin/docker-compose -f docker-compose.data.yml --env-file .env.data up -d --build
"@
$DataUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($DataUserData))

$DataId = aws ec2 run-instances `
  --image-id $AmiId `
  --instance-type t3.small `
  --key-name $KeyName `
  --security-group-ids $SgData `
  --subnet-id $SubDbA `
  --iam-instance-profile "Name=$IamProfile" `
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}" `
  --user-data $DataUdEnc `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_data}]" `
  --query "Instances[0].InstanceId" `
  --output text

Write-Host "Instancia Data lanzada ($DataId). Esperando estado running..." -ForegroundColor Cyan
aws ec2 wait instance-running --instance-ids $DataId
$DataIp = (aws ec2 describe-instances --instance-ids $DataId --query "Reservations[0].Instances[0].PrivateIpAddress" --output text).Trim()
Write-Host "Instancia portal_data en ejecucion (IP privada: $DataIp)" -ForegroundColor Green

Write-Host "`n[Fase 4: Balanceadores de Carga (2 ALBs: Externo e Interno)]" -ForegroundColor Yellow

Write-Host "1. Creando ALB Externo Publico (alb-portal-ext) para la Capa Frontend..." -ForegroundColor Cyan
$TgFrontArn = aws elbv2 create-target-group `
  --name tg-portal-front `
  --protocol HTTP `
  --port 80 `
  --vpc-id $VpcId `
  --target-type instance `
  --health-check-protocol HTTP `
  --health-check-path / `
  --health-check-interval-seconds 15 `
  --health-check-timeout-seconds 5 `
  --healthy-threshold-count 2 `
  --unhealthy-threshold-count 3 `
  --query "TargetGroups[0].TargetGroupArn" `
  --output text

$AlbExtArn = aws elbv2 create-load-balancer `
  --name alb-portal-ext `
  --subnets $SubPubA $SubPubB `
  --security-groups $SgAlbExt `
  --scheme internet-facing `
  --query "LoadBalancers[0].LoadBalancerArn" `
  --output text

aws elbv2 create-listener --load-balancer-arn $AlbExtArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgFrontArn | Out-Null
$AlbExtDns = (aws elbv2 describe-load-balancers --load-balancer-arns $AlbExtArn --query "LoadBalancers[0].DNSName" --output text).Trim()
Write-Host "ALB Externo Publico DNS: $AlbExtDns" -ForegroundColor Green

Write-Host "2. Creando ALB Interno Privado (alb-portal-int) para la Capa Backend..." -ForegroundColor Cyan
$TgBackArn = aws elbv2 create-target-group `
  --name tg-portal-back `
  --protocol HTTP `
  --port 80 `
  --vpc-id $VpcId `
  --target-type instance `
  --health-check-protocol HTTP `
  --health-check-path / `
  --health-check-interval-seconds 15 `
  --health-check-timeout-seconds 5 `
  --healthy-threshold-count 2 `
  --unhealthy-threshold-count 3 `
  --query "TargetGroups[0].TargetGroupArn" `
  --output text

$AlbIntArn = aws elbv2 create-load-balancer `
  --name alb-portal-int `
  --subnets $SubAppA $SubAppB `
  --security-groups $SgAlbInt `
  --scheme internal `
  --query "LoadBalancers[0].LoadBalancerArn" `
  --output text

aws elbv2 create-listener --load-balancer-arn $AlbIntArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgBackArn | Out-Null
$AlbIntDns = (aws elbv2 describe-load-balancers --load-balancer-arns $AlbIntArn --query "LoadBalancers[0].DNSName" --output text).Trim()
Write-Host "ALB Interno Privado DNS: $AlbIntDns" -ForegroundColor Green

Write-Host "`n[Fase 5: Capa Back - Instancia EC2 2/3 (portal_back en ASG)]" -ForegroundColor Yellow
$BackUserData = @"
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
$DockerBase
cat <<'EOF' > .env.back
DATA_HOST=$DataIp
DB_USER=postgres
DB_PASSWORD=PasswordSegura123
MINIO_BUCKET_NAME=$BucketCvs
S3_BUCKET_AVATARS=$BucketAvatars
S3_BUCKET_DELIVERABLES=$BucketDeliver
AWS_DEFAULT_REGION=us-east-1
SECRET_KEY=clave_secreta_super_segura_de_32_caracteres_minimo
MATCHMAKING_INTERNAL_TOKEN=token_interno_servicios_seguro
RABBITMQ_URL=amqp://guest:guest@${DataIp}:5672/
FRONTEND_URL=http://$AlbExtDns
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=portal.egresados.upc@gmail.com
SMTP_PASS=vmxlkvqzcpycsxlk
SMTP_FROM_EMAIL=portal.egresados.upc@gmail.com
EOF
/usr/local/bin/docker-compose -f docker-compose.back.yml --env-file .env.back up -d --build
"@
$BackUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($BackUserData))

$LtBackJson = @"
{
    "ImageId": "$AmiId",
    "InstanceType": "t3.small",
    "KeyName": "$KeyName",
    "SecurityGroupIds": ["$SgBack"],
    "IamInstanceProfile": {"Name": "$IamProfile"},
    "UserData": "$BackUdEnc",
    "BlockDeviceMappings": [{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]
}
"@
$LtBackFile = "$PSScriptRoot\lt_back.json"
$LtBackJson | Out-File $LtBackFile -Encoding ascii
aws ec2 create-launch-template --launch-template-name lt-portal-back --version-description "v1" --launch-template-data file://$LtBackFile | Out-Null
Remove-Item $LtBackFile -ErrorAction SilentlyContinue

Write-Host "Creando Auto Scaling Group para Backend (Capacidad Base: 1 instancia)..." -ForegroundColor Cyan
aws autoscaling create-auto-scaling-group `
  --auto-scaling-group-name asg-portal-back `
  --launch-template LaunchTemplateName=lt-portal-back,Version=1 `
  --min-size 1 `
  --max-size 3 `
  --desired-capacity 1 `
  --vpc-zone-identifier "$SubAppA,$SubAppB" `
  --target-group-arns $TgBackArn `
  --health-check-type ELB `
  --health-check-grace-period 300 `
  --tags "ResourceId=asg-portal-back,ResourceType=auto-scaling-group,Key=Name,Value=portal_back,PropagateAtLaunch=true" | Out-Null

# Auto Scaling Policies (Backend)
$PolicyOutArn = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-back --policy-name scale-out-cpu --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment 1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-high-back --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 70 --comparison-operator GreaterThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-back" --evaluation-periods 2 --alarm-actions $PolicyOutArn 2>$null

$PolicyInArn = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-back --policy-name scale-in-cpu --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment -1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-low-back --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 30 --comparison-operator LessThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-back" --evaluation-periods 2 --alarm-actions $PolicyInArn 2>$null

Write-Host "`n[Fase 6: Capa Front - Instancia EC2 3/3 (portal_front en ASG - Nginx + React)]" -ForegroundColor Yellow
Write-Host "  -> El frontend corre 100% en la instancia EC2 con Docker (NO en S3)." -ForegroundColor Cyan
$FrontUserData = @"
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
$DockerBase
cat <<'EOF' > .env.front
BACK_HOST=$AlbIntDns
EOF
/usr/local/bin/docker-compose -f docker-compose.front.yml --env-file .env.front up -d --build
"@
$FrontUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($FrontUserData))

$LtFrontJson = @"
{
    "ImageId": "$AmiId",
    "InstanceType": "t3.small",
    "KeyName": "$KeyName",
    "SecurityGroupIds": ["$SgFront"],
    "IamInstanceProfile": {"Name": "$IamProfile"},
    "UserData": "$FrontUdEnc",
    "BlockDeviceMappings": [{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]
}
"@
$LtFrontFile = "$PSScriptRoot\lt_front.json"
$LtFrontJson | Out-File $LtFrontFile -Encoding ascii
aws ec2 create-launch-template --launch-template-name lt-portal-front --version-description "v1" --launch-template-data file://$LtFrontFile | Out-Null
Remove-Item $LtFrontFile -ErrorAction SilentlyContinue

Write-Host "Creando Auto Scaling Group para Frontend (Capacidad Base: 1 instancia)..." -ForegroundColor Cyan
aws autoscaling create-auto-scaling-group `
  --auto-scaling-group-name asg-portal-front `
  --launch-template LaunchTemplateName=lt-portal-front,Version=1 `
  --min-size 1 `
  --max-size 3 `
  --desired-capacity 1 `
  --vpc-zone-identifier "$SubPubA,$SubPubB" `
  --target-group-arns $TgFrontArn `
  --health-check-type ELB `
  --health-check-grace-period 300 `
  --tags "ResourceId=asg-portal-front,ResourceType=auto-scaling-group,Key=Name,Value=portal_front,PropagateAtLaunch=true" | Out-Null

# Auto Scaling Policies (Frontend)
$PolicyOutFront = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-front --policy-name scale-out-cpu-front --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment 1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-high-front --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 70 --comparison-operator GreaterThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-front" --evaluation-periods 2 --alarm-actions $PolicyOutFront 2>$null

$PolicyInFront = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-front --policy-name scale-in-cpu-front --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment -1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-low-front --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 30 --comparison-operator LessThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-front" --evaluation-periods 2 --alarm-actions $PolicyInFront 2>$null

Write-Host "`nEsperando que el ALB Externo este activo..." -ForegroundColor Yellow
aws elbv2 wait load-balancer-available --load-balancer-arns $AlbExtArn

Write-Host "`n[Verificación] Esperando a que las 3 instancias inicialicen Docker y la aplicacion..." -ForegroundColor Yellow
Write-Host "(Descargando paquetes, compilando React y levantando microservicios. Consultando cada 15s...)" -ForegroundColor DarkGray

$MaxAttempts = 35
$AppReady = $false

for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://$AlbExtDns/api/auth/login" -Method Post -Body "{}" -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) {
            $AppReady = $true
            break
        }
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            if ($code -ge 400 -and $code -lt 500) {
                $AppReady = $true
                break
            }
        }
    }
    Write-Host "  -> Intento $i de $MaxAttempts - Servidores compilandose. Esperando 15s..." -ForegroundColor DarkYellow
    Start-Sleep -Seconds 15
}

if ($AppReady) {
    Write-Host "¡Aplicacion verificada con exito! La arquitectura de 3 capas esta 100% activa." -ForegroundColor Green
} else {
    Write-Host "[AVISO] Los balanceadores estan listos. Los contenedores pueden demorar 1-2 minutos mas en compilarse por completo." -ForegroundColor DarkYellow
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " ¡Despliegue Arquitectura 1 (3 Instancias + 2 ALBs) Finalizado! " -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Topologia de 3 Capas Desplegada (IaaS Clasica en EC2):" -ForegroundColor Yellow
Write-Host "  1. Capa Front : 1 Instancia EC2 'portal_front' (Nginx + React SPA en ASG)" -ForegroundColor White
Write-Host "                  Detras de alb-portal-ext. (Frontend corre 100% en EC2, NO en S3)" -ForegroundColor DarkGray
Write-Host "  2. Capa Back  : 1 Instancia EC2 'portal_back' (Nginx Gateway + 5 Microservicios en ASG)" -ForegroundColor White
Write-Host "                  Detras de alb-portal-int." -ForegroundColor DarkGray
Write-Host "  3. Capa Data  : 1 Instancia EC2 'portal_data' (PostgreSQL 15 + RabbitMQ + Loki)" -ForegroundColor White
Write-Host "                  En subred privada de datos." -ForegroundColor DarkGray
Write-Host "  - Balanceo    : 2 ALBs (alb-portal-ext publico + alb-portal-int interno)" -ForegroundColor White
Write-Host "  - Storage S3  : Unicamente buckets para archivos de usuarios (CVs, Avatares, Entregables)" -ForegroundColor White
Write-Host "`nYa puedes ingresar inmediatamente a tu aplicacion en:" -ForegroundColor Yellow
Write-Host "http://$AlbExtDns" -ForegroundColor Cyan
Write-Host "ALB Interno DNS: http://$AlbIntDns" -ForegroundColor DarkGray
