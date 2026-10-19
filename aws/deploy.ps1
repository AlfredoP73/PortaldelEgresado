$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Despliegue Multi-AZ (2 EC2 ASG + 2 ALBs + RDS Multi-AZ) " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=======================================================" -ForegroundColor Cyan

# Credenciales: se cargan desde aws/credentials.ps1 (ignorado por git).
if (Test-Path "$PSScriptRoot\credentials.ps1") { . "$PSScriptRoot\credentials.ps1" }

$AZ_A = "us-east-1a"
$AZ_B = "us-east-1b"

$IdentityJson = aws sts get-caller-identity --output json 2>$null
$Ec2Test = aws ec2 describe-vpcs --max-items 1 2>&1

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

$SgData   = aws ec2 create-security-group --group-name "sg_rds" --description "Amazon RDS PostgreSQL Multi-AZ" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgData --tags Key=Name,Value=sg_rds | Out-Null

# Reglas de Ingress
aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null

aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 80 --source-group $SgAlbExt | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 80 --cidr 0.0.0.0/0 2>$null | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbInt --protocol tcp --port 80 --source-group $SgFront | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgBack --protocol tcp --port 80 --source-group $SgAlbInt | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgBack --protocol tcp --port 80 --source-group $SgFront 2>$null | Out-Null

# Acceso seguro desde Backend EC2 hacia Amazon RDS PostgreSQL (Puerto 5432)
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5432 --source-group $SgBack | Out-Null

$AmiId = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query "Parameters[0].Value" --output text
$KeyName = "portal_egresado_key"
aws ec2 describe-key-pairs --key-names $KeyName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    aws ec2 create-key-pair --key-name $KeyName --query "KeyMaterial" --output text > "$PSScriptRoot\$KeyName.pem" 2>$null
}
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

Write-Host "`n[S3] Creando o verificando buckets para almacenamiento de archivos (CVs, Avatares, Entregables)..." -ForegroundColor Yellow
Write-Host "  -> NOTA: En esta Arquitectura 1 (IaaS Tradicional), el FRONTEND se ejecuta 100% en EC2" -ForegroundColor Cyan
Write-Host "     dentro de un contenedor Nginx con React. S3 solo guarda adjuntos de usuarios." -ForegroundColor Cyan
$BucketCvs      = "portal-cvs-$AccountId"
$BucketAvatars  = "portal-avatars-$AccountId"
$BucketDeliver  = "portal-deliverables-$AccountId"
foreach ($bucket in @($BucketCvs, $BucketAvatars, $BucketDeliver)) {
    aws s3api head-bucket --bucket $bucket 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  -> Bucket ya existe: $bucket (reutilizando)" -ForegroundColor Green
    } else {
        aws s3 mb "s3://$bucket" --region us-east-1 2>$null | Out-Null
        Write-Host "  -> Bucket creado: $bucket" -ForegroundColor Cyan
    }
}

Write-Host "`n[Fase 3: Capa Data - Amazon RDS PostgreSQL Multi-AZ (Alta Disponibilidad en 2 AZs)]" -ForegroundColor Yellow
$RdsSubnetGroup = "portal-db-subnets"
aws rds describe-db-subnet-groups --db-subnet-group-name $RdsSubnetGroup 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    aws rds create-db-subnet-group `
      --db-subnet-group-name $RdsSubnetGroup `
      --db-subnet-group-description "Subredes privadas Multi-AZ para Amazon RDS PostgreSQL" `
      --subnet-ids $SubDbA $SubDbB 2>$null | Out-Null
    Write-Host "  -> DB Subnet Group creado: $RdsSubnetGroup ($SubDbA, $SubDbB)" -ForegroundColor Cyan
}

Write-Host "Lanzando instancia RDS PostgreSQL 15 Multi-AZ (Primaria en $AZ_A + Standby en $AZ_B)..." -ForegroundColor Cyan
aws rds create-db-instance `
  --db-instance-identifier portal-db-rds `
  --db-instance-class db.t3.micro `
  --engine postgres `
  --engine-version 15 `
  --master-username postgres `
  --master-user-password PasswordSegura123 `
  --allocated-storage 20 `
  --storage-type gp3 `
  --db-subnet-group-name $RdsSubnetGroup `
  --vpc-security-group-ids $SgData `
  --no-publicly-accessible `
  --multi-az `
  --backup-retention-period 0 `
  --tags "Key=Name,Value=portal-db-rds" 2>$null | Out-Null

Write-Host "Instancia RDS 'portal-db-rds' lanzada (creándose en segundo plano mientras se crean los balanceadores ALBs)..." -ForegroundColor Green

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

Write-Host "`n[Fase 5: Capa Back - Instancia EC2 (portal_back en ASG)]" -ForegroundColor Yellow
Write-Host "Esperando a que Amazon RDS portal-db-rds esté en estado 'available'..." -ForegroundColor Cyan
aws rds wait db-instance-available --db-instance-identifier portal-db-rds
$RdsHost = (aws rds describe-db-instances --db-instance-identifier portal-db-rds --query "DBInstances[0].Endpoint.Address" --output text).Trim()
Write-Host "Amazon RDS PostgreSQL Multi-AZ 100% activo (Endpoint: $RdsHost)" -ForegroundColor Green

