$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Destrucción Arquitectura 1 (2 EC2 ASG + 2 ALBs + RDS Multi-AZ) " -ForegroundColor Cyan -BackgroundColor DarkRed
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Configurar y Validar Autenticación
if (Test-Path "$PSScriptRoot\credentials.ps1") { . "$PSScriptRoot\credentials.ps1" }

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

$AccountId = (aws sts get-caller-identity --query Account --output text 2>$null).Trim()
Write-Host "AWS Account ID: $AccountId" -ForegroundColor Cyan

function Release-ElasticIPs {
    Write-Host "`n[Redes] Buscando y liberando IPs Elásticas (evitar límite de 5 EIPs en Learner Lab)..." -ForegroundColor Yellow
    $retry = 0
    while ($retry -lt 8) {
        $AllIps = aws ec2 describe-addresses --query "Addresses[*].AllocationId" --output text 2>$null
        $allocatedList = @($AllIps -split '\s+' | Where-Object { $_ -match '^eipalloc-' })
        if ($allocatedList.Count -eq 0) {
            Write-Host "  -> No hay IPs Elásticas asignadas en la cuenta." -ForegroundColor Green
            break
        }
        $freedCount = 0
        foreach ($IpAlloc in $allocatedList) {
            $AssocId = aws ec2 describe-addresses --allocation-ids $IpAlloc --query "Addresses[0].AssociationId" --output text 2>$null
            if ($AssocId -and $AssocId -ne "None" -and $AssocId -match '^eipassoc-') {
                aws ec2 disassociate-address --association-id $AssocId 2>$null | Out-Null
            }
            aws ec2 release-address --allocation-id $IpAlloc 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  -> IP Elástica liberada con éxito: $IpAlloc" -ForegroundColor Green
                $freedCount++
            }
        }
        $retry++
        if ($freedCount -eq $allocatedList.Count) { break }
        Start-Sleep -Seconds 5
    }
}

# 2. Fase 1: Auto Scaling Groups, Scaling Policies y Launch Templates (Capa Front y Capa Back)
Write-Host "`n[Fase 1: Auto Scaling Groups y Launch Templates]" -ForegroundColor Yellow
$AsgNames = aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[?contains(AutoScalingGroupName, 'portal')].AutoScalingGroupName" --output text 2>$null
$AsgList = @($AsgNames -split '\s+' | Where-Object { $_ -ne "" })
if ($AsgList.Count -eq 0) {
    $AsgList = @("asg-portal-front", "asg-portal-back")
}

$AsgInstances = @()
foreach ($asg in $AsgList) {
    $asgExists = aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg --query "AutoScalingGroups[0].AutoScalingGroupName" --output text 2>$null
    if ($asgExists -and $asgExists -ne "None" -and $asgExists.Trim() -ne "") {
        Write-Host "  -> Procesando Auto Scaling Group: $asg..." -ForegroundColor Cyan

        # Recolectar instancias del ASG para terminarlas explícitamente
        $insts = aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg --query "AutoScalingGroups[0].Instances[*].InstanceId" --output text 2>$null
        foreach ($id in ($insts -split '\s+' | Where-Object { $_ -match '^i-' })) {
            if ($AsgInstances -notcontains $id) { $AsgInstances += $id }
        }

        # Desasociar Target Groups primero para liberar inmediatamente tg-portal-front y tg-portal-back
        $attachedTgs = aws autoscaling describe-load-balancer-target-groups --auto-scaling-group-name $asg --query "LoadBalancerTargetGroups[*].LoadBalancerTargetGroupARN" --output text 2>$null
        $tgArnList = @($attachedTgs -split '\s+' | Where-Object { $_ -match '^arn:aws:' })
        if ($tgArnList.Count -gt 0) {
            Write-Host "  -> Desasociando Target Group(s) de $asg..." -ForegroundColor Cyan
            aws autoscaling detach-load-balancer-target-groups --auto-scaling-group-name $asg --target-group-arns $tgArnList 2>$null | Out-Null
        }

        # Eliminar políticas de escalado del ASG (scale-out-cpu, scale-in-cpu, etc.)
        $policies = aws autoscaling describe-policies --auto-scaling-group-name $asg --query "ScalingPolicies[*].PolicyName" --output text 2>$null
        foreach ($pol in ($policies -split '\s+' | Where-Object { $_ -ne "" })) {
            aws autoscaling delete-policy --auto-scaling-group-name $asg --policy-name $pol 2>$null | Out-Null
        }

        # Reducir capacidad a 0 y forzar eliminación del ASG
        aws autoscaling update-auto-scaling-group --auto-scaling-group-name $asg --min-size 0 --max-size 0 --desired-capacity 0 2>$null | Out-Null
        aws autoscaling delete-auto-scaling-group --auto-scaling-group-name $asg --force-delete 2>$null | Out-Null
        Write-Host "  -> Eliminación solicitada para ASG: $asg" -ForegroundColor Green
    }
}

