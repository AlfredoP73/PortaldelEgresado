$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Despliegue 3-Tier en AWS Learner Lab " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Configurar y Validar Autenticación
# Las credenciales deben estar ya configuradas en tu terminal (pegándolas desde Learner Lab)
$env:AWS_DEFAULT_REGION = "us-east-1"
$AZ = "us-east-1a"

$IdentityJson = aws sts get-caller-identity --output json 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Credenciales inválidas." -ForegroundColor Red; exit }

Write-Host "`n[Fase 1: Red] Creando VPC y Subredes..." -ForegroundColor Yellow
$VpcId = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=portal_vpc}]" --query "Vpc.VpcId" --output text
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-hostnames "{\"Value\":true}" | Out-Null
Write-Host "VPC: $VpcId" -ForegroundColor Green

$SubPubId = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.1.0/24 --availability-zone $AZ --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_front}]" --query "Subnet.SubnetId" --output text
$SubBackId = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.2.0/24 --availability-zone $AZ --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_back}]" --query "Subnet.SubnetId" --output text
$SubDataId = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.3.0/24 --availability-zone $AZ --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=portal_sub_data}]" --query "Subnet.SubnetId" --output text
Write-Host "Subredes creadas." -ForegroundColor Green

$IgwId = aws ec2 create-internet-gateway --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=portal_igw}]" --query "InternetGateway.InternetGatewayId" --output text
aws ec2 attach-internet-gateway --vpc-id $VpcId --internet-gateway-id $IgwId | Out-Null
Write-Host "Internet Gateway: $IgwId" -ForegroundColor Green

$RtPub = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=portal_rt_pub}]" --query "RouteTable.RouteTableId" --output text
aws ec2 create-route --route-table-id $RtPub --destination-cidr-block 0.0.0.0/0 --gateway-id $IgwId | Out-Null
aws ec2 associate-route-table --subnet-id $SubPubId --route-table-id $RtPub | Out-Null

$AmiId = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query "Parameters[0].Value" --output text

Write-Host "Creando instancia NAT (t3.micro) en Subred Pública para dar internet a las privadas..." -ForegroundColor Yellow
$NatSgId = aws ec2 create-security-group --group-name "nat_sg" --description "NAT SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 authorize-security-group-ingress --group-id $NatSgId --protocol -1 --port -1 --cidr 10.0.0.0/16 | Out-Null

$NatUserData = @"
#!/bin/bash
sysctl -w net.ipv4.ip_forward=1
cat <<'EOF' > /etc/sysctl.d/custom-ip-forwarding.conf
net.ipv4.ip_forward=1
EOF
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
ETH0_MAC=`curl -H "X-aws-ec2-metadata-token: `\$TOKEN" -s http://169.254.169.254/latest/meta-data/mac`
ETH0_NAME=`ip -o link | grep `\$ETH0_MAC | awk -F': ' '{print \$2}'`
iptables -t nat -A POSTROUTING -o \$ETH0_NAME -j MASQUERADE
yum install iptables-services -y
service iptables save
systemctl enable iptables
systemctl start iptables
"@
$NatUserDataEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($NatUserData))

$NatInstanceId = aws ec2 run-instances --image-id $AmiId --instance-type t3.micro --subnet-id $SubPubId --security-group-ids $NatSgId --user-data $NatUserDataEnc --associate-public-ip-address --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_nat}]" --query "Instances[0].InstanceId" --output text
Write-Host "NAT Creado: $NatInstanceId" -ForegroundColor Green
Write-Host "Esperando a que la instancia NAT esté corriendo..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $NatInstanceId
aws ec2 modify-instance-attribute --instance-id $NatInstanceId --source-dest-check "{\`"Value\`": false}"
$NatEniId = aws ec2 describe-instances --instance-ids $NatInstanceId --query "Reservations[0].Instances[0].NetworkInterfaces[0].NetworkInterfaceId" --output text

$RtPriv = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=portal_rt_priv}]" --query "RouteTable.RouteTableId" --output text
aws ec2 create-route --route-table-id $RtPriv --destination-cidr-block 0.0.0.0/0 --network-interface-id $NatEniId | Out-Null
aws ec2 associate-route-table --subnet-id $SubBackId --route-table-id $RtPriv | Out-Null
aws ec2 associate-route-table --subnet-id $SubDataId --route-table-id $RtPriv | Out-Null
Write-Host "Rutas privadas configuradas hacia el NAT." -ForegroundColor Green

Write-Host "`n[Fase 1: Security Groups]" -ForegroundColor Yellow
$SgFront = aws ec2 create-security-group --group-name "sg_front" --description "Front SG" --vpc-id $VpcId --query "GroupId" --output text
$SgBack = aws ec2 create-security-group --group-name "sg_back" --description "Back SG" --vpc-id $VpcId --query "GroupId" --output text
$SgData = aws ec2 create-security-group --group-name "sg_data" --description "Data SG" --vpc-id $VpcId --query "GroupId" --output text

aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgBack --protocol tcp --port 80 --source-group $SgFront | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5432 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 9000 --source-group $SgBack | Out-Null
Write-Host "Security Groups configurados." -ForegroundColor Green