$BackUserData = @"
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
$DockerBase

# 1. Esperar que RDS acepte conexiones en el puerto 5432
echo "Esperando que RDS PostgreSQL acepte conexiones en $RdsHost:5432..."
until docker run --rm postgres:15-alpine pg_isready -h "$RdsHost" -p 5432 -U postgres; do
    sleep 5
done

# 2. Inicializar bases de datos y esquema con init.sql
echo "Ejecutando script de inicialización init.sql en RDS PostgreSQL..."
docker run --rm -e PGPASSWORD=PasswordSegura123 \
  -v /home/ec2-user/app/backend/init.sql:/init.sql \
  postgres:15-alpine \
  psql -h "$RdsHost" -U postgres -d postgres -f /init.sql

cat <<'EOF' > .env.back
DATA_HOST=$RdsHost
DB_USER=postgres
DB_PASSWORD=PasswordSegura123
MINIO_BUCKET_NAME=$BucketCvs
S3_BUCKET_AVATARS=$BucketAvatars
S3_BUCKET_DELIVERABLES=$BucketDeliver
AWS_DEFAULT_REGION=us-east-1
SECRET_KEY=clave_secreta_super_segura_de_32_caracteres_minimo
MATCHMAKING_INTERNAL_TOKEN=token_interno_servicios_seguro
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
FRONTEND_URL=http://$AlbExtDns
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=portal.egresados.upc@gmail.com
SMTP_PASS=vmxlkvqzcpycsxlk
SMTP_FROM_EMAIL=portal.egresados.upc@gmail.com
EOF

# Garantizar que rabbitmq esté definido en docker-compose.back.yml
if ! grep -q "portaldel_egresado_rabbitmq" docker-compose.back.yml; then
cat <<'EOFRABBIT' >> docker-compose.back.yml

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: portaldel_egresado_rabbitmq
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
EOFRABBIT
fi

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

Write-Host "`nEsperando que el ALB Externo y las instancias EC2 de ASG esten activas..." -ForegroundColor Yellow
aws elbv2 wait load-balancer-available --load-balancer-arns $AlbExtArn
Start-Sleep -Seconds 10