Write-Host "  -> Eliminando Launch Templates (lt-portal-front, lt-portal-back)..." -ForegroundColor Cyan
$LtList = aws ec2 describe-launch-templates --query "LaunchTemplates[?contains(LaunchTemplateName, 'portal')].LaunchTemplateName" --output text 2>$null
$LtNames = @($LtList -split '\s+' | Where-Object { $_ -ne "" })
if ($LtNames.Count -eq 0) {
    $LtNames = @("lt-portal-front", "lt-portal-back")
}
foreach ($lt in $LtNames) {
    aws ec2 delete-launch-template --launch-template-name $lt 2>$null | Out-Null
}

# 3. Fase 2: Alarmas de CloudWatch
Write-Host "`n[Fase 2: CloudWatch Alarms]" -ForegroundColor Yellow
$Alarms = aws cloudwatch describe-alarms --query "MetricAlarms[?contains(AlarmName, 'portal') || contains(AlarmName, 'cpu')].AlarmName" --output text 2>$null
$AlarmList = @($Alarms -split '\s+' | Where-Object { $_ -ne "" })
if ($AlarmList.Count -gt 0) {
    Write-Host "  -> Eliminando $($AlarmList.Count) alarma(s) de CloudWatch: $($AlarmList -join ', ')..." -ForegroundColor Cyan
    aws cloudwatch delete-alarms --alarm-names $AlarmList 2>$null | Out-Null
} else {
    Write-Host "  -> No hay alarmas de CloudWatch activas." -ForegroundColor Green
}

# 4. Fase 3: Balanceadores de Carga (alb-portal-ext, alb-portal-int) y Target Groups (tg-portal-front, tg-portal-back)
Write-Host "`n[Fase 3: Balanceadores de Carga (2 ALBs) y Target Groups]" -ForegroundColor Yellow
$VpcListForAlb = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=portal_vpc" --query "Vpcs[*].VpcId" --output text 2>$null
$VpcIdsArray = @($VpcListForAlb -split '\s+' | Where-Object { $_ -match '^vpc-' })

$Albs = aws elbv2 describe-load-balancers --query "LoadBalancers[*].LoadBalancerArn" --output text 2>$null
$AlbArray = @($Albs -split '\s+' | Where-Object { $_ -match "alb-portal" })
foreach ($vId in $VpcIdsArray) {
    $vpcAlbs = aws elbv2 describe-load-balancers --query "LoadBalancers[?VpcId=='$vId'].LoadBalancerArn" --output text 2>$null
    foreach ($va in ($vpcAlbs -split '\s+' | Where-Object { $_ -match '^arn:aws:' })) {
        if ($AlbArray -notcontains $va) { $AlbArray += $va }
    }
}

