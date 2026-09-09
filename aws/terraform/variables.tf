variable "aws_region" {
  description = "Región de AWS"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  default     = "t3.micro"
}

variable "ami_id" {
  description = "ID de la AMI de Ubuntu 22.04 LTS (us-east-1)"
  default     = "ami-0c7217cdde317cfec" # Cambiar si es necesario según la región
}

variable "docker_user" {
  description = "Usuario de Docker Hub para descargar las imágenes"
  default     = "alfredojose"
}

variable "github_user" {
  description = "Usuario de GitHub del proyecto"
  default     = "AlfredoP73"
}

variable "github_repo" {
  description = "Nombre del repositorio en GitHub"
  default     = "PortaldelEgresado"
}
