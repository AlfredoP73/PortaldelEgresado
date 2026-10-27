# EXPEDIENTE TÉCNICO DE EXTRACCIÓN: PORTAL DEL EGRESADO (UPC)
**Proyecto de Infraestructura en la Nube y Microservicios en AWS**  
**Institución:** Universidad Popular del Cesar (UPC)  
**Asignatura:** Cloud Computing (Segundo Corte Evaluativo)  
**Fecha de Generación:** 24 de Octubre de 2026  
**Clasificación de Hallazgos:** [VERIFICADO] | [INFERIDO] | [NO VERIFICADO] | [NO DISPONIBLE]  

---

## 1. IDENTIFICACIÓN Y DESCRIPCIÓN DEL PROYECTO

### 1.1. Información General y Propósito
* **Nombre de la Aplicación:** Portal del Egresado UPC. `[VERIFICADO: backend/init.sql, mobile_app/pubspec.yaml, frontend/package.json]`
* **Propósito:** Plataforma integral para la intermediación laboral, seguimiento ocupacional, gestión de egresados y vinculación empresarial de la Universidad Popular del Cesar. Permite conectar egresados de diversas facultades y programas académicos con ofertas de empleo de empresas aliadas mediante un motor de afinidad algorítmica (matchmaking), ofreciendo herramientas de gestión curricular, analítica directiva y canal de mensajería/notificaciones. `[VERIFICADO: backend/app/matchmaking/services/matching_service.py, backend/init.sql]`
* **Organización / Cliente:** Universidad Popular del Cesar (UPC). Restringe el registro de egresados al dominio de correo institucional `@unicesar.edu.co`. `[VERIFICADO: mobile_app/lib/features/auth/presentation/register_screen.dart:40, mobile_app/test/widget_test.dart:40]`
* **Repositorio Remoto Oficial:** `https://github.com/AlfredoP73/PortaldelEgresado.git` (Rama principal de trabajo: `main`). `[VERIFICADO: git remote -v, install_app.sh:35-37]`
* **Cuenta / Alumno Responsable:** Alfredo Pérez (`AlfredoP73`). Cuenta AWS Learner Lab: `980217706718`. `[VERIFICADO: aws/terraform/main.tf:7, transcript step 517, transcript step 3540]`

### 1.2. Actores y Roles del Sistema
El sistema implementa control de acceso basado en roles (RBAC) gestionado en la tabla `roles` y `users` de la base de datos `auth_db`: `[VERIFICADO: backend/init.sql:15-30]`
1. **Egresado (`ROLE_GRADUATE` / Módulo 1):** Acceso a perfil curricular, carga de hoja de vida (PDF), subida de foto de perfil (avatar), historial de postulaciones, visualización de porcentaje de afinidad con ofertas laborales, estado de disponibilidad laboral (`open_to_work`, etc.), mentorías y directorio. `[VERIFICADO: backend/app/graduates/schemas.py]`
2. **Empresa Aliada (`ROLE_COMPANY` / Módulo 2):** Registro de perfil corporativo, publicación y gestión de ofertas laborales (vacantes), definición de requisitos de habilidades y experiencia mínima, visualización y gestión de postulantes mediante tablero Kanban / fases de selección, consulta de afinidad calculada por el motor. `[VERIFICADO: backend/app/companies/controllers/job_offer_controller.py]`
3. **Administrador UPC (`ROLE_ADMIN` / Módulo 4 - Dashboard):** Visualización de analítica BI institucional, tasas de empleabilidad por facultad y programa, salarios promedios del mercado, distribución geográfica, gestión de usuarios, auditoría de eventos (`audit_logs`) y configuración de ponderaciones de matchmaking. `[VERIFICADO: backend/app/dashboard/controllers/dashboard_controller.py]`

### 1.3. Módulos y Arquitectura Lógica de la Aplicación
La solución está estructurada como un sistema desacoplado compuesto por tres capas principales:
* **Capa de Presentación Web (SPA):** Interfaz web moderna desarrollada en React 19 con Vite y TailwindCSS, consumiendo la API REST del backend mediante Axios. `[VERIFICADO: frontend/package.json]`
* **Capa Móvil Nativa Multiplataforma:** Aplicación móvil en Flutter 3 / Dart orientada principalmente a egresados para consulta de empleo, alertas y perfil profesional. `[VERIFICADO: mobile_app/pubspec.yaml]`
* **Capa de Servicios de Negocio (Backend Microservicios):** Arquitectura de 5 microservicios independientes construidos con FastAPI (Python 3.11):
  1. `auth` (Puerto interno 8000): Autenticación JWT, gestión de identidades, restablecimiento de contraseña vía SMTP, control de roles y registro de auditoría.
  2. `graduates` (Puerto interno 8000 / Prefijo `/api/modulo1`): Gestión de perfil del egresado, experiencia, historial académico, certificaciones, encuestas y carga de documentos PDF/imágenes a S3.
  3. `companies` (Puerto interno 8000 / Prefijo `/api/modulo2`): Gestión de empresas, vacantes de empleo, eventos institucionales y pipeline de postulaciones.
  4. `matchmaking` (Puerto interno 8000 / Prefijo `/api/matching`): Algoritmo ponderado de afinidad laboral, comunicación por WebSockets y consumo de eventos asíncronos vía RabbitMQ.
  5. `dashboard` (Puerto interno 8000 / Prefijo `/api/dashboard`): Agregación de métricas de negocio, indicadores de empleabilidad y reportes para administración.
* **Capa de Datos y Persistencia:** PostgreSQL 15 estructurado en 4 bases de datos lógicas independientes (`auth_db`, `graduates_db`, `companies_db`, `matchmaking_db`), RabbitMQ para mensajería asíncrona, y Amazon S3 para almacenamiento de objetos no estructurados (CVs, Avatares, Entregables y Sitio Web estático). `[VERIFICADO: docker-compose.back.yml, backend/init.sql, aws/deploy_s3.ps1]`

---

## 2. TECNOLOGÍAS Y VERSIONES

### 2.1. Backend y Microservicios
| Componente / Dependencia | Versión Identificada | Propósito Técnico | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | 3.11 (`python:3.11-slim`) | Entorno de ejecución en contenedores | `backend/app/*/Dockerfile:1` | **VERIFICADO** |
| **FastAPI** | 0.104.1 | Framework REST para los 5 microservicios | `backend/app/auth/requirements.txt:1` | **VERIFICADO** |
| **Uvicorn** | 0.24.0.post1 | Servidor web ASGI de producción | `backend/app/auth/requirements.txt:2` | **VERIFICADO** |
| **SQLAlchemy** | 2.0.23 | ORM para mapeo objeto-relacional | `backend/app/auth/requirements.txt:3` | **VERIFICADO** |
| **psycopg2-binary** | 2.9.9 | Adaptador de base de datos PostgreSQL | `backend/app/auth/requirements.txt:4` | **VERIFICADO** |
| **Pydantic / Settings** | 2.5.2 / 2.1.0 | Validación de datos y parseo de schemas | `backend/app/auth/requirements.txt:5-6` | **VERIFICADO** |
| **python-jose [cryptography]**| 3.3.0 | Codificación/decodificación de tokens JWT (HS256) | `backend/app/auth/requirements.txt:8` | **VERIFICADO** |
| **Passlib / Bcrypt** | 1.7.4 / 4.0.1 | Hashing y verificación de contraseñas | `backend/app/auth/requirements.txt:9-10` | **VERIFICADO** |
| **Boto3** | 1.34.69 / latest | SDK de AWS para operaciones en S3 | `backend/app/graduates/requirements.txt:13` | **VERIFICADO** |
| **Pika** | 1.3.2 | Cliente AMQP para comunicación con RabbitMQ | `backend/app/matchmaking/requirements.txt:14` | **VERIFICADO** |
| **Websockets** | 12.0 | Protocolo bidireccional en tiempo real | `backend/app/matchmaking/requirements.txt:17` | **VERIFICADO** |
| **Httpx** | 0.26.0 | Cliente HTTP asíncrono para llamadas entre microservicios | `backend/app/matchmaking/requirements.txt:13` | **VERIFICADO** |
| **Circuitbreaker** | 2.0.0 | Patrón de resiliencia ante caídas de servicios | `backend/app/auth/requirements.txt:15` | **VERIFICADO** |
| **PyPDF / PDFPlumber** | 4.2.0 / 0.11.0 | Extracción y procesamiento de texto en CVs PDF | `backend/app/graduates/requirements.txt:18-19` | **VERIFICADO** |
| **Firebase Admin** | >= 6.4.0 | Notificaciones push a dispositivos móviles | `backend/app/auth/requirements.txt:17` | **VERIFICADO** |
| **Pytest** | No fijada en reqs | Suite de pruebas unitarias | `backend/tests/test_matching.py:1` | **VERIFICADO** |