if ($AlbArray.Count -gt 0) {
    foreach ($alb in $AlbArray) {
        # Eliminar Listeners primero para liberar los Target Groups de inmediato
        $listeners = aws elbv2 describe-listeners --load-balancer-arn $alb --query "Listeners[*].ListenerArn" --output text 2>$null
        foreach ($lic in ($listeners -split '\s+' | Where-Object { $_ -match '^arn:aws:' })) {
            aws elbv2 delete-listener --listener-arn $lic 2>$null | Out-Null
        }
        Write-Host "  -> Eliminando ALB: $alb..." -ForegroundColor Cyan
        aws elbv2 delete-load-balancer --load-balancer-arn $alb 2>$null | Out-Null
    }
    Write-Host "  -> Esperando a que los ALBs desaparezcan de la red..." -ForegroundColor Yellow
    aws elbv2 wait load-balancers-deleted --load-balancer-arns $AlbArray 2>$null
    Write-Host "  -> ALBs eliminados correctamente." -ForegroundColor Green
} else {
    Write-Host "  -> No se encontraron ALBs activos." -ForegroundColor Green
}

Write-Host "  -> Eliminando Target Groups (tg-portal-front, tg-portal-back)..." -ForegroundColor Cyan
$Tgs = aws elbv2 describe-target-groups --query "TargetGroups[*].TargetGroupArn" --output text 2>$null
foreach ($tg in ($Tgs -split '\s+' | Where-Object { $_ -ne "" })) {
    if ($tg -match "tg-portal" -or $tg -match "tg-ecs-") {
        $retryTg = 0
        while ($retryTg -lt 15) {
            aws elbv2 delete-target-group --target-group-arn $tg 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  -> Target Group eliminado: $($tg -split '/' | Select-Object -Skip 1 -First 1)" -ForegroundColor Green
                break
            }
            Start-Sleep -Seconds 4
            $retryTg++
        }
    }
}

# 5. Fase 4: Instancias EC2 de las Capas Front y Back (portal_front, portal_back)
Write-Host "`n[Fase 4: Instancias EC2 ASG (portal_front, portal_back)]" -ForegroundColor Yellow
$InstQueryTags = aws ec2 describe-instances --filters "Name=tag:Name,Values=portal_front,portal_back,portal_data,PortalEgresado-Server" "Name=instance-state-name,Values=running,pending,stopped,stopping" --query "Reservations[*].Instances[*].InstanceId" --output text 2>$null
$AllInstsToKill = @($InstQueryTags -split '\s+' | Where-Object { $_ -match '^i-' })

foreach ($id in $AsgInstances) {
    if ($AllInstsToKill -notcontains $id) { $AllInstsToKill += $id }
}

foreach ($vpcToKill in $VpcIdsArray) {
    $VpcInsts = aws ec2 describe-instances --filters "Name=vpc-id,Values=$vpcToKill" "Name=instance-state-name,Values=running,pending,stopped,stopping" --query "Reservations[*].Instances[*].InstanceId" --output text 2>$null
    foreach ($vi in ($VpcInsts -split '\s+' | Where-Object { $_ -match '^i-' })) {
        if ($AllInstsToKill -notcontains $vi) {
            $AllInstsToKill += $vi
        }
    }
}

if ($AllInstsToKill.Count -gt 0) {
    Write-Host "  -> Terminando $($AllInstsToKill.Count) instancia(s) EC2: $($AllInstsToKill -join ', ')..." -ForegroundColor Cyan
    aws ec2 terminate-instances --instance-ids $AllInstsToKill 2>$null | Out-Null
    Write-Host "  -> Esperando a que todas las instancias EC2 lleguen al estado 'terminated'..." -ForegroundColor Yellow
    aws ec2 wait instance-terminated --instance-ids $AllInstsToKill 2>$null
    Write-Host "  -> Instancias EC2 terminadas." -ForegroundColor Green
} else {
    Write-Host "  -> No hay instancias EC2 activas." -ForegroundColor Green
}

