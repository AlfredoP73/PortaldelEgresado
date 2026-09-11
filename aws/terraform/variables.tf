variable "aws_region" {
  description = "Región de AWS"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  default     = "t3.medium"
}

variable "ami_id" {
  description = "ID de la AMI de Ubuntu 22.04 LTS (us-east-1)"
  default     = "ami-0c7217cdde317cfec" 
}

variable "key_name" {
  description = "Nombre del par de llaves SSH (creado previamente)"
  type        = string
  default     = "portal_egresado_key"
}