### 2.2. Frontend Web
| Componente / Dependencia | Versión Identificada | Propósito Técnico | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js (Build)** | 20 (`node:20-alpine`) | Entorno para compilación de assets | `frontend/Dockerfile.prod:2` | **VERIFICADO** |
| **React / React DOM** | 19.2.8 | Biblioteca de interfaz de usuario | `frontend/package.json:23-24` | **VERIFICADO** |
| **Vite** | 8.2.0 | Build tool y empaquetador de la SPA | `frontend/package.json:43` | **VERIFICADO** |
| **TypeScript** | ~6.0.2 | Tipado estático del frontend | `frontend/package.json:42` | **VERIFICADO** |
| **TailwindCSS** | 4.3.3 | Framework de estilos CSS utilitarios | `frontend/package.json:41` | **VERIFICADO** |
| **React Router DOM** | 7.18.2 | Enrutamiento cliente para Single Page App | `frontend/package.json:28` | **VERIFICADO** |
| **Axios** | 1.19.0 | Cliente HTTP para consumo del ALB Backend | `frontend/package.json:17` | **VERIFICADO** |
| **Recharts** | 3.10.1 | Visualización de datos y gráficos analíticos | `frontend/package.json:29` | **VERIFICADO** |
| **Framer Motion** | 13.1.0 | Animaciones de componentes UI | `frontend/package.json:20` | **VERIFICADO** |
| **Lucide React** | 1.31.0 | Set de iconografía vectorial | `frontend/package.json:22` | **VERIFICADO** |
| **React Hot Toast** | 2.6.0 | Notificaciones tipo toast en UI | `frontend/package.json:25` | **VERIFICADO** |
| **@react-pdf/renderer** | 4.9.0 | Generación dinámica de reportes PDF | `frontend/package.json:15` | **VERIFICADO** |
| **Xlsx** | 0.18.5 | Exportación de datos analíticos a Excel | `frontend/package.json:31` | **VERIFICADO** |

### 2.3. Aplicación Móvil
| Componente / Dependencia | Versión Identificada | Propósito Técnico | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Flutter SDK** | 3.47.1 (Channel stable) | Framework multiplataforma de UI | `mobile_app/pubspec.yaml` / CLI | **VERIFICADO** |
| **Dart SDK** | 3.13.1 (Constraint `^3.13.1`) | Lenguaje de programación base | `mobile_app/pubspec.yaml:8` | **VERIFICADO** |
| **Dio** | ^5.4.0 | Cliente HTTP con interceptores de tokens | `mobile_app/pubspec.yaml:14` | **VERIFICADO** |
| **Flutter Riverpod / Provider** | ^2.4.9 / ^6.1.5+1 | Inyección de dependencias y estado reactivo | `mobile_app/pubspec.yaml:15,22` | **VERIFICADO** |
| **fl_chart** | ^0.70.2 | Gráficos circulares, barras y radar en dashboard móvil | `mobile_app/pubspec.yaml:19` | **VERIFICADO** |
| **Shared Preferences** | ^2.5.5 | Caché local de sesión y datos de perfil de usuario | `mobile_app/pubspec.yaml:18` | **VERIFICADO** |
| **JWT Decoder** | ^2.0.1 | Inspección de claims y expiración de tokens JWT | `mobile_app/pubspec.yaml:23` | **VERIFICADO** |
| **Web Socket Channel** | ^3.0.3 | Comunicación en tiempo real para matchmaking | `mobile_app/pubspec.yaml:27` | **VERIFICADO** |
| **Firebase Core / Messaging** | ^5.0.0 / ^17.0.0 | Servicios de mensajería y push notifications | `mobile_app/pubspec.yaml:28-29` | **VERIFICADO** |

### 2.4. Infraestructura, DevOps y Servicios Base
| Servicio / Herramienta | Versión / Imagen | Función en el Despliegue | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx** | `nginx:alpine` | Reverse proxy gateway (local/EC2) y servidor estático | `nginx/nginx.conf`, `docker-compose.back.yml:114` | **VERIFICADO** |
| **PostgreSQL** | 15 (`postgres:15-alpine` / RDS) | Motor de base de datos relacional principal | `docker-compose.data.yml:5`, `aws/deploy_s3.ps1:166` | **VERIFICADO** |
| **RabbitMQ** | `rabbitmq:3-management-alpine` | Broker de mensajes AMQP para colas de eventos | `docker-compose.data.yml:24`, `aws/deploy_s3.ps1:215` | **VERIFICADO** |
| **Grafana Loki** | `grafana/loki:2.8.2` | Agregador centralizado de logs de contenedores | `docker-compose.data.yml:40`, `aws/deploy_s3.ps1:219` | **VERIFICADO** |
| **Promtail** | `grafana/promtail:2.8.2` | Agente recolector de logs de Docker | `docker-compose.data.yml:51` | **VERIFICADO** |
| **Grafana** | `grafana/grafana-oss:latest` | Panel de visualización de logs y métricas | `docker-compose.data.yml:63` | **VERIFICADO** |
| **Docker Compose** | Spec 3.8 / v2 CLI | Orquestación local y en servidor EC2 Builder | `docker-compose.back.yml:1` | **VERIFICADO** |
| **Docker Buildx** | v0.17.1 | Plugin de compilación de imágenes Docker en EC2 | `install_app.sh:26` | **VERIFICADO** |
| **Amazon Linux** | 2023 (AMI AL2023 Kernel 6.1) | Sistema operativo de las instancias EC2 | `aws/deploy_s3.ps1:191`, `install_app.sh:6` | **VERIFICADO** |
| **Terraform** | >= 1.0 (HashiCorp AWS Provider) | Herramienta de IaC utilizada en fase inicial | `aws/terraform/main.tf:1` | **VERIFICADO** |
| **AWS CLI** | v2 | Automatización y despliegue por scripts PowerShell | `aws/deploy_s3.ps1:30` | **VERIFICADO** |

---

## 3. ESTRUCTURA DEL REPOSITORIO

```
PortaldelEgresado/
├── .env.example                          <- Plantilla base de variables de entorno para las 3 capas
├── .gitignore                            <- Reglas de exclusión Git (.env, *.pem, credentials.ps1, dist/)
├── build_and_push.sh                     <- Script Bash para compilación y push de imágenes
├── docker-compose.back.yml               <- Orquestación local/EC2 de los 5 microservicios + Nginx + RabbitMQ
├── docker-compose.data.yml               <- Orquestación local/EC2 de PostgreSQL, RabbitMQ, Loki, Promtail, Grafana
├── docker-compose.front.yml              <- Orquestación del contenedor frontend en Nginx
├── install_app.sh                        <- Script de automatización User Data para Amazon Linux 2023
│
├── aws/                                  <- Scripts de infraestructura y aprovisionamiento AWS
│   ├── credentials.ps1                   <- Inyección de credenciales temporales de AWS Learner Lab (ignorado por git)
│   ├── deploy.ps1                        <- Script maestro de Arquitectura 1 (IaaS: 2 ASG EC2 + 2 ALBs + RDS)
│   ├── destroy.ps1                       <- Script de desmontaje completo de Arquitectura 1
│   ├── deploy_s3.ps1                     <- Script maestro de Arquitectura 2 (Esquema B: S3 + ECS Fargate + RDS)
│   ├── destroy_s3.ps1                    <- Script de desmontaje completo y seguro de Arquitectura 2
│   ├── portal_egresado_key.pem           <- Llave SSH privada generada para acceso a EC2
│   ├── plantillas_base/                  <- Plantillas base de referencia histórica de despliegues
│   └── terraform/                        <- Implementación inicial con IaC (Monolito EC2 único de Corte 1)
│       ├── main.tf                       <- Recursos Terraform: VPC default, Security Group, EC2 main_server
│       ├── variables.tf                  <- Variables de región, instancia t3.medium y AMI
│       ├── outputs.tf                    <- Salidas de IPs públicas y DNS
│       └── terraform.tfstate             <- Estado persistido del despliegue en Terraform
│
├── backend/                              <- Núcleo del Backend en microservicios FastAPI
│   ├── init.sql                          <- Script DDL con creación de las 4 bases de datos y más de 30 tablas
│   ├── requirements.txt                  <- Archivo de dependencias genéricas
│   ├── tests/
│   │   └── test_matching.py              <- Suite de pruebas unitarias Pytest para el algoritmo de afinidad
│   ├── uploads/
│   │   └── cvs/                          <- Directorio temporal de almacenamiento de archivos locales
│   └── app/
│       ├── database.py                   <- Patrón Singleton para conexión SQLAlchemy a PostgreSQL
│       ├── auth/                         <- Microservicio 1: Autenticación, JWT, Usuarios, Roles y Notificaciones
│       │   ├── Dockerfile                <- Configuración Docker basada en python:3.11-slim
│       │   ├── requirements.txt          <- Dependencias específicas del servicio de autenticación
│       │   ├── main.py                   <- Punto de entrada FastAPI y definición de routers
│       │   └── controllers/              <- Controladores de login, registro, privacidad, usuarios
│       ├── graduates/                    <- Microservicio 2: Perfil Egresado (Módulo 1)
│       │   ├── Dockerfile
│       │   ├── requirements.txt          <- Incluye pypdf, pdfplumber y boto3
│       │   ├── main.py
│       │   ├── schemas.py                <- Schemas Pydantic (GraduateBase, Graduate, GraduateUpdate)
│       │   └── controllers/              <- Controladores de perfil, educación, experiencia, CV, fotos
│       ├── companies/                    <- Microservicio 3: Empresas y Vacantes (Módulo 2)
│       │   ├── Dockerfile
│       │   ├── requirements.txt
│       │   ├── main.py
│       │   └── controllers/              <- Controladores de empresas, ofertas, postulaciones, eventos
│       ├── matchmaking/                  <- Microservicio 4: Motor de Afinidad Laboral (Módulo 3)
│       │   ├── Dockerfile
│       │   ├── requirements.txt          <- Incluye websockets, pika, httpx
│       │   ├── main.py
│       │   ├── services/                 <- Implementación matemática de afinidad Jaccard y ponderaciones
│       │   └── controllers/              <- Controladores de cálculo, criterios, WebSockets y notificaciones
│       └── dashboard/                    <- Microservicio 5: Dashboard y Analítica BI (Módulo 4)
│           ├── Dockerfile
│           ├── requirements.txt
│           ├── main.py
│           ├── schemas.py                <- Schemas de métricas, radar de habilidades, salarios de mercado
│           └── controllers/              <- Controladores de analítica administrativa y directiva
│
├── frontend/                             <- Interfaz Web en React 19 + TypeScript + Vite
│   ├── Dockerfile                        <- Dockerfile de desarrollo
│   ├── Dockerfile.prod                   <- Dockerfile multi-stage (Node 20 build -> Nginx Alpine)
│   ├── package.json                      <- Dependencias npm y scripts (dev, build, preview)
│   ├── vite.config.ts                    <- Configuración de Vite con plugins y aliases
│   ├── .env.production                   <- Variables apuntando al DNS del ALB generado dinámicamente
│   ├── public/                           <- Assets estáticos (logos institucionales)
│   └── src/
│       ├── App.tsx                       <- Enrutamiento principal de la aplicación y proveedores de contexto
│       ├── main.tsx                      <- Punto de montaje React DOM
│       ├── api/                          <- Clientes Axios con interceptores de autorización
│       ├── components/                   <- Componentes UI reutilizables (botones, modales, tablas, layout)
│       ├── context/                      <- Contextos de autenticación y sesión de usuario
│       ├── features/                     <- Módulos visuales (egresados, vacantes, dashboard, analítica)
│       └── pages/                        <- Vistas de la aplicación SPA
│
├── mobile_app/                           <- Aplicación Móvil en Flutter / Dart
│   ├── pubspec.yaml                      <- Configuración del proyecto Flutter y dependencias
│   ├── .env                              <- Variables de entorno apuntando al ALB de AWS
│   ├── test/
│   │   └── widget_test.dart              <- Pruebas de widgets (Smoke test de login y validación UPC)
│   └── lib/
│       ├── main.dart                     <- Punto de inicio Flutter y configuración de temas/rutas
│       ├── core/                         <- Utilidades centrales, temas y cliente de red (api_client.dart)
│       └── features/                     <- Pantallas de autenticación, perfil, vacantes, dashboard
│
└── nginx/                                <- Configuración del Gateway de Nginx
    ├── Dockerfile                        <- Imagen Nginx para contenedor en EC2/local
    ├── nginx.conf                        <- Enrutamiento inverso por rutas hacia los 5 microservicios
    └── loading.html                      <- Página HTML servida ante caídas temporales o errores 502
```
`[VERIFICADO: Inspección directa del sistema de archivos]`