# Esperar a que los Auto Scaling Groups terminen de borrarse por completo en AWS
$waitAsg = 0
while ($waitAsg -lt 15) {
    $remAsg = aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[?contains(AutoScalingGroupName, 'portal')].AutoScalingGroupName" --output text 2>$null
    if (-not $remAsg -or $remAsg.Trim() -eq "") { break }
    Write-Host "  -> Esperando finalización de eliminación de ASG ($($remAsg.Trim()))..." -ForegroundColor DarkYellow
    Start-Sleep -Seconds 4
    $waitAsg++
}

# Limpieza preventiva en caso de que existan recursos remanentes de ECS/RDS en la VPC
$Clusters = aws ecs list-clusters --query "clusterArns[*]" --output text 2>$null
if ($Clusters -match "portal-cluster") {
    Write-Host "`n[Limpieza Preventiva] Detectado cluster ECS remanente en la cuenta, limpiando..." -ForegroundColor Yellow
    $services = aws ecs list-services --cluster portal-cluster --query "serviceArns[*]" --output text 2>$null
    foreach ($svc in ($services -split '\s+' | Where-Object { $_ -ne "" })) {
        $svcName = $svc -split '/' | Select-Object -Last 1
        aws application-autoscaling deregister-scalable-target --service-namespace ecs --scalable-dimension ecs:service:DesiredCount --resource-id "service/portal-cluster/$svcName" 2>$null | Out-Null
        aws ecs update-service --cluster portal-cluster --service $svc --desired-count 0 2>$null | Out-Null
        aws ecs delete-service --cluster portal-cluster --service $svc --force 2>$null | Out-Null
    }
    foreach ($st in @("RUNNING", "PENDING")) {
        $tasks = aws ecs list-tasks --cluster portal-cluster --desired-status $st --query "taskArns[*]" --output text 2>$null
        foreach ($t in ($tasks -split '\s+' | Where-Object { $_ -ne "" })) {
            aws ecs stop-task --cluster portal-cluster --task $t 2>$null | Out-Null
        }
    }
    Start-Sleep -Seconds 5
    aws ecs delete-cluster --cluster portal-cluster 2>$null | Out-Null
}

# 6. Fase 5: Base de Datos Relacional Amazon RDS PostgreSQL Multi-AZ
Write-Host "`n[Fase 5: Base de Datos Relacional Amazon RDS PostgreSQL Multi-AZ]" -ForegroundColor Yellow
$RdsStatus = aws rds describe-db-instances --db-instance-identifier portal-db-rds --query "DBInstances[0].DBInstanceStatus" --output text 2>$null
if ($RdsStatus -and $RdsStatus -ne "None" -and $RdsStatus.Trim() -ne "") {
    Write-Host "  -> Eliminando instancia RDS 'portal-db-rds' (Multi-AZ)..." -ForegroundColor Cyan
    if ($RdsStatus.Trim() -ne "deleting") {
        aws rds delete-db-instance --db-instance-identifier portal-db-rds --skip-final-snapshot --delete-automated-backups 2>$null | Out-Null
    }
    $rdsWait = 0
    while ($rdsWait -lt 60) {
        $st = aws rds describe-db-instances --db-instance-identifier portal-db-rds --query "DBInstances[0].DBInstanceStatus" --output text 2>$null
        if (-not $st -or $st -eq "None" -or $st.Trim() -eq "") { break }
        if ($st.Trim() -ne "deleting") {
            aws rds delete-db-instance --db-instance-identifier portal-db-rds --skip-final-snapshot --delete-automated-backups 2>$null | Out-Null
        }
        Write-Host "  -> Esperando eliminación de RDS portal-db-rds (estado: $($st.Trim()))..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds 15
        $rdsWait++
    }
    Write-Host "  -> Instancia RDS eliminada con éxito." -ForegroundColor Green
    aws rds delete-db-subnet-group --db-subnet-group-name portal-db-subnets 2>$null | Out-Null
    Write-Host "  -> DB Subnet Group 'portal-db-subnets' eliminado." -ForegroundColor Green
} else {
    Write-Host "  -> No se encontró instancia RDS 'portal-db-rds' activa." -ForegroundColor Green
}

