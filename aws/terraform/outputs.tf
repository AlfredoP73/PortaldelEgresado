output "public_ip" {
  description = "Dirección IP pública del servidor"
  value       = aws_instance.main_server.public_ip
}

output "public_dns" {
  description = "DNS público del servidor para acceder a la aplicación"
  value       = aws_instance.main_server.public_dns
}
