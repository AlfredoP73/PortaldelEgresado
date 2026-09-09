# Despliegue en AWS con Terraform y Docker

Este proyecto incluye la configuración para desplegar toda la arquitectura (Backend multicapa, Frontend y Base de Datos) de forma automatizada en AWS utilizando Terraform y Docker.

## Arquitectura

- **VPC & Subnets:** 1 VPC con 2 subredes públicas en `us-east-1a` y `us-east-1b`.
- **Application Load Balancer (ALB):** Un único balanceador de carga público que distribuye el tráfico:
  - Rutas `/api/*` -> Auto Scaling Group del Backend (puerto 8000).
  - Rutas `/*` -> Auto Scaling Group del Frontend (puerto 80).
- **Instancia Base de Datos (t3.micro):** Instancia fija con una Elastic IP privada que ejecuta `postgres` y `minio` vía Docker Compose.
- **Auto Scaling Groups (t3.micro):**
  - **Backend:** 1 a 2 instancias. Se conecta a la BD usando la IP privada inyectada por Terraform en el `user_data`.
  - **Frontend:** 1 a 2 instancias.

## Optimizaciones de Costo ($50 USD de presupuesto)
1. **Un solo ALB:** Compartir el balanceador reduce los costos fijos de ~$20 USD por ALB extra a solo 1.
2. **t3.micro:** Las instancias usadas entran en la capa gratuita o son sumamente económicas ($0.0104/hora).
3. **Terraform Destroy:** La mayor ventaja. Cuando no estés presentando el proyecto, apaga todo para ahorrar.

---

## Instrucciones de Despliegue

### Requisitos Previos
1. Instalar [Terraform](https://developer.hashicorp.com/terraform/downloads).
2. Instalar y configurar [AWS CLI](https://aws.amazon.com/es/cli/) (`aws configure` con tus Access Keys).
3. Tener las imágenes de Docker subidas a Docker Hub (`alfredojose/portal_auth`, etc.).

### Paso 1: Configurar Variables (Opcional)
Puedes modificar el archivo `aws/terraform/variables.tf` si necesitas cambiar la región o el nombre de usuario de Docker.

### Paso 2: Desplegar la Infraestructura

Abre una terminal en la carpeta `aws/terraform` y ejecuta:

```bash
# Inicializar Terraform
terraform init

# Ver los cambios que se van a aplicar
terraform plan

# Crear toda la infraestructura en AWS (te pedirá confirmación, escribe "yes")
terraform apply
```

### Paso 3: Acceder a la Aplicación
Una vez termine (puede tardar de 3 a 5 minutos), Terraform imprimirá en la consola una URL similar a esta:
`alb_dns_name = main-alb-123456789.us-east-1.elb.amazonaws.com`

Esa URL es tu punto de entrada. Si la abres en el navegador, verás el frontend. Si le agregas `/api/auth/login`, accederás al backend.

### Paso 4: ¡APAGAR TODO! (Muy Importante)
Para que tus $50 USD de crédito te duren todo el semestre, **SIEMPRE** apaga la arquitectura cuando termines de hacer pruebas o de presentarla.

```bash
# Destruir toda la infraestructura y dejar de cobrar
terraform destroy
```

Esto borrará las máquinas y el balanceador. La próxima vez que necesites presentar, solo corres `terraform apply` de nuevo.