# 7. Fase 6: Limpieza Profunda de Red Multi-AZ (VPC, 2 NAT Gateways, EIPs, ENIs, 3 Route Tables, 5 SGs, 6 Subredes, IGW)
$Vpcs = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=portal_vpc" --query "Vpcs[*].VpcId" --output text 2>$null
$VpcArray = @($Vpcs -split '\s+' | Where-Object { $_ -match '^vpc-' })

foreach ($VpcId in $VpcArray) {
    Write-Host "`n[Fase 6: Red Multi-AZ] Limpiando recursos de red en VPC: $VpcId" -ForegroundColor Yellow

    # A. NAT Gateways (portal_nat_gw_a, portal_nat_gw_b)
    $NatGws = aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VpcId" "Name=state,Values=available,pending,failed" --query "NatGateways[*].NatGatewayId" --output text 2>$null
    $NatArray = @($NatGws -split '\s+' | Where-Object { $_ -match '^nat-' })
    if ($NatArray.Count -gt 0) {
        Write-Host "  -> Eliminando $($NatArray.Count) NAT Gateway(s): $($NatArray -join ', ')..." -ForegroundColor Cyan
        foreach ($nat in $NatArray) { aws ec2 delete-nat-gateway --nat-gateway-id $nat 2>$null | Out-Null }
        Write-Host "  -> Esperando a que los NAT Gateways pasen al estado 'deleted' en AWS..." -ForegroundColor Yellow
        foreach ($nat in $NatArray) { aws ec2 wait nat-gateway-deleted --nat-gateway-ids $nat 2>$null }
        Write-Host "  -> NAT Gateways eliminados." -ForegroundColor Green
    }
}

# Liberar las 2 IPs Elásticas tras eliminar los NAT Gateways
Release-ElasticIPs