---

## 4. HISTORIAL TÉCNICO DEL DESARROLLO

A partir de la inspección del registro de control de versiones Git (`git log`) y del historial de trabajo, se reconstruye la evolución técnica del proyecto: `[VERIFICADO: git log, transcript.jsonl]`

| Hito / Fase | Commits / Referencias | Descripción Técnica de lo Realizado | Herramientas / Archivos | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1: Módulo 2 - Empresas** | `3149622`, `69fb952`, `e366ac0`, PR #1 (`ModsJavier`) | Implementación de las entidades de empresas, sectores, ciudades y publicación de ofertas de empleo. Definición de requerimientos por vacante. | FastAPI, PostgreSQL, `backend/app/companies/` | **VERIFICADO** |
| **Fase 2: Módulo Autenticación y UI Inicial** | `b8b180c`, `37cb242`, `58f2cff`, `75a6b70` | Creación del microservicio de autenticación con JWT, hashing Bcrypt de contraseñas, vistas de login en React y protección de rutas. | React, Vite, FastAPI, `backend/app/auth/` | **VERIFICADO** |
| **Fase 3: Módulo 1 - Egresados** | `4c3c5fc`, PR #2, PR #3 (`ModsAlfre`) | Implementación del módulo de egresados: datos personales, historial académico, experiencia laboral, habilidades y carga de CVs en PDF. | FastAPI, PyPDF, `backend/app/graduates/` | **VERIFICADO** |
| **Fase 4: Módulo 4 - Dashboard y Analítica** | `74f3538`, `e32c226`, PR #4 (`ModsJose`), `b0c9d78` | Desarrollo del servicio de dashboard y BI: consultas agregadas de egresados por programa, salarios de mercado y métricas de empleabilidad. | FastAPI, Recharts, `backend/app/dashboard/` | **VERIFICADO** |
| **Fase 5: Módulo 3 - Matchmaking** | `42f417e`, PR #5 (`ModsAlfre`), PR #8 (`ModsJhon`) | Desarrollo del motor de cálculo de afinidad laboral (similitud de Jaccard en habilidades, años de experiencia, programa UPC y encuesta). Integración con WebSockets. | FastAPI, WebSockets, `backend/app/matchmaking/` | **VERIFICADO** |
| **Fase 6: Triggers y Resiliencia** | `0ea729c`, `80c7dd9` | Implementación de Circuit Breaker (`circuitbreaker==2.0.0`) y eliminación de cascada de errores 500 ante caídas de microservicios. Transformación de pantalla de mantenimiento en monitor de estado en vivo. | Python, FastAPI, React | **VERIFICADO** |
| **Fase 7: App Móvil en Flutter** | `c6233fc`, `8116ae7`, `8ebc549`, `41c88dc` | Creación y refactorización completa de la aplicación móvil: alineación visual con la web, tarjetas KPI, gráficos con `fl_chart`, soporte de refresh dinámico y visualización de avatares. | Flutter 3.47, Dart, Riverpod, Dio | **VERIFICADO** |
| **Fase 8: Aprovisionamiento en Nube y Corrección de Despliegue** | `f3916d5`, `a16bf08` | Corrección de sintaxis f-string en `event_controller.py`, solución de prefijos entre comillas en router interno de auth, y retiro de CloudFront en scripts de despliegue para adaptarse a cuotas de Learner Lab. | PowerShell, AWS CLI, Bash | **VERIFICADO** |

---

## 5. HISTORIAL DEL DESPLIEGUE

A lo largo del proyecto se implementaron y probaron tres enfoques de arquitectura en Amazon Web Services:

### 5.1. Etapa 0: Despliegue Inicial con Terraform (Corte 1 - Monolito EC2)
* **Descripción:** Se utilizó Terraform (`aws/terraform/main.tf`) para levantar una única instancia EC2 (`t3.medium`) en la VPC por defecto de AWS, asociando una IP pública y ejecutando `install_app.sh` vía `user_data`.
* **Recursos Desplegados:** Instancia EC2 `i-0461c44ee52b84a13` con nombre `PortalEgresado-Server`, Security Group `sg-07239375d80663dd9` (`portal-egresado-sg`) permitiendo SSH desde la IP pública del operador y puertos 80/443 abiertos a `0.0.0.0/0`.
* **Resultado:** Despliegue funcional pero con arquitectura monolítica, sin alta disponibilidad ni separación de capas. `[VERIFICADO: aws/terraform/terraform.tfstate]`

### 5.2. Etapa 1: Arquitectura 1 (IaaS Tradicional - 3 Capas en EC2)
* **Script de Ejecución:** `aws/deploy.ps1`.
* **Secuencia de Pasos:**
  1. Creación de VPC `portal_vpc` (`10.0.0.0/16`) y 6 subredes en 2 Zonas de Disponibilidad (`us-east-1a` y `us-east-1b`).
  2. Creación de Internet Gateway (`portal_igw`) y 1 NAT Gateway en subred pública con Elastic IP asignada.
  3. Creación de Security Groups para 3 capas: `sg_alb_ext` (público HTTP/HTTPS), `sg_front` (EC2 frontend), `sg_alb_int` (ALB privado), `sg_back` (EC2 backend), `sg_data` (RDS y servicios data).
  4. Creación de buckets S3 para archivos de usuario (`portal-cvs-*`, `portal-avatars-*`, `portal-deliverables-*`).
  5. Despliegue de Amazon RDS PostgreSQL Multi-AZ (`portal-db-rds`) en subredes aisladas.
  6. Creación de 2 Application Load Balancers: ALB Externo público (`alb-portal-ext`) y ALB Interno privado (`alb-portal-int`).
  7. Creación de Auto Scaling Groups (ASG) y Launch Templates para EC2 de Frontend (Nginx + React) y EC2 de Backend (Docker Compose con microservicios).
* **Comportamiento y Limitaciones:** La arquitectura cumplía alta disponibilidad IaaS, pero requería mantener 2 ALBs y 2 servidores EC2 permanentemente activos, consumiendo una porción sustancial de los créditos de AWS Learner Lab ($100 USD límite). `[VERIFICADO: aws/deploy.ps1]`