$KeyName = "portal_egresado_key"
$IamProfile = "LabInstanceProfile"

# Script base para instalar docker
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
git clone https://github.com/AlfredoP73/PortalcelEgresado.git app
chown -R ec2-user:ec2-user app
cd app
"@

Write-Host "`n[Fase 2 y 3: Desplegar Capa Data]" -ForegroundColor Yellow
$DataUserData = @"
#!/bin/bash
# Formatear y montar EBS extra en /data
mkfs -t xfs /dev/xvdf
mkdir /data
mount /dev/xvdf /data
echo '/dev/xvdf /data xfs defaults,nofail 0 2' >> /etc/fstab
chown ec2-user:ec2-user /data

$DockerBase
cat <<'EOF' > .env.data
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PasswordSegura123
POSTGRES_DB=postgres
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
EOF
/usr/local/bin/docker-compose -f docker-compose.data.yml --env-file .env.data up -d
"@
$DataUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($DataUserData))

$DataId = aws ec2 run-instances --image-id $AmiId --instance-type t3.small --key-name $KeyName --security-group-ids $SgData --subnet-id $SubDataId --iam-instance-profile "Name=$IamProfile" --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3}" "DeviceName=/dev/xvdf,Ebs={VolumeSize=20,VolumeType=gp3}" --user-data $DataUdEnc --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_data}]" --query "Instances[0].InstanceId" --output text
Write-Host "Instancia Data lanzada ($DataId). Esperando estado 'running'..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $DataId
$DataIp = aws ec2 describe-instances --instance-ids $DataId --query "Reservations[0].Instances[0].PrivateIpAddress" --output text
Write-Host "Data IP Privada: $DataIp" -ForegroundColor Green

Write-Host "`nPre-asignando Elastic IP para el Frontend..." -ForegroundColor Yellow
$AllocId = aws ec2 allocate-address --domain vpc --query "AllocationId" --output text
$FrontPublicIp = aws ec2 describe-addresses --allocation-ids $AllocId --query "Addresses[0].PublicIp" --output text

Write-Host "`n[Fase 4: Desplegar Capa Back]" -ForegroundColor Yellow
$BackUserData = @"
#!/bin/bash
$DockerBase
cat <<'EOF' > .env.back
DATA_HOST=$DataIp
DB_USER=postgres
DB_PASSWORD=PasswordSegura123
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
SECRET_KEY=clave_secreta_super_segura_de_32_caracteres_minimo
MATCHMAKING_INTERNAL_TOKEN=token_interno_servicios_seguro
FRONTEND_URL=http://$FrontPublicIp
EOF
/usr/local/bin/docker-compose -f docker-compose.back.yml --env-file .env.back up -d --build
"@
$BackUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($BackUserData))

$BackId = aws ec2 run-instances --image-id $AmiId --instance-type t3.medium --key-name $KeyName --security-group-ids $SgBack --subnet-id $SubBackId --iam-instance-profile "Name=$IamProfile" --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}" --user-data $BackUdEnc --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_back}]" --query "Instances[0].InstanceId" --output text
Write-Host "Instancia Back lanzada ($BackId). Esperando estado 'running'..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $BackId
$BackIp = aws ec2 describe-instances --instance-ids $BackId --query "Reservations[0].Instances[0].PrivateIpAddress" --output text
Write-Host "Back IP Privada: $BackIp" -ForegroundColor Green

Write-Host "`n[Fase 5: Desplegar Capa Front]" -ForegroundColor Yellow
$FrontUserData = @"
#!/bin/bash
$DockerBase
cat <<'EOF' > .env.front
BACK_HOST=$BackIp
EOF
/usr/local/bin/docker-compose -f docker-compose.front.yml --env-file .env.front up -d --build
"@
$FrontUdEnc = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($FrontUserData))

$FrontId = aws ec2 run-instances --image-id $AmiId --instance-type t3.small --key-name $KeyName --security-group-ids $SgFront --subnet-id $SubPubId --iam-instance-profile "Name=$IamProfile" --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3}" --user-data $FrontUdEnc --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_front}]" --query "Instances[0].InstanceId" --output text
Write-Host "Instancia Front lanzada ($FrontId). Esperando estado 'running'..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $FrontId

Write-Host "Asociando IP Elástica ($FrontPublicIp) al Frontend..." -ForegroundColor Cyan
aws ec2 associate-address --instance-id $FrontId --allocation-id $AllocId | Out-Null

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "¡Despliegue 3-Tier Completado con Éxito!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Instancia Data (Postgres, Minio) :" -NoNewline; Write-Host " $DataIp (Privada)" -ForegroundColor Yellow
Write-Host "Instancia Back (Microservicios)  :" -NoNewline; Write-Host " $BackIp (Privada)" -ForegroundColor Yellow
Write-Host "Instancia Front (React + Nginx)  :" -NoNewline; Write-Host " $FrontPublicIp (Pública)" -ForegroundColor Magenta
Write-Host "Puedes acceder a tu web en       :" -NoNewline; Write-Host " http://$FrontPublicIp" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "(Nota: Las instancias tardarán entre 3 a 5 minutos en instalar dependencias, construir imágenes y arrancar los contenedores)." -ForegroundColor DarkGray