foreach ($VpcId in $VpcArray) {
    # B. Eliminar VPC Endpoints si existieran
    $VpcEndpoints = aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=$VpcId" --query "VpcEndpoints[*].VpcEndpointId" --output text 2>$null
    foreach ($vpce in ($VpcEndpoints -split '\s+' | Where-Object { $_ -match '^vpce-' })) {
        aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $vpce 2>$null | Out-Null
    }

    # C. Drenaje de Interfaces de Red (ENIs)
    Write-Host "`n[ENIs] Verificando liberación de interfaces de red en la VPC $VpcId..." -ForegroundColor Yellow
    $eniTimeout = 24 # Hasta 4 minutos
    while ($eniTimeout -gt 0) {
        $enisRaw = aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=$VpcId" --query "NetworkInterfaces[*].[NetworkInterfaceId,Status]" --output text 2>$null
        $eniLines = @($enisRaw -split "`n" | Where-Object { $_ -match '^eni-' })
        if ($eniLines.Count -eq 0) {
            Write-Host "  -> Todas las interfaces de red (ENIs) han sido liberadas." -ForegroundColor Green
            break
        }
        foreach ($line in $eniLines) {
            $parts = $line.Trim() -split '\s+'
            $eId = $parts[0]
            $eStat = $parts[1]
            if ($eStat -eq "available") {
                aws ec2 delete-network-interface --network-interface-id $eId 2>$null | Out-Null
            }
        }
        Write-Host "  -> Quedan $($eniLines.Count) interfaz(ces) liberándose en AWS. Esperando 10s..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds 10
        $eniTimeout--
    }

    # D. Desasociar y eliminar Route Tables personalizadas ANTES de borrar Subredes e IGW
    Write-Host "  -> Desasociando y eliminando Route Tables (portal_rt_pub, portal_rt_priv_a, portal_rt_priv_b)..." -ForegroundColor Cyan
    $AllRouteTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VpcId" --query "RouteTables[*].RouteTableId" --output text 2>$null
    $MainRouteTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VpcId" "Name=association.main,Values=true" --query "RouteTables[*].RouteTableId" --output text 2>$null
    $MainRtArray = @($MainRouteTables -split '\s+' | Where-Object { $_ -match '^rtb-' })
    $AllRtArray = @($AllRouteTables -split '\s+' | Where-Object { $_ -match '^rtb-' })

    foreach ($rt in $AllRtArray) {
        if ($MainRtArray -notcontains $rt) {
            $rtAssocs = aws ec2 describe-route-tables --route-table-ids $rt --query "RouteTables[0].Associations[*].RouteTableAssociationId" --output text 2>$null
            foreach ($assoc in ($rtAssocs -split '\s+' | Where-Object { $_ -match '^rtbassoc-' })) {
                aws ec2 disassociate-route-table --association-id $assoc 2>$null | Out-Null
            }
            aws ec2 delete-route-table --route-table-id $rt 2>$null | Out-Null
        }
    }

    # E. Romper Dependencias Circulares en los 5 Security Groups (sg_alb_ext, sg_front, sg_alb_int, sg_back, sg_data) y eliminarlos
    Write-Host "  -> Revocando reglas entre Security Groups (3 capas) y eliminándolos..." -ForegroundColor Cyan
    $SgIds = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
    if ($SgIds -and $SgIds -ne "None" -and $SgIds.Trim() -ne "") {
        foreach ($sg in ($SgIds -split '\s+' | Where-Object { $_ -match '^sg-' })) {
            $inboundRules = aws ec2 describe-security-group-rules --filters "Name=group-id,Values=$sg" --query "SecurityGroupRules[?!IsEgress].SecurityGroupRuleId" --output text 2>$null
            $inList = @($inboundRules -split '\s+' | Where-Object { $_ -match '^sgr-' })
            if ($inList.Count -gt 0) {
                aws ec2 revoke-security-group-ingress --group-id $sg --security-group-rule-ids $inList 2>$null | Out-Null
            }

            $outboundRules = aws ec2 describe-security-group-rules --filters "Name=group-id,Values=$sg" --query "SecurityGroupRules[?IsEgress].SecurityGroupRuleId" --output text 2>$null
            $outList = @($outboundRules -split '\s+' | Where-Object { $_ -match '^sgr-' })
            if ($outList.Count -gt 0) {
                aws ec2 revoke-security-group-egress --group-id $sg --security-group-rule-ids $outList 2>$null | Out-Null
            }
        }

        $retrySg = 0
        while ($retrySg -lt 10) {
            $remainingSgs = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
            $remSgArray = @($remainingSgs -split '\s+' | Where-Object { $_ -match '^sg-' })
            if ($remSgArray.Count -eq 0) {
                Write-Host "  -> Todos los Security Groups personalizados eliminados." -ForegroundColor Green
                break
            }
            foreach ($sg in $remSgArray) {
                aws ec2 delete-security-group --group-id $sg 2>$null | Out-Null
            }
            Start-Sleep -Seconds 4
            $retrySg++
        }
    }

    # F. Eliminar las 6 Subredes (portal_sub_front_a/b, portal_sub_back_a/b, portal_sub_data_a/b)
    Write-Host "  -> Eliminando las 6 Subredes Multi-AZ..." -ForegroundColor Cyan
    $retrySub = 0
    while ($retrySub -lt 10) {
        $remainingSubs = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[*].SubnetId" --output text 2>$null
        $subArray = @($remainingSubs -split '\s+' | Where-Object { $_ -match '^subnet-' })
        if ($subArray.Count -eq 0) {
            Write-Host "  -> Todas las subredes eliminadas." -ForegroundColor Green
            break
        }
        foreach ($sub in $subArray) {
            aws ec2 delete-subnet --subnet-id $sub 2>$null | Out-Null
        }
        Start-Sleep -Seconds 4
        $retrySub++
    }

    # G. Desasociar y eliminar Internet Gateway (portal_igw)
    $IgwIds = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VpcId" --query "InternetGateways[*].InternetGatewayId" --output text 2>$null
    if ($IgwIds -and $IgwIds -ne "None" -and $IgwIds.Trim() -ne "") {
        foreach ($igw in ($IgwIds -split '\s+' | Where-Object { $_ -match '^igw-' })) {
            Write-Host "  -> Desasociando y eliminando Internet Gateway: $igw..." -ForegroundColor Cyan
            $retryIgw = 0
            while ($retryIgw -lt 6) {
                aws ec2 detach-internet-gateway --vpc-id $VpcId --internet-gateway-id $igw 2>$null | Out-Null
                aws ec2 delete-internet-gateway --internet-gateway-id $igw 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) { break }
                Start-Sleep -Seconds 4
                $retryIgw++
            }
        }
    }

    # H. Eliminar VPC (portal_vpc)
    Write-Host "  -> Eliminando VPC: $VpcId..." -ForegroundColor Cyan
    $retryVpc = 0
    while ($retryVpc -lt 10) {
        aws ec2 delete-vpc --vpc-id $VpcId 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  -> VPC $VpcId eliminada completamente." -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 5
        $retryVpc++
    }
}