### 5.3. Etapa 2: Arquitectura 2 (Esquema B - S3 Website + ECS Fargate + RDS Multi-AZ)
* **Script de Ejecución:** `aws/deploy_s3.ps1`.
* **Secuencia de Pasos Ejecutada:**
  1. **Red Multi-AZ:** Creación de VPC (`10.0.0.0/16`), 2 subredes públicas (`10.0.1.0/24`, `10.0.2.0/24`), 2 privadas de aplicación (`10.0.3.0/24`, `10.0.4.0/24`) y 2 privadas aisladas de datos (`10.0.5.0/24`, `10.0.6.0/24`).
  2. **Salida a Internet:** Creación de 1 NAT Gateway compartido en la Subred Pública A (`portal_sub_front_a`) con 1 IP Elástica (EIP), configurando tablas de ruteo para que las subredes privadas salgan a través de él.
  3. **Security Groups:** Configuración de `sg_alb_api` (ALB público puerto 80), `sg_ecs_tasks` (puerto 8000 desde el ALB), `sg_rds` (puerto 5432 desde ECS y EC2 Data), y `sg_data` (puertos 5672 y 3100 desde ECS).
  4. **Buckets S3:** Verificación y creación de 4 buckets: `portal-front-{AccountId}`, `portal-cvs-{AccountId}`, `portal-avatars-{AccountId}`, `portal-deliverables-{AccountId}`.
  5. **Amazon RDS Multi-AZ:** Despliegue de PostgreSQL 15 en `db.t3.micro` con replicación síncrona en 2 AZs (`portal-db-rds`).
  6. **Repositorios ECR:** Creación de 5 repositorios en Amazon ECR (`portal-auth`, `portal-companies`, `portal-graduates`, `portal-matchmaking`, `portal-dashboard`).
  7. **Instancia Auxiliar `portal_data`:** Creación de una instancia EC2 `t3.small` en la subred de base de datos A para ejecutar RabbitMQ y Loki, compilar las 5 imágenes Docker en ECR y sembrar `backend/init.sql` en RDS.
  8. **Balanceador de Carga (ALB):** Creación del ALB público `alb-portal-api`, creación de 5 Target Groups tipo `ip` en el puerto 8000, y definición de reglas de enrutamiento por ruta (`/api/auth*`, `/api/modulo1*`, `/api/modulo2*`, `/api/matching*`, `/api*`).
  9. **Servicios en ECS Fargate:** Creación del cluster `portal-cluster`, registro de 5 Task Definitions (`task-portal-*`) con 256 CPU / 512 MB RAM, rol `LabRole`, subredes privadas sin IP pública (`assignPublicIp=DISABLED`), y configuración de Application Auto Scaling (min: 1, max: 3, objetivo CPU 70%).
  10. **Frontend en S3:** Inyección del DNS del ALB en `.env.production`, compilación con `npm run build`, configuración del bucket `portal-front-{AccountId}` con Static Website Hosting, habilitación de lectura pública mediante bucket policy, subida de `dist/` y copia recursiva de `index.html` en 24 rutas SPA para evitar errores 404 en navegación directa.
  11. **Configuración de App Móvil:** Escritura dinámica del DNS del ALB en `mobile_app/lib/core/network/api_client.dart` y en `mobile_app/.env`.
  12. **Health Checks:** Sondeo activo al endpoint `/api/auth/login` hasta validar respuesta HTTP válida. `[VERIFICADO: aws/deploy_s3.ps1]`

---

## 6. INVENTARIO DE RECURSOS AWS

### 6.1. Recursos de Cómputo y Contenedores
| Identificador / Nombre | Servicio AWS | Región / AZ | Tipo / Configuración | Función en la Arquitectura | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `portal-cluster` | Amazon ECS | us-east-1 | Cluster Serverless (Fargate) | Orquestación de contenedores Docker | `aws/deploy_s3.ps1:379` | **VERIFICADO** |
| `svc-portal-auth` | ECS Service | us-east-1 (AZ A y B) | Fargate (1 tarea base, máx 3) | Microservicio Autenticación | `aws/deploy_s3.ps1:518` | **VERIFICADO** |
| `svc-portal-graduates`| ECS Service | us-east-1 (AZ A y B) | Fargate (1 tarea base, máx 3) | Microservicio Egresados | `aws/deploy_s3.ps1:518` | **VERIFICADO** |
| `svc-portal-companies`| ECS Service | us-east-1 (AZ A y B) | Fargate (1 tarea base, máx 3) | Microservicio Empresas | `aws/deploy_s3.ps1:518` | **VERIFICADO** |
| `svc-portal-matchmaking`| ECS Service| us-east-1 (AZ A y B) | Fargate (1 tarea base, máx 3) | Microservicio Matchmaking | `aws/deploy_s3.ps1:518` | **VERIFICADO** |
| `svc-portal-dashboard`| ECS Service | us-east-1 (AZ A y B) | Fargate (1 tarea base, máx 3) | Microservicio Dashboard | `aws/deploy_s3.ps1:518` | **VERIFICADO** |
| `portal_data` | Amazon EC2 | us-east-1a (`portal_sub_data_a`)| `t3.small` (30 GB gp3) | Broker RabbitMQ, Loki y Builder ECR | `aws/deploy_s3.ps1:274` | **VERIFICADO** |
| `portal-auth` | Amazon ECR | us-east-1 | Repositorio Docker privado | Almacenamiento de imagen de Auth | `aws/deploy_s3.ps1:179` | **VERIFICADO** |
| `portal-companies` | Amazon ECR | us-east-1 | Repositorio Docker privado | Almacenamiento de imagen de Empresas | `aws/deploy_s3.ps1:179` | **VERIFICADO** |
| `portal-graduates` | Amazon ECR | us-east-1 | Repositorio Docker privado | Almacenamiento de imagen de Egresados| `aws/deploy_s3.ps1:179` | **VERIFICADO** |
| `portal-matchmaking`| Amazon ECR | us-east-1 | Repositorio Docker privado | Almacenamiento de imagen de Matching | `aws/deploy_s3.ps1:179` | **VERIFICADO** |
| `portal-dashboard` | Amazon ECR | us-east-1 | Repositorio Docker privado | Almacenamiento de imagen de Dashboard| `aws/deploy_s3.ps1:179` | **VERIFICADO** |

### 6.2. Recursos de Red y Balanceo
| Identificador / Nombre | Servicio AWS | Región / AZ | Configuración / Rango | Función en la Arquitectura | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `portal_vpc` | Amazon VPC | us-east-1 | CIDR `10.0.0.0/16` | Aislamiento de red del proyecto | `aws/deploy_s3.ps1:33` | **VERIFICADO** |
| `portal_sub_front_a` | Subred Pública A | us-east-1a | `10.0.1.0/24` (Public IP on launch) | ALB Público nodo A, NAT Gateway | `aws/deploy_s3.ps1:39` | **VERIFICADO** |
| `portal_sub_front_b` | Subred Pública B | us-east-1b | `10.0.2.0/24` (Public IP on launch) | ALB Público nodo B | `aws/deploy_s3.ps1:44` | **VERIFICADO** |
| `portal_sub_back_a` | Subred Privada A | us-east-1a | `10.0.3.0/24` (Ruta a NAT GW) | Tareas ECS Fargate en AZ A | `aws/deploy_s3.ps1:40` | **VERIFICADO** |
| `portal_sub_back_b` | Subred Privada B | us-east-1b | `10.0.4.0/24` (Ruta a NAT GW) | Tareas ECS Fargate en AZ B | `aws/deploy_s3.ps1:45` | **VERIFICADO** |
| `portal_sub_data_a` | Subred Aislada A | us-east-1a | `10.0.5.0/24` | RDS Primaria y EC2 portal_data | `aws/deploy_s3.ps1:41` | **VERIFICADO** |
| `portal_sub_data_b` | Subred Aislada B | us-east-1b | `10.0.6.0/24` | RDS Réplica Standby | `aws/deploy_s3.ps1:46` | **VERIFICADO** |
| `portal_igw` | Internet Gateway | us-east-1 | Adjunto a `portal_vpc` | Conectividad pública a Internet | `aws/deploy_s3.ps1:51` | **VERIFICADO** |
| `portal_nat_gw` | NAT Gateway | us-east-1a (`portal_sub_front_a`)| Asociado a Elastic IP | Salida segura de subredes privadas | `aws/deploy_s3.ps1:79` | **VERIFICADO** |
| `alb-portal-api` | ALB (elbv2) | us-east-1 (Multi-AZ) | Internet-Facing, Puerto 80 | Puerta de enlace unificada API | `aws/deploy_s3.ps1:296` | **VERIFICADO** |
| `tg-ecs-auth` | Target Group | us-east-1 | Tipo IP, Puerto 8000, Health `/` | Destino para microservicio auth | `aws/deploy_s3.ps1:290` | **VERIFICADO** |
| `tg-ecs-companies` | Target Group | us-east-1 | Tipo IP, Puerto 8000, Health `/` | Destino para microservicio companies | `aws/deploy_s3.ps1:291` | **VERIFICADO** |
| `tg-ecs-graduates` | Target Group | us-east-1 | Tipo IP, Puerto 8000, Health `/` | Destino para microservicio graduates | `aws/deploy_s3.ps1:292` | **VERIFICADO** |
| `tg-ecs-matchmaking`| Target Group | us-east-1 | Tipo IP, Puerto 8000, Health `/health` | Destino para microservicio matching | `aws/deploy_s3.ps1:293` | **VERIFICADO** |
| `tg-ecs-dashboard` | Target Group | us-east-1 | Tipo IP, Puerto 8000, Health `/` | Destino para microservicio dashboard | `aws/deploy_s3.ps1:294` | **VERIFICADO** |

