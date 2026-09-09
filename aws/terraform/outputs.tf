output "alb_dns_name" {
  description = "DNS del Balanceador de Carga. Usar esta URL para acceder a la aplicación."
  value       = aws_lb.main_alb.dns_name
}

output "db_private_ip" {
  description = "IP privada de la instancia de Base de Datos"
  value       = aws_instance.db_instance.private_ip
}
