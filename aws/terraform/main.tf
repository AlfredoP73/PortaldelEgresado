provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Proyecto      = "lab-cloud-2026-gL"
      Responsable   = "alfredo.perez"
      Ambiente      = "prod"
      CentroDeCosto = "cloud-computing-2026"
      Expiracion    = "2026-12-31"
    }
  }
}

# --- VPC y Red (Por defecto según la rúbrica) ---
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "availability-zone"
    values = ["${var.aws_region}a"]
  }
}

# --- Security Group de Mínimo Privilegio ---
resource "aws_security_group" "instance_sg" {
  name        = "portal-egresado-sg"
  description = "Grupo de seguridad con minimo privilegio para el servidor principal"
  vpc_id      = data.aws_vpc.default.id

  # Acceso Administrativo
  ingress {
    description = "SSH para administracion manual"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Tráfico web
  ingress {
    description = "Acceso HTTP publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Acceso HTTPS publico"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Salida libre"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- Única Instancia EC2 (Aplicación y Base de Datos) ---
resource "aws_instance" "main_server" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids      = [aws_security_group.instance_sg.id]
  associate_public_ip_address = true
  key_name                    = var.key_name

  # Almacenamiento Cifrado y Dimensionado
  root_block_device {
    volume_type = "gp3"
    volume_size = 35
    encrypted   = true
  }

  # Script de automatización de instalación
  user_data = file("${path.module}/../../install_app.sh")

  tags = {
    Name = "PortalEgresado-Server"
  }
}