### 6.3. Recursos de Base de Datos y Almacenamiento
| Identificador / Nombre | Servicio AWS | Región / AZ | Tipo / Configuración | Función en la Arquitectura | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `portal-db-rds` | Amazon RDS PostgreSQL| us-east-1 (Multi-AZ) | `db.t3.micro`, 20 GB gp3, v15 | Almacén relacional principal | `aws/deploy_s3.ps1:163-176`| **VERIFICADO** |
| `portal-db-subnets` | RDS Subnet Group | us-east-1 (AZ A y B)| Subredes `portal_sub_data_a/b` | Agrupación de subredes privadas DB | `aws/deploy_s3.ps1:141` | **VERIFICADO** |
| `portal-front-980217706718` | Amazon S3 | us-east-1 | Static Website Hosting público | Hospedaje de la aplicación SPA React| `aws/deploy_s3.ps1:125,586`| **VERIFICADO** |
| `portal-cvs-980217706718` | Amazon S3 | us-east-1 | Privado (Acceso vía IAM LabRole) | Almacén de hojas de vida en PDF | `aws/deploy_s3.ps1:122` | **VERIFICADO** |
| `portal-avatars-980217706718`| Amazon S3 | us-east-1 | Privado (Acceso vía IAM LabRole) | Almacén de fotos de perfil | `aws/deploy_s3.ps1:123` | **VERIFICADO** |
| `portal-deliverables-980217706718`| Amazon S3 | us-east-1| Privado (Acceso vía IAM LabRole) | Almacén de entregables y anexos | `aws/deploy_s3.ps1:124` | **VERIFICADO** |

### 6.4. Monitoreo, Logs y Seguridad
| Identificador / Nombre | Servicio AWS | Configuración | Función en la Arquitectura | Fuente | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/ecs/portal-*` | CloudWatch Logs | 5 Log Groups creados (`auth`, `companies`, etc.) | Recolección centralizada de logs de contenedores | `aws/deploy_s3.ps1:470` | **VERIFICADO** |
| `cpu-scaling-svc-portal-*` | Application Auto Scaling | TargetTrackingScaling (70% CPU promedio) | Escala horizontal de tareas Fargate (1 a 3) | `aws/deploy_s3.ps1:536-554`| **VERIFICADO** |
| `LabRole` / `LabInstanceProfile` | AWS IAM | Rol preconfigurado en AWS Learner Lab | Permisos de ejecución para ECS tasks y EC2 | `aws/deploy_s3.ps1:197,478`| **VERIFICADO** |

---

## 7. ARQUITECTURA REAL Y FLUJO DE COMUNICACIONES

### 7.1. Comparación Estructural de las Arquitecturas

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ARQUITECTURA 1 (IaaS Tradicional)                              │
│                                                                                                  │
│   [Clientes: Web / Móvil]                                                                        │
│              │                                                                                   │
│              ▼                                                                                   │
│   [ALB Externo Público: alb-portal-ext] (Puerto 80/443)                                          │
│              │                                                                                   │
│              ▼                                                                                   │
│   [Capa Frontend: Auto Scaling Group en EC2] (Nginx + React compilado en contenedor Docker)     │
│              │                                                                                   │
│              ▼                                                                                   │
│   [ALB Interno Privado: alb-portal-int] (Sin IP pública, enrutamiento a Backend)                 │
│              │                                                                                   │
│              ▼                                                                                   │
│   [Capa Backend: Auto Scaling Group en EC2] (Docker Compose con los 5 Microservicios FastAPI)    │
│              │                                                                                   │
│              ▼                                                                                   │
│   [Capa Datos: Amazon RDS PostgreSQL Multi-AZ] (Primaria AZ-A <--> Réplica síncrona AZ-B)       │
│   [Almacenamiento: S3 Buckets de Objetos] (CVs, Avatares, Entregables)                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA 2 / ESQUEMA B (Serverless Web + Contenedores)               │
│                                                                                                  │
│   [Navegador Web] ──HTTPS (S3 Website)──► [Amazon S3: portal-front-AccountId] (Fuera de la VPC)  │
│   [App Móvil] ───────HTTPS API (ALB)───┐                                                         │
│                                        │                                                         │
│                                        ▼ (Internet Gateway)                                      │
│                    [Application Load Balancer Público: alb-portal-api]                           │
│                                        │                                                         │
│              ┌─────────────────────────┼─────────────────────────┐                               │
│              ▼ (/api/auth)             ▼ (/api/modulo1)          ▼ (/api/modulo2, matching, etc.)│
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ AWS ECS Cluster (Fargate) en Subredes Privadas (10.0.3.0/24 y 10.0.4.0/24)               │   │
│   │ [svc-portal-auth]  [svc-portal-graduates]  [svc-portal-companies]  [matchmaking] [dashboard]│  │
│   │ (Auto Scaling por CPU: 1 a 3 réplicas por servicio distribuidas en AZ-A y AZ-B)          │   │
│   └──────────────┬─────────────────────────────┬─────────────────────────────┬───────────────┘   │
│                  │                             │                             │                   │
│                  │ (AMQP / Logs)               │ (SQL Puerto 5432)           │ (Boto3 Put/Get)   │
│                  ▼                             ▼                             ▼                   │
│         [EC2 portal_data]            [Amazon RDS Multi-AZ]         [Amazon S3 Objetos]           │
│         RabbitMQ + Loki              PostgreSQL 15                 CVs, Avatares, Entregables    │
│         (Subred Aislada A)           (Subredes Aisladas A y B)     (Fuera de la VPC)             │
│                                                                                                  │
│   * Salida a Internet de tareas privadas: 1 NAT Gateway en Subred Pública A (10.0.1.0/24)       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
`[VERIFICADO: aws/deploy.ps1, aws/deploy_s3.ps1]`

### 7.2. Flujo de Tráfico y Comunicaciones (Arquitectura 2 - En Producción)
1. **Acceso al Frontend Web:**
   * El usuario solicita el sitio web estático apuntando directamente al endpoint de S3 Static Website: `http://portal-front-980217706718.s3-website-us-east-1.amazonaws.com`.
   * S3 entrega los archivos HTML, JavaScript compilado y CSS. S3 opera fuera de la VPC (servicio serverless de ámbito regional), por lo que no requiere instancias EC2 ni consume recursos de cómputo en la VPC.
   * La navegación interna de la SPA es resuelta sin error 404 gracias a las 24 rutas clonadas generadas por el script de despliegue.
2. **Llamadas a la API desde el Frontend y la App Móvil:**
   * La aplicación React (desde el navegador del cliente) y la App Móvil en Flutter efectúan peticiones HTTP directamente contra el DNS del balanceador de carga público: `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com`.
   * El tráfico ingresa a la VPC a través del Internet Gateway (`portal_igw`) y llega al ALB distribuido en las dos subredes públicas (`10.0.1.0/24` y `10.0.2.0/24`).
3. **Enrutamiento por Ruta en el Application Load Balancer:**
   * El ALB inspecciona la cabecera `Path` y redirige el tráfico hacia el Target Group correspondiente según las prioridades configuradas:
     * `/api/auth*` -> `tg-ecs-auth` (Microservicio de autenticación).
     * `/api/modulo1*` -> `tg-ecs-graduates` (Microservicio de egresados).
     * `/api/modulo2*` -> `tg-ecs-companies` (Microservicio de empresas).
     * `/api/matching*` o `/matching*` -> `tg-ecs-matchmaking` (Microservicio de matchmaking y WebSockets).
     * `/api*` (regla por defecto) -> `tg-ecs-dashboard` (Microservicio de analítica directiva).
4. **Ejecución en ECS Fargate:**
   * Los contenedores de los microservicios se ejecutan en subredes privadas (`portal_sub_back_a` y `portal_sub_back_b`). No poseen IP pública (`assignPublicIp=DISABLED`), estando completamente aislados del acceso directo de Internet.
   * La comunicación inter-microservicios se realiza invocando las rutas `/api/internal/*` enrutadas a través del propio ALB DNS o mediante llamadas directas.
5. **Comunicación con la Capa de Persistencia:**
   * Los microservicios abren conexiones TCP en el puerto 5432 contra el endpoint de Amazon RDS PostgreSQL (`portal-db-rds.c...us-east-1.rds.amazonaws.com`), ubicado en las subredes aisladas de datos (`10.0.5.0/24` y `10.0.6.0/24`).
   * Para colas de eventos asíncronos y logs, los microservicios `companies` y `matchmaking` se comunican con `portal_data` por los puertos 5672 (AMQP) y 3100 (Loki).
6. **Almacenamiento de Archivos Adjuntos:**
   * Cuando un egresado sube un currículum o imagen de perfil, el microservicio `graduates` interactúa con los buckets privados `portal-cvs-980217706718` y `portal-avatars-980217706718` utilizando las credenciales asignadas por el rol IAM `LabRole` a través de la salida a Internet provista por el NAT Gateway.

### 7.3. Puntos de Falla Observables y Decisiones de Diseño
* **Single NAT Gateway (Punto Único de Salida en Subred A):** En la Arquitectura 2 se desplegó un único NAT Gateway en la Zona A (`10.0.1.0/24`) para ambas AZs. **Motivo técnico:** En AWS Learner Lab existe una cuota estricta de máximo 5 Elastic IPs por cuenta. Desplegar 2 NAT Gateways consumiría 2 EIPs y duplicaría el costo fijo por hora ($0.045/hora por NAT). En caso de una caída total del datacenter de la Zona A de AWS, las tareas en la Zona B perderían la salida a Internet para descargar dependencias o contactar S3. `[VERIFICADO: aws/deploy_s3.ps1:59-80]`
* **Instancia Auxiliar `portal_data` en Zona Única:** RabbitMQ y Loki corren en una única instancia EC2 (`t3.small`) en la subred aislada A. Si dicha instancia se detiene, el cálculo de matchmaking asíncrono y la recolección de logs en Loki se interrumpen (aunque el cálculo REST directo continúa operando). `[VERIFICADO: aws/deploy_s3.ps1:277]`
* **Balanceador de Carga Público con HTTP (Puerto 80):** En el entorno de laboratorio no se dispone de un certificado ACM validado por dominio personalizado (Route 53), por lo que el tráfico viaja en HTTP sin cifrado TLS sobre el puerto 80 del ALB. `[VERIFICADO: aws/deploy_s3.ps1:109,329]`

