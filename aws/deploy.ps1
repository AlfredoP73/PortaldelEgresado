$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Despliegue Multi-AZ (Alta Disponibilidad)   " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=======================================================" -ForegroundColor Cyan


# Credenciales: se cargan desde aws/credentials.ps1 (ignorado por git).
# Copia credentials.example.ps1 -> credentials.ps1 y pega tus credenciales del Learner Lab.
if (Test-Path "$PSScriptRoot\credentials.ps1") { . "$PSScriptRoot\credentials.ps1" }

$AZ_A = "us-east-1a"
$AZ_B = "us-east-1b"

$oldErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$IdentityJson = aws sts get-caller-identity --output json 2>$null
$ErrorActionPreference = $oldErr

if ($LASTEXITCODE -ne 0) { 
    Write-Host "`n[ERROR] Credenciales de AWS inválidas o expiradas." -ForegroundColor Red
    Write-Host "Por favor, copia las credenciales nuevas de tu AWS Learner Lab (AWS Details -> AWS CLI)" -ForegroundColor Yellow
    Write-Host "y pégalas en las líneas 9, 10 y 11 de este archivo deploy.ps1." -ForegroundColor Yellow
    exit 1 
}

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

Write-Host "Creando 2 NAT Gateways (Uno por Zona de Disponibilidad para Alta Disponibilidad Real)..." -ForegroundColor Yellow
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

Write-Host "`n[Fase 2: Security Groups]" -ForegroundColor Yellow
$SgAlbExt = aws ec2 create-security-group --group-name "sg_alb_ext" --description "ALB Externo SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgAlbExt --tags Key=Name,Value=sg_alb_ext | Out-Null
$SgFront  = aws ec2 create-security-group --group-name "sg_front" --description "Frontend ASG SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgFront --tags Key=Name,Value=sg_front | Out-Null
$SgAlbInt = aws ec2 create-security-group --group-name "sg_alb_int" --description "ALB Interno SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgAlbInt --tags Key=Name,Value=sg_alb_int | Out-Null
$SgBack   = aws ec2 create-security-group --group-name "sg_back" --description "Backend ASG SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgBack --tags Key=Name,Value=sg_back | Out-Null
$SgData   = aws ec2 create-security-group --group-name "sg_data" --description "Data SG" --vpc-id $VpcId --query "GroupId" --output text
aws ec2 create-tags --resources $SgData --tags Key=Name,Value=sg_data | Out-Null

aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbExt --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgFront --protocol tcp --port 80 --source-group $SgAlbExt | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgAlbInt --protocol tcp --port 80 --source-group $SgFront | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgBack --protocol tcp --port 80 --source-group $SgAlbInt | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5432 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 9000 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 5672 --source-group $SgBack | Out-Null
aws ec2 authorize-security-group-ingress --group-id $SgData --protocol tcp --port 3100 --source-group $SgBack | Out-Null

$AmiId = aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 --query "Parameters[0].Value" --output text
$KeyName = "portal_egresado_key"
$IamProfile = "LabInstanceProfile"

# Script base docker
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

Write-Host "`n[S3] Creando buckets..." -ForegroundColor Yellow
$AccountId = aws sts get-caller-identity --query Account --output text
$BucketCvs      = "portal-cvs-$AccountId"
$BucketAvatars  = "portal-avatars-$AccountId"
$BucketDeliver  = "portal-deliverables-$AccountId"
foreach ($bucket in @($BucketCvs, $BucketAvatars, $BucketDeliver)) {
    aws s3 mb "s3://$bucket" --region us-east-1 2>$null
}

Write-Host "`n[Fase 3: Capa Data - Instancia Única EC2]" -ForegroundColor Yellow
$DataUserData = @"
#!/bin/bash
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

$DataId = aws ec2 run-instances --image-id $AmiId --instance-type t3.small --key-name $KeyName --security-group-ids $SgData --subnet-id $SubDbA --iam-instance-profile "Name=$IamProfile" --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3}" "DeviceName=/dev/xvdf,Ebs={VolumeSize=20,VolumeType=gp3}" --user-data $DataUdEnc --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=portal_data}]" --query "Instances[0].InstanceId" --output text
aws ec2 wait instance-running --instance-ids $DataId
$DataIp = aws ec2 describe-instances --instance-ids $DataId --query "Reservations[0].Instances[0].PrivateIpAddress" --output text

Write-Host "`n[Fase 4: Capa Back - Internal ALB y ASG]" -ForegroundColor Yellow
$TgBackArn = aws elbv2 create-target-group --name tg-portal-back --protocol HTTP --port 80 --vpc-id $VpcId --target-type instance --query "TargetGroups[0].TargetGroupArn" --output text
$AlbIntArn = aws elbv2 create-load-balancer --name alb-portal-int --subnets $SubAppA $SubAppB --security-groups $SgAlbInt --scheme internal --query "LoadBalancers[0].LoadBalancerArn" --output text
aws elbv2 create-listener --load-balancer-arn $AlbIntArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgBackArn | Out-Null
$AlbIntDns = aws elbv2 describe-load-balancers --load-balancer-arns $AlbIntArn --query "LoadBalancers[0].DNSName" --output text
Write-Host "ALB Interno DNS: $AlbIntDns" -ForegroundColor Cyan