$BackIp = (aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_back" "Name=instance-state-name,Values=pending,running" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text 2>$null).Trim()
$FrontPublicIp = (aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_front" "Name=instance-state-name,Values=pending,running" --query "Reservations[0].Instances[0].PublicIpAddress" --output text 2>$null).Trim()

$BackendPublicEndpoint = if ($FrontPublicIp -and $FrontPublicIp -ne "None") { $FrontPublicIp } else { $AlbExtDns }

# Implantar tempranamente en el código de la App Móvil (api_client.dart) y en .env la IP / Endpoint del Backend de Arquitectura 1
$ApiClientDartPath = "$PSScriptRoot\..\mobile_app\lib\core\network\api_client.dart"
if (Test-Path $ApiClientDartPath) {
    $dartContent = [System.IO.File]::ReadAllText($ApiClientDartPath, [System.Text.Encoding]::UTF8)
    $dartContent = $dartContent -replace "static const String activeArchitecture = '[^']*';", "static const String activeArchitecture = 'ARCH1_EC2_BACKEND';"
    $dartContent = $dartContent -replace "static const String deployedHost = '[^']*';", "static const String deployedHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String authServiceHost = '[^']*';", "static const String authServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String graduatesServiceHost = '[^']*';", "static const String graduatesServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String companiesServiceHost = '[^']*';", "static const String companiesServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String matchmakingServiceHost = '[^']*';", "static const String matchmakingServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String dashboardServiceHost = '[^']*';", "static const String dashboardServiceHost = 'http://$AlbExtDns';"
    [System.IO.File]::WriteAllText($ApiClientDartPath, $dartContent, (New-Object System.Text.UTF8Encoding($false)))
}

$MobileEnvPath = "$PSScriptRoot\..\mobile_app\.env"
$EnvText = @"
# Generado automáticamente por deploy.ps1 (Arquitectura 1 - Backend EC2)
DEPLOY_ARCHITECTURE=ARCH1_EC2_BACKEND
BACKEND_PRIVATE_IP=$BackIp
BACKEND_INTERNAL_ALB=$AlbIntDns
BACKEND_PUBLIC_IP=$BackendPublicEndpoint
ALB_EXT_DNS=$AlbExtDns
API_BASE_URL=http://$AlbExtDns/api
AUTH_URL=http://$AlbExtDns
GRADUATES_URL=http://$AlbExtDns
COMPANIES_URL=http://$AlbExtDns
MATCHMAKING_URL=http://$AlbExtDns
DASHBOARD_URL=http://$AlbExtDns
"@
[System.IO.File]::WriteAllText($MobileEnvPath, $EnvText, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "`n[Verificación] Esperando a que las instancias inicialicen Docker y la aplicacion..." -ForegroundColor Yellow
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

# Refrescar IPs por si el ASG terminó de asignarlas durante la espera
$BackIp = (aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_back" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text 2>$null).Trim()
$FrontPublicIp = (aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_front" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].PublicIpAddress" --output text 2>$null).Trim()
$BackendPublicEndpoint = if ($FrontPublicIp -and $FrontPublicIp -ne "None") { $FrontPublicIp } else { $AlbExtDns }

if ($AppReady) {
    Write-Host "¡Aplicacion verificada con exito! La arquitectura de 3 capas con RDS Multi-AZ esta 100% activa." -ForegroundColor Green
} else {
    Write-Host "[AVISO] Los balanceadores estan listos. Los contenedores pueden demorar 1-2 minutos mas en compilarse por completo." -ForegroundColor DarkYellow
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " ¡Despliegue Arquitectura 1 (2 EC2 ASG + 2 ALBs + RDS Multi-AZ) Finalizado! " -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Topologia Desplegada (IaaS EC2 + PaaS RDS Multi-AZ):" -ForegroundColor Yellow
Write-Host "  1. Capa Front : 1 Instancia EC2 'portal_front' (IP Publica: $FrontPublicIp | Nginx + React SPA en ASG)" -ForegroundColor White
Write-Host "                  Detras de alb-portal-ext. (Frontend corre 100% en EC2, NO en S3)" -ForegroundColor DarkGray
Write-Host "  2. Capa Back  : 1 Instancia EC2 'portal_back' (IP Privada: $BackIp | Nginx Gateway + 5 Microservicios + RabbitMQ en ASG)" -ForegroundColor White
Write-Host "                  Detras de alb-portal-int ($AlbIntDns)." -ForegroundColor DarkGray
Write-Host "  3. Capa Data  : Amazon RDS PostgreSQL 15 Multi-AZ ('portal-db-rds' | Endpoint: $RdsHost)" -ForegroundColor White
Write-Host "                  Alta Disponibilidad nativa (Primaria en $AZ_A + Standby en $AZ_B)." -ForegroundColor DarkGray
Write-Host "  - Balanceo    : 2 ALBs (alb-portal-ext publico + alb-portal-int interno)" -ForegroundColor White
Write-Host "  - Storage S3  : Unicamente buckets para archivos de usuarios (CVs, Avatares, Entregables)" -ForegroundColor White
Write-Host "`nYa puedes ingresar inmediatamente a tu aplicacion en:" -ForegroundColor Yellow
Write-Host "http://$AlbExtDns" -ForegroundColor Cyan
Write-Host "Endpoint RDS PostgreSQL Multi-AZ: $RdsHost:5432" -ForegroundColor DarkGray
Write-Host "IP Publica Gateway (Front -> Back): http://$BackendPublicEndpoint/api" -ForegroundColor DarkGray
Write-Host "IP Privada Instancia Backend (portal_back): $BackIp" -ForegroundColor DarkGray
Write-Host "ALB Interno DNS (Backend): http://$AlbIntDns" -ForegroundColor DarkGray

# Implantar directamente en el código de la App Móvil (api_client.dart) y en .env la conexión al Backend de la Arquitectura 1
if (Test-Path $ApiClientDartPath) {
    $dartContent = [System.IO.File]::ReadAllText($ApiClientDartPath, [System.Text.Encoding]::UTF8)
    $dartContent = $dartContent -replace "static const String activeArchitecture = '[^']*';", "static const String activeArchitecture = 'ARCH1_EC2_BACKEND';"
    $dartContent = $dartContent -replace "static const String deployedHost = '[^']*';", "static const String deployedHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String authServiceHost = '[^']*';", "static const String authServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String graduatesServiceHost = '[^']*';", "static const String graduatesServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String companiesServiceHost = '[^']*';", "static const String companiesServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String matchmakingServiceHost = '[^']*';", "static const String matchmakingServiceHost = 'http://$AlbExtDns';"
    $dartContent = $dartContent -replace "static const String dashboardServiceHost = '[^']*';", "static const String dashboardServiceHost = 'http://$AlbExtDns';"
    [System.IO.File]::WriteAllText($ApiClientDartPath, $dartContent, (New-Object System.Text.UTF8Encoding($false)))
}
$EnvText = @"
# Generado automáticamente por deploy.ps1 (Arquitectura 1 - Backend EC2)
DEPLOY_ARCHITECTURE=ARCH1_EC2_BACKEND
BACKEND_PRIVATE_IP=$BackIp
BACKEND_INTERNAL_ALB=$AlbIntDns
BACKEND_PUBLIC_IP=$BackendPublicEndpoint
ALB_EXT_DNS=$AlbExtDns
API_BASE_URL=http://$AlbExtDns/api
AUTH_URL=http://$AlbExtDns
GRADUATES_URL=http://$AlbExtDns
COMPANIES_URL=http://$AlbExtDns
MATCHMAKING_URL=http://$AlbExtDns
DASHBOARD_URL=http://$AlbExtDns
"@
[System.IO.File]::WriteAllText($MobileEnvPath, $EnvText, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "App Móvil (api_client.dart + .env) vinculada directamente al Backend de Arquitectura 1 (IP Back: $BackIp | Gateway: http://$AlbExtDns/api)" -ForegroundColor Green