---

## 8. CONFIGURACIÓN DE LA APLICACIÓN

### 8.1. Variables de Entorno del Backend
A continuación se relacionan las variables de entorno configuradas en las definiciones de tareas de ECS Fargate (`task-portal-*`) y en `docker-compose.back.yml`. Por estrictas razones de seguridad, **no se exponen credenciales reales ni claves privadas**:

| Nombre de la Variable | Ubicación / Archivo | Propósito Técnico |
| :--- | :--- | :--- |
| `DATABASE_URL` | `aws/deploy_s3.ps1:386`, `docker-compose.back.yml:12` | Cadena de conexión JDBC/SQLAlchemy a la base de datos respectiva de cada microservicio en RDS |
| `SECRET_KEY` | `aws/deploy_s3.ps1:387`, `docker-compose.back.yml:13` | Llave criptográfica simétrica para firma y verificación de tokens JWT |
| `ALGORITHM` | `aws/deploy_s3.ps1:388`, `docker-compose.back.yml:14` | Algoritmo de cifrado de tokens (establecido en `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `aws/deploy_s3.ps1:389`, `docker-compose.back.yml:15` | Tiempo de vida de los tokens de autenticación (establecido en `30` minutos) |
| `FRONTEND_URL` | `aws/deploy_s3.ps1:390`, `docker-compose.back.yml:16` | URL del origen del cliente para validación de CORS y generación de enlaces de verificación |
| `GRADUATES_URL` | `aws/deploy_s3.ps1:391`, `docker-compose.back.yml:17` | Endpoint del microservicio de egresados para llamadas inter-servicio |
| `COMPANIES_URL` | `aws/deploy_s3.ps1:418` | Endpoint del microservicio de empresas para llamadas inter-servicio |
| `MATCHMAKING_URL` | `aws/deploy_s3.ps1:411`, `docker-compose.back.yml:36` | Endpoint del microservicio de matchmaking para disparo de cálculo de afinidad |
| `AUTH_URL` | `aws/deploy_s3.ps1:414` | Endpoint del microservicio de autenticación para validación de tokens y usuarios |
| `MATCHMAKING_INTERNAL_TOKEN` | `aws/deploy_s3.ps1:412`, `docker-compose.back.yml:37` | Token secreto de cabecera para autorización entre microservicios sin sesión de usuario |
| `RABBITMQ_URL` | `aws/deploy_s3.ps1:413`, `docker-compose.back.yml:91` | URI de conexión al broker RabbitMQ (`amqp://...:5672/`) para colas de eventos |
| `MINIO_BUCKET_NAME` | `aws/deploy_s3.ps1:431`, `docker-compose.back.yml:55` | Nombre del bucket S3 destinado al almacenamiento de CVs en formato PDF |
| `S3_BUCKET_AVATARS` | `aws/deploy_s3.ps1:432`, `docker-compose.back.yml:56` | Nombre del bucket S3 destinado a almacenar fotos de perfil de egresados |
| `AWS_DEFAULT_REGION` | `aws/deploy_s3.ps1:433`, `docker-compose.back.yml:57` | Región operativa de AWS SDK Boto3 (`us-east-1`) |
| `SMTP_HOST` | `aws/deploy_s3.ps1:392`, `docker-compose.back.yml:18` | Host del servidor de correo para notificación y verificación institucional |
| `SMTP_PORT` | `aws/deploy_s3.ps1:393`, `docker-compose.back.yml:19` | Puerto del servidor SMTP (`587` STARTTLS) |
| `SMTP_USER` | `aws/deploy_s3.ps1:394`, `docker-compose.back.yml:20` | Usuario de correo electrónico institucional emisor |
| `SMTP_PASS` | `aws/deploy_s3.ps1:395`, `docker-compose.back.yml:21` | Contraseña de aplicación para autenticación SMTP |
| `SMTP_FROM_EMAIL` | `aws/deploy_s3.ps1:396`, `docker-compose.back.yml:22` | Dirección de remitente en los correos salientes |
| `*_HEALTH_URL` | `aws/deploy_s3.ps1:397-400` | URLs de verificación de estado y monitoreo entre microservicios |
`[VERIFICADO: aws/deploy_s3.ps1, docker-compose.back.yml]`

### 8.2. Variables de Entorno del Frontend Web (`frontend/.env.production`)
| Variable | Valor Configurado | Propósito |
| :--- | :--- | :--- |
| `VITE_AUTH_URL` | `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Base URL para endpoints de login, registro y usuarios |
| `VITE_COMPANIES_URL` | `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Base URL para endpoints de ofertas y empresas |
| `VITE_GRADUATES_URL` | `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Base URL para endpoints de perfil de egresado |
| `VITE_MATCHMAKING_URL`| `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Base URL para endpoints de afinidad y postulaciones |
| `VITE_DASHBOARD_URL` | `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Base URL para métricas y reportería directiva |
`[VERIFICADO: frontend/.env.production:1-5]`

### 8.3. Variables de Entorno de la App Móvil (`mobile_app/.env`)
| Variable | Valor Configurado | Propósito |
| :--- | :--- | :--- |
| `DEPLOY_ARCHITECTURE` | `ARCH2_ECS_MICROSERVICES` | Indicador de la arquitectura activa consumida por la app |
| `ECS_CLUSTER` | `portal-cluster` | Nombre del cluster ECS Fargate |
| `ECS_ALB_DNS` | `alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | DNS público del Application Load Balancer |
| `API_BASE_URL` | `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com/api` | Prefijo base de la API REST para peticiones móviles |
| `AUTH_URL` / `GRADUATES_URL`...| `http://alb-portal-api-1118150735.us-east-1.elb.amazonaws.com` | Hosts específicos para cada servicio |
`[VERIFICADO: mobile_app/.env:1-10]`

---

## 9. BASE DE DATOS Y PERSISTENCIA

### 9.1. Motor y Configuración en la Nube
* **Motor Relacional:** PostgreSQL versión 15. `[VERIFICADO: aws/deploy_s3.ps1:166, docker-compose.data.yml:5]`
* **Despliegue en AWS RDS:**
  * Identificador: `portal-db-rds`.
  * Tipo de instancia: `db.t3.micro`.
  * Almacenamiento: 20 GB gp3, cifrado automático.
  * Alta Disponibilidad: Multi-AZ activado (`--multi-az`). Una instancia primaria en `portal_sub_data_a` y una réplica Standby síncrona en `portal_sub_data_b`.
  * Accesibilidad Pública: Deshabilitada (`--no-publicly-accessible`).
  * Subnet Group: `portal-db-subnets` asociando las dos subredes de datos.
  * Respaldo Automático: Deshabilitado en laboratorio (`--backup-retention-period 0`) para reducir tiempos de eliminación. `[VERIFICADO: aws/deploy_s3.ps1:162-176]`

### 9.2. Esquema Lógico: Bases de Datos y Tablas
El script DDL de siembra `backend/init.sql` crea 4 bases de datos lógicas aisladas: `[VERIFICADO: backend/init.sql]`

| Base de Datos Lógica | Microservicio Responsable | Tablas Principales Creadas | Función Técnica |
| :--- | :--- | :--- | :--- |
| `auth_db` | `auth` / `dashboard` | `roles`, `users`, `notifications`, `device_tokens`, `conversations`, `conversation_participants`, `messages`, `audit_logs` | Gestión de identidades, tokens de sesión, control de acceso RBAC, registro de auditoría y chat/mensajería interna. |
| `graduates_db` | `graduates` | `faculties`, `programs`, `skills`, `languages`, `graduates`, `saved_searches`, `mentor_profiles`, `mentorship_requests`, `graduate_projects`, `graduate_connections`, `saved_jobs`, `graduate_skills`, `graduate_languages`, `work_experiences`, `academic_histories`, `certifications`, `surveys`, `survey_responses` | Información curricular completa del egresado, hoja de vida, encuestas institucionales y red de egresados UPC. |
| `companies_db` | `companies` | `countries`, `states`, `cities`, `sectors`, `faculties`, `programs`, `companies`, `job_offers`, `skills`, `job_offer_skills`, `applications`, `application_sub_processes`, `events`, `event_registrations` | Perfiles corporativos de empresas aliadas, catálogo de ofertas laborales con requerimientos, ferias/eventos y etapas de postulación (Kanban). |
| `matchmaking_db` | `matchmaking` | `matchmaking_weights`, `matches`, `match_notifications` | Ponderaciones configurables de afinidad laboral, almacenamiento de cálculos de afinidad candidato-vacante y registro de notificaciones. |

### 9.3. Algoritmo de Afinidad (Matchmaking) y Persistencia
El cálculo de afinidad se ejecuta según la fórmula implementada en `backend/app/matchmaking/services/matching_service.py`: `[VERIFICADO: backend/tests/test_matching.py]`
$$\text{Score} = (S_{\text{programa}} \times W_p) + (S_{\text{habilidades}} \times W_s) + (S_{\text{experiencia}} \times W_e) + \text{Bonus}_{\text{encuesta}}$$
* Ponderaciones por defecto (`matchmaking_weights`):
  * $W_p$ (Programa académico UPC coincidente): `0.40` (40%).
  * $W_s$ (Similitud de Jaccard en habilidades): `0.40` (40%).
  * $W_e$ (Años de experiencia requerida vs real): `0.20` (20%).
* Bonificaciones directas de encuesta:
  * $+4.00\%$ si el egresado no se encuentra laborando actualmente.
  * $+5.00\%$ si el sector de la vacante coincide con el área declarada por el egresado.
  * Puntuación acotada entre $0.00\%$ y $100.00\%$.

---

## 10. ARCHIVOS, SCRIPTS Y COMANDOS TÉCNICOS

### 10.1. Inventario de Archivos Clave
| Ruta del Archivo | Función Técnica Principal | Evidencia de Utilización |
| :--- | :--- | :--- |
| `aws/deploy_s3.ps1` | Automatización integral de Arquitectura 2 (S3 + ECS Fargate + RDS) | Ejecutado en sesión interactiva; genera salida completa y archivos de entorno |
| `aws/deploy.ps1` | Automatización integral de Arquitectura 1 (2 EC2 ASG + 2 ALBs + RDS) | Documentado y probado en etapas previas |
| `aws/destroy_s3.ps1` | Script de desmontaje seguro y purga de recursos de Arquitectura 2 | Utilizado para liberar cuotas de EIP, ALBs y RDS |
| `aws/destroy.ps1` | Script de desmontaje de recursos de Arquitectura 1 | Utilizado para desmontar instancias EC2 y ALBs |
| `aws/credentials.ps1` | Carga de credenciales temporales de sesión AWS Learner Lab | Importado (`. .\aws\credentials.ps1`) en todos los scripts |
| `aws/terraform/main.tf` | Definición IaC de servidor único EC2 y Security Group | Contiene estado persistido en `terraform.tfstate` |
| `docker-compose.back.yml` | Orquestación local y plantilla de variables para microservicios | Define variables, dependencias y redes entre contenedores |
| `docker-compose.data.yml` | Orquestación de infraestructura de datos (Postgres, RabbitMQ, Loki) | Base de configuración para instancias EC2 de tipo Data |
| `backend/init.sql` | Definición DDL y siembra de catálogos base (facultades, programas UPC) | Ejecutado automáticamente por `portal_data` contra RDS |
| `mobile_app/lib/core/network/api_client.dart` | Configuración de Dio, endpoints y selección dinámica de arquitectura | Inyectado automáticamente por `deploy_s3.ps1` |
| `frontend/.env.production` | Archivo de configuración de producción de Vite con el DNS del ALB | Inyectado antes del comando `npm run build` |

### 10.2. Registro de Comandos Relevantes Ejecutados en Terminal
A continuación se recopilan los comandos cuya ejecución fue verificada en el historial de sesiones: `[VERIFICADO: transcript.jsonl, git log]`

1. **Compilación y Build de Frontend:**
   * `npm install --no-audit --no-fund` (en carpeta `frontend/`).
   * `npm run build` -> ejecuta `tsc -b && vite build`, generando la carpeta de distribución optimizada `frontend/dist/`.
2. **Sincronización a S3 Website:**
   * `aws s3 sync frontend/dist s3://portal-front-980217706718 --delete` -> despliegue de assets compilados.
   * `aws s3 website s3://portal-front-980217706718 --index-document index.html --error-document index.html` -> configuración de hosting estático.
3. **Gestión de Contenedores y Tareas en ECS Fargate:**
   * `aws ecs describe-services --cluster portal-cluster --services svc-portal-companies` -> consulta de estado de réplicas y eventos de despliegue.
   * `aws ecs stop-task --cluster portal-cluster --task <TaskArn>` -> forzado de recreación de tareas tras actualización de imagen.
   * `aws ecs update-service --cluster portal-cluster --service <Service> --force-new-deployment` -> despliegue continuo en caliente.
4. **Pruebas y Verificación de la App Móvil:**
   * `flutter build bundle` -> compilación y verificación de assets y código Dart sin errores sintácticos.
   * `flutter test test/widget_test.dart` -> validación de pruebas unitarias de login y restricción de dominio `@unicesar.edu.co`.
5. **Pruebas Unitarias del Backend:**
   * `pytest backend/tests/test_matching.py` -> ejecución de la suite de 14 pruebas del motor de afinidad algorítmica.

---

## 11. CONFIGURACIÓN DE RED Y SEGURIDAD

### 11.1. Plan de Direccionamiento IP (VPC `10.0.0.0/16`)
| Subred | CIDR Block | Zona de Disponibilidad | Tipo de Subred | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `portal_sub_front_a` | `10.0.1.0/24` | `us-east-1a` | Pública (IGW) | Application Load Balancer nodo A, NAT Gateway |
| `portal_sub_front_b` | `10.0.2.0/24` | `us-east-1b` | Pública (IGW) | Application Load Balancer nodo B |
| `portal_sub_back_a` | `10.0.3.0/24` | `us-east-1a` | Privada (NAT GW) | Tareas ECS Fargate Microservicios en AZ A |
| `portal_sub_back_b` | `10.0.4.0/24` | `us-east-1b` | Privada (NAT GW) | Tareas ECS Fargate Microservicios en AZ B |
| `portal_sub_data_a` | `10.0.5.0/24` | `us-east-1a` | Aislada / Privada | Amazon RDS PostgreSQL Primaria, EC2 portal_data |
| `portal_sub_data_b` | `10.0.6.0/24` | `us-east-1b` | Aislada / Privada | Amazon RDS PostgreSQL Réplica Standby |
`[VERIFICADO: aws/deploy_s3.ps1:38-46]`

### 11.2. Grupos de Seguridad (Security Groups) y Reglas de Tráfico
El principio de mínimo privilegio se encuentra implementado mediante el encadenamiento de grupos de seguridad (`source-group`): `[VERIFICADO: aws/deploy_s3.ps1:96-120]`

| Grupo de Seguridad | Tráfico Entrante (Ingress) | Puerto | Origen Permitido | Justificación Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **`sg_alb_api`** | TCP | 80 | `0.0.0.0/0` (Internet) | Recepción de solicitudes HTTP públicas de clientes Web y Móvil hacia el balanceador. |
| **`sg_ecs_tasks`** | TCP | 8000 | `sg_alb_api` | Solo el ALB puede entregar tráfico a los microservicios en Fargate. |
| **`sg_ecs_tasks`** | Todos (-1) | Todos | `sg_ecs_tasks` | Comunicación inter-servicios interna entre tareas de Fargate. |
| **`sg_rds`** | TCP | 5432 | `sg_ecs_tasks` | Consultas relacionales desde los microservicios en Fargate. |
| **`sg_rds`** | TCP | 5432 | `sg_data` | Permite a la instancia EC2 `portal_data` sembrar la BD inicial (`init.sql`). |
| **`sg_data`** | TCP | 5672 | `sg_ecs_tasks` | Acceso a colas de eventos RabbitMQ desde microservicios. |
| **`sg_data`** | TCP | 3100 | `sg_ecs_tasks` | Ingesta de logs en Grafana Loki desde microservicios. |

### 11.3. Políticas de Acceso y Permisos IAM
* **Rol de Tareas y Ejecución:** `arn:aws:iam::980217706718:role/LabRole`. Preconfigurado en AWS Academy / Learner Lab con permisos para lectura de parámetros en SSM, pull/push en Amazon ECR, creación de Log Streams en CloudWatch Logs y operaciones sobre buckets S3. `[VERIFICADO: aws/deploy_s3.ps1:478-479]`
* **Seguridad en S3:**
  * Bucket `portal-front-*`: Acceso público de lectura restringido a la acción `s3:GetObject` mediante la política `bucket_policy_front.json` para servir el sitio estático.
  * Buckets de datos (`portal-cvs-*`, `portal-avatars-*`, `portal-deliverables-*`): Bloqueo de acceso público total (`BlockPublicAcls=true`, `BlockPublicPolicy=true`). Acceso exclusivo mediante el rol IAM `LabRole` a través del backend. `[VERIFICADO: aws/deploy_s3.ps1:128-136, 587-601]`

---

## 12. PRUEBAS EJECUTADAS Y RESULTADOS ENCONTRADOS

| Tipo de Prueba | Componente Evaluado | Procedimiento Ejecutado | Resultado Obtenido | Ubicación de la Evidencia | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Prueba Unitaria de Algoritmo** | Motor de Afinidad (`matching_service.py`) | Ejecución de 14 casos de prueba con Pytest (match perfecto 100%, penalización de programas distintos, similitud Jaccard de habilidades, bonus de encuesta laboral y límites de escala). | **PASÓ AL 100%** (14 tests exitosos). Puntuación y bonos acotados exactamente según especificación. | `backend/tests/test_matching.py` | **VERIFICADO** |
| **Prueba de Interfaz Móvil (Smoke Test)** | App Móvil Flutter (`widget_test.dart`) | Renderizado de `LoginScreen` y verificación de presencia de textos de bienvenida y botón de acceso. | **PASÓ** (Componentes renderizados correctamente). | `mobile_app/test/widget_test.dart:9-19` | **VERIFICADO** |
| **Prueba de Validación Institucional** | Registro de Egresados Móvil | Verificación de que el formulario de registro contiene la etapa 1 y 2, solicita correo `@unicesar.edu.co` y excluye registro de empresas en la app. | **PASÓ** (Validación exclusiva para egresados confirmada). | `mobile_app/test/widget_test.dart:21-42` | **VERIFICADO** |
| **Compilación de Frontend Web** | SPA React 19 + TypeScript | Ejecución de `npm run build` (`tsc -b && vite build`). | **EXITOSO** (Generación de bundle de producción en `frontend/dist/` sin errores de tipado). | `aws/deploy_s3.ps1:580`, `frontend/dist/` | **VERIFICADO** |
| **Compilación de App Móvil** | Flutter Web & Mobile Assets | Ejecución de `flutter build bundle`. | **EXITOSO** (Exit code 0, assets y snapshot de bytecode empaquetados). | `mobile_app/build/`, transcript | **VERIFICADO** |
| **Prueba de Health Check del ALB** | Balanceador `alb-portal-api` | Bucle de sondeo HTTP POST a `http://$AlbDns/api/auth/login` con reintentos cada 15s hasta obtener código 2xx/4xx. | **EXITOSO** (Servicios en Fargate pasan de INITIALIZING a HEALTHY y responden al ALB). | `aws/deploy_s3.ps1:620-646` | **VERIFICADO** |
| **Conmutación RDS Multi-AZ** | Amazon RDS PostgreSQL | Creación con parámetro `--multi-az` y verificación de estado en subredes aisladas. | Instancia provisionada con réplica síncrona activa en AZ B. No se forzó caída manual por script. | `aws/deploy_s3.ps1:174` | **VERIFICADO** |
| **Pruebas de Carga / Caída de AZ** | Infraestructura completa | Simulación de estrés masivo o interrupción forzada de una AZ. | **NO DISPONIBLE / NO EJECUTADA:** No se ejecutaron pruebas de estrés con herramientas de carga tipo JMeter o Locust para no comprometer el crédito del Learner Lab. | Documentación del proyecto | **NO DISPONIBLE** |

---

## 13. COSTOS Y DATOS ECONÓMICOS DISPONIBLES

### 13.1. Restricciones del Entorno Académico (AWS Learner Lab)
* **Presupuesto Máximo Asignado:** $100.00 USD por cuenta/semestre.
* **Política de Cancelación Automática:** Se aplica revocación automática de credenciales (`voc-cancel-cred`) cuando se excede el uso de servicios no permitidos o se agota el tiempo de sesión.
* **Cuotas Estrictas de Recursos:**
  * Máximo 5 Direcciones IP Elásticas (EIP) por cuenta.
  * Restricción en la creación de roles IAM personalizados (obligatoriedad de uso de `LabRole` y `LabInstanceProfile`).
  * Tipos de instancias permitidos: Familias `t2`, `t3`, `t4g` (micro, small, medium).
`[VERIFICADO: aws/deploy_s3.ps1:20, aws/destroy_s3.ps1:33]`

### 13.2. Comparación de Supuestos de Costo: Arquitectura 1 vs Arquitectura 2
| Parámetro de Costo | Arquitectura 1 (IaaS EC2 Tradicional) | Arquitectura 2 (Esquema B: S3 + ECS Fargate) | Diferencia / Impacto Económico |
| :--- | :--- | :--- | :--- |
| **Hospedaje Frontend** | 1 o 2 instancias EC2 (`t3.small`) en ASG encendidas 24/7 (~$15 - $30 USD/mes). | Amazon S3 Static Website Hosting. Sin servidor encendido. | **Ahorro sustancial:** S3 solo factura almacenamiento ($0.023/GB) y solicitudes GET ($0.0004 por 1000 requests). |
| **Application Load Balancers** | 2 ALBs permanentes (1 público para Front + 1 privado para Back) = ~$36 USD/mes base. | 1 solo ALB público enrutando por ruta a los 5 microservicios = ~$18 USD/mes base. | **Ahorro directo de ~50%** en balanceadores de carga en la nube. |
| **Cómputo Backend** | 1 o 2 instancias EC2 (`t3.small`/`t3.medium`) en ASG permanentemente encendidas. | Tareas Fargate bajo demanda (0.25 vCPU, 0.5 GB RAM por servicio) con Auto Scaling (1 a 3 réplicas). | Pago por uso exacto de vCPU-hora y memoria consumida; escala a cero en caso de desaprovisionamiento. |
| **Salida a Internet (NAT GW)** | Requiere 1 o 2 NAT Gateways ($0.045/hora cada uno + transferencia de datos). | 1 solo NAT Gateway compartido Multi-AZ, conservando EIPs. | Reduce el costo de NAT a la mitad y previene el bloqueo por límite de 5 EIPs. |
| **Base de Datos** | RDS PostgreSQL Multi-AZ (`db.t3.micro`). | RDS PostgreSQL Multi-AZ (`db.t3.micro`). | Mismo costo base de base de datos relacional gestionada de alta disponibilidad. |
`[VERIFICADO: aws/deploy.ps1, aws/deploy_s3.ps1, transcripciones de diseño]`

### 13.3. Etiquetas de Recursos para Gobierno de Gasto (Cost Allocation Tags)
En la configuración de Terraform (`aws/terraform/main.tf:5-11`) se identificaron las siguientes etiquetas corporativas obligatorias para seguimiento de facturación: `[VERIFICADO: aws/terraform/main.tf]`
* `Proyecto`: `lab-cloud-2026-gL`
* `Responsable`: `alfredo.perez`
* `Ambiente`: `prod`
* `CentroDeCosto`: `cloud-computing-2026`
* `Expiracion`: `2026-12-31`

---

## 14. EVIDENCIAS EXISTENTES Y SU UBICACIÓN

| Tipo de Evidencia | Descripción del Archivo / Recurso | Ruta Local / Ubicación |
| :--- | :--- | :--- |
| **Script Maestro Despliegue S3** | Automatización completa de Arquitectura 2 en PowerShell (673 líneas) | `aws/deploy_s3.ps1` |
| **Script Maestro Despliegue EC2** | Automatización completa de Arquitectura 1 en PowerShell (475 líneas) | `aws/deploy.ps1` |
| **Script Destrucción Segura S3** | Automatización de desaprovisionamiento, purga de ENIs, S3 y RDS | `aws/destroy_s3.ps1` |
| **Script Destrucción EC2** | Desmontaje de ASGs, Launch Templates y ALBs de Arquitectura 1 | `aws/destroy.ps1` |
| **Configuración de Red Móvil** | Archivo `.env` generado con el DNS real del ALB de AWS | `mobile_app/.env` |
| **Configuración de Producción Web** | Archivo `.env.production` con el DNS del ALB para la compilación Vite | `frontend/.env.production` |
| **Bundle de Producción Web** | Directorio compilado de la SPA React desplegado en S3 | `frontend/dist/` |
| **DDL y Siembra de Base de Datos** | Estructura completa de las 4 bases de datos relacionales | `backend/init.sql` |
| **Estado Persistido de Terraform** | Archivo de estado de despliegue inicial con IDs de instancias y SGs | `aws/terraform/terraform.tfstate` |
| **Suite de Tests Pytest** | Archivo de pruebas del algoritmo de afinidad laboral | `backend/tests/test_matching.py` |
| **Suite de Tests Flutter** | Pruebas de widgets y validación institucional UPC | `mobile_app/test/widget_test.dart` |
| **Diagrama de Arquitectura Esquema B** | Captura del diagrama de arquitectura oficial en AWS (Esquema B) | `.user_uploaded/media_1792641669383_2057aa30.png` |
| **Diagrama de Arquitectura Esquema A** | Diagrama de 3 capas en alta disponibilidad con cómputo en EC2 | `.user_uploaded/media_1792640864541_dbbe3503.png` |
| **Diagrama Comparativo Esquema B Base**| Esquema base de frontend estático en S3 con API en EC2/ASG/ALB | `.user_uploaded/media_1792640858303_d6a89190.png` |
| **Logs de Sesión y Terminal** | Registro cronológico en JSONL de comandos, errores y respuestas | `.system_generated/logs/transcript.jsonl` |

---

## 15. INFORMACIÓN NO DISPONIBLE Y LIMITACIONES DE ACCESO

1. **Credenciales Permanentes y Certificados TLS/SSL:** En el entorno de AWS Learner Lab no se cuenta con acceso a AWS Certificate Manager (ACM) para emitir certificados HTTPS públicos respaldados por un dominio institucional propio (`portal.egresado.edu.co`). El tráfico se transmite sobre HTTP (Puerto 80). `[NO DISPONIBLE: Limitación de AWS Academy]`
2. **Distribución en Amazon CloudFront:** Aunque en los diagramas teóricos y en versiones previas del script se contemplaba CloudFront como CDN frente a S3 y al ALB, en el despliegue final real no se encuentra habilitada una distribución activa debido a cuotas de laboratorio y tiempos de propagación. `[VERIFICADO: deploy_s3.ps1, commit a16bf08]`
3. **Métricas Históricas de Facturación Real:** Los reportes detallados de AWS Cost Explorer o AWS Budgets consolidados en formato CSV no están archivados en el repositorio local; los costos presentados corresponden a estimaciones paramétricas de arquitectura basadas en las tablas de precios de AWS. `[NO DISPONIBLE: Acceso a consola de facturación]`
4. **Pruebas de Caída de Zona de Disponibilidad (Chaos Engineering):** No se ejecutaron scripts destructivos para forzar la interrupción de una AZ completa en vivo durante las horas de clase, habiéndose verificado únicamente la configuración Multi-AZ de subredes, RDS y réplicas de Fargate. `[NO DISPONIBLE: No ejecutado]`
5. **Acceso a Sistemas Externos de la UPC:** El repositorio contiene modelos y controladores preparados para consumir una eventual "Bolsa de Empleo Externa", pero no existen credenciales activas de integración con sistemas administrativos centrales de la universidad fuera del servicio de correo SMTP configurado. `[INFERIDO: backend/app/auth/controllers/auth_controller.py]`

---
*Fin del Expediente Técnico. Documento generado para servir de insumo fidedigno y verificable a la IA encargada de la elaboración del informe académico de Cloud Computing.*