$BackUserData = @"
#!/bin/bash
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
$LtBackJson | Out-File "lt_back.json" -Encoding ascii
aws ec2 create-launch-template --launch-template-name lt-portal-back --version-description "v1" --launch-template-data file://lt_back.json | Out-Null

Write-Host "Creando Auto Scaling Group del Backend..." -ForegroundColor Yellow
aws autoscaling create-auto-scaling-group --auto-scaling-group-name asg-portal-back --launch-template LaunchTemplateName=lt-portal-back,Version=1 --min-size 2 --max-size 6 --desired-capacity 2 --vpc-zone-identifier "$SubAppA,$SubAppB" --target-group-arns $TgBackArn --health-check-type ELB --health-check-grace-period 300 --tags "ResourceId=asg-portal-back,ResourceType=auto-scaling-group,Key=Name,Value=portal_back,PropagateAtLaunch=true" | Out-Null

# Auto Scaling Policies (Simple Scaling) - BACKEND
$PolicyOutArn = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-back --policy-name scale-out-cpu --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment 1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-high-back --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 70 --comparison-operator GreaterThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-back" --evaluation-periods 2 --alarm-actions $PolicyOutArn 2>$null

$PolicyInArn = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-back --policy-name scale-in-cpu --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment -1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-low-back --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 30 --comparison-operator LessThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-back" --evaluation-periods 2 --alarm-actions $PolicyInArn 2>$null

Write-Host "`n[Fase 5: Capa Front - External ALB y ASG]" -ForegroundColor Yellow
$TgFrontArn = aws elbv2 create-target-group --name tg-portal-front --protocol HTTP --port 80 --vpc-id $VpcId --target-type instance --query "TargetGroups[0].TargetGroupArn" --output text
$AlbExtArn = aws elbv2 create-load-balancer --name alb-portal-ext --subnets $SubPubA $SubPubB --security-groups $SgAlbExt --scheme internet-facing --query "LoadBalancers[0].LoadBalancerArn" --output text
aws elbv2 create-listener --load-balancer-arn $AlbExtArn --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TgFrontArn | Out-Null
$AlbExtDns = aws elbv2 describe-load-balancers --load-balancer-arns $AlbExtArn --query "LoadBalancers[0].DNSName" --output text

$FrontUserData = @"
#!/bin/bash
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
$LtFrontJson | Out-File "lt_front.json" -Encoding ascii
aws ec2 create-launch-template --launch-template-name lt-portal-front --version-description "v1" --launch-template-data file://lt_front.json | Out-Null

aws autoscaling create-auto-scaling-group --auto-scaling-group-name asg-portal-front --launch-template LaunchTemplateName=lt-portal-front,Version=1 --min-size 2 --max-size 6 --desired-capacity 2 --vpc-zone-identifier "$SubPubA,$SubPubB" --target-group-arns $TgFrontArn --health-check-type ELB --health-check-grace-period 300 --tags "ResourceId=asg-portal-front,ResourceType=auto-scaling-group,Key=Name,Value=portal_front,PropagateAtLaunch=true" | Out-Null

# Auto Scaling Policies (Simple Scaling) - FRONTEND
$PolicyOutFront = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-front --policy-name scale-out-cpu-front --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment 1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-high-front --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 70 --comparison-operator GreaterThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-front" --evaluation-periods 2 --alarm-actions $PolicyOutFront 2>$null

$PolicyInFront = aws autoscaling put-scaling-policy --auto-scaling-group-name asg-portal-front --policy-name scale-in-cpu-front --policy-type SimpleScaling --adjustment-type ChangeInCapacity --scaling-adjustment -1 --cooldown 300 --query "PolicyARN" --output text 2>$null
aws cloudwatch put-metric-alarm --alarm-name alarm-cpu-low-front --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 60 --threshold 30 --comparison-operator LessThanThreshold --dimensions "Name=AutoScalingGroupName,Value=asg-portal-front" --evaluation-periods 2 --alarm-actions $PolicyInFront 2>$null

Write-Host "Esperando a que el Balanceador de Cargas Público termine de construirse (esto puede tomar 3 a 5 minutos)..." -ForegroundColor Yellow
aws elbv2 wait load-balancer-available --load-balancer-arns $AlbExtArn

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "¡Despliegue Multi-AZ Finalizado y Balanceador Activo!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Por favor, espera unos minutos extra a que los servidores instalen Docker y la aplicación."
Write-Host "Luego ingresa a la siguiente URL en tu navegador:" -ForegroundColor Yellow
Write-Host "http://$AlbExtDns" -ForegroundColor White