# Limpiar cualquier Internet Gateway huérfano con tag portal_igw
$OrphanIgws = aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=portal_igw" --query "InternetGateways[*].InternetGatewayId" --output text 2>$null
foreach ($oIgw in ($OrphanIgws -split '\s+' | Where-Object { $_ -match '^igw-' })) {
    aws ec2 delete-internet-gateway --internet-gateway-id $oIgw 2>$null | Out-Null
}

# 8. Fase 7: Eliminar Buckets de S3 (portal-cvs, portal-avatars, portal-deliverables)
Write-Host "`n[Fase 7: Almacenamiento S3] Eliminando Buckets de S3..." -ForegroundColor Yellow
$BucketsToRemove = @()
if ($AccountId) {
    $BucketsToRemove += @("portal-cvs-$AccountId", "portal-avatars-$AccountId", "portal-deliverables-$AccountId", "portal-front-$AccountId")
}
$AllPortalBuckets = aws s3api list-buckets --query "Buckets[?starts_with(Name, 'portal-')].Name" --output text 2>$null
foreach ($b in ($AllPortalBuckets -split '\s+' | Where-Object { $_ -ne "" })) {
    if ($BucketsToRemove -notcontains $b) { $BucketsToRemove += $b }
}

foreach ($bucket in $BucketsToRemove) {
    $bucketCheck = aws s3api head-bucket --bucket $bucket 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  -> Vaciando y eliminando bucket S3: $bucket..." -ForegroundColor Cyan
        aws s3api delete-bucket-policy --bucket $bucket 2>$null | Out-Null
        aws s3api delete-bucket-website --bucket $bucket 2>$null | Out-Null
        aws s3 rb "s3://$bucket" --force 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            aws s3 rm "s3://$bucket" --recursive 2>$null | Out-Null
            aws s3 rb "s3://$bucket" --force 2>$null | Out-Null
        }
        Write-Host "  -> Bucket $bucket eliminado con éxito." -ForegroundColor Green
    }
}

# 8. Barrido final de IPs Elásticas y archivos temporales locales (lt_back.json, lt_front.json, etc.)
Release-ElasticIPs

Get-ChildItem -Path $PSScriptRoot -Filter "lt_*.json" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PSScriptRoot -Filter "task_*.json" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PSScriptRoot -Filter "policy_*.json" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PSScriptRoot -Filter "bucket_policy_*.json" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PSScriptRoot -Filter "cf_*.json" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $PSScriptRoot -Filter "test_live_out.txt" | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "¡Destrucción Arquitectura 1 Finalizada al 100%!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=======================================================" -ForegroundColor Cyan
