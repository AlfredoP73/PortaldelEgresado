$imagesToPush = @{
    "portaldelegresado-auth:latest" = "root73/portaldelegresado-auth:latest"
    "portaldelegresado-companies:latest" = "root73/portaldelegresado-companies:latest"
    "portaldelegresado-dashboard:latest" = "root73/portaldelegresado-dashboard:latest"
    "portaldelegresado-frontend:latest" = "root73/portaldelegresado-frontend:latest"
    "portaldelegresado-graduates:latest" = "root73/portaldelegresado-graduates:latest"
    "portaldelegresado-matchmaking:latest" = "root73/portaldelegresado-matchmaking:latest"
    "grafana/grafana-oss:latest" = "root73/grafana-oss:latest"
    "grafana/loki:2.8.2" = "root73/loki:2.8.2"
    "grafana/promtail:2.8.2" = "root73/promtail:2.8.2"
    "minio/minio:latest" = "root73/minio:latest"
    "nginx:alpine" = "root73/nginx:alpine"
    "postgres:15-alpine" = "root73/postgres:15-alpine"
    "rabbitmq:3-management-alpine" = "root73/rabbitmq:3-management-alpine"
}

foreach ($key in $imagesToPush.Keys) {
    $localName = $key
    $remoteName = $imagesToPush[$key]
    Write-Host "Tagging $localName as $remoteName..."
    docker tag $localName $remoteName
    
    Write-Host "Pushing $remoteName..."
    docker push $remoteName
}
Write-Host "Done!"
