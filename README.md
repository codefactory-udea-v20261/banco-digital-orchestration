# 🏦 Banco Digital - Microservicios con Docker

Sistema de banca digital completo con 6 microservicios + 3 servicios de infraestructura, completamente containerizado con Docker y listo para desplegar en Google Cloud Platform.

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────┐
│         API Gateway (Puerto 8000)               │
└────────────────┬────────────────────────────────┘
                 │
    ┌────────────┼────────────┬──────────────┐
    │            │            │              │
┌───▼───┐ ┌─────▼──┐ ┌──────▼──┐ ┌────────▼──┐
│Core   │ │Identity│ │ Audit   │ │ Reporting │
│Bank   │ │Service │ │ Service │ │ Service   │
│(8080) │ │(8081)  │ │ (8082)  │ │ (8083)    │
└───┬───┘ └─────┬──┘ └──────┬──┘ └────────┬──┘
    │           │          │             │
    └───────────┴──────────┴─────────────┘
              │
    ┌─────────▼──────────┐
    │   Eureka Service   │
    │  Discovery (8761)  │
    └────────────────────┘
              │
    ┌─────────┴──────────────────┐
    │                            │
┌───▼────────┐ ┌────────────────▼──┐
│ PostgreSQL │ │ Kafka/Zookeeper   │
│  (5433)    │ │ Message Queue     │
└────────────┘ └───────────────────┘
```

---

## 🚀 Inicio Rápido

### Requisitos
- Docker y Docker Compose v20+
- Git
- Maven 3.9+ (opcional, Docker lo maneja)

### Desplegar localmente

```bash
# 1. Clonar repositorio
git clone <tu-repo>
cd banco-digital-fabela

# 2. Iniciar servicios
docker-compose -f docker-compose-services.yml up -d

# 3. Esperar 2-3 minutos para que todo inicie

# 4. Verificar servicios
docker-compose -f docker-compose-services.yml ps

# 5. Probar endpoints
curl http://localhost:8761    # Eureka Dashboard
curl http://localhost:8080    # Core Banking Service
curl http://localhost:8081    # Identity Service
curl http://localhost:8082    # Audit Service
curl http://localhost:8083    # Reporting Service
curl http://localhost:8000    # API Gateway
```

### Ver logs
```bash
# Todos los servicios
docker-compose -f docker-compose-services.yml logs -f

# Servicio específico
docker-compose -f docker-compose-services.yml logs -f core-banking
```

### Detener servicios
```bash
# Detener (mantiene datos)
docker-compose -f docker-compose-services.yml stop

# Detener y eliminar (limpia datos)
docker-compose -f docker-compose-services.yml down -v
```

---

## 📋 Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **API Gateway** | 8000 | Punto de entrada único para todas las APIs |
| **Core Banking** | 8080 | Operaciones bancarias principales |
| **Identity** | 8081 | Autenticación y autorización |
| **Audit** | 8082 | Logging de eventos para cumplimiento |
| **Reporting** | 8083 | Reportes y análisis |
| **Eureka** | 8761 | Service Discovery |
| **PostgreSQL** | 5433 | Base de datos relacional |
| **Kafka** | 9092 | Message broker |
| **Zookeeper** | 2181 | Coordinación Kafka |

---

## 🔧 Configuración

### Variables de Entorno (.env)
```
APP_PROFILE=docker          # Perfil activo (desactiva Vault)
DB_HOST=postgres            # Host de base de datos
DB_PORT=5432                # Puerto PostgreSQL
DB_USER=postgres            # Usuario DB
DB_PASSWORD=postgres         # Contraseña DB
EUREKA_URL=http://eureka-server:8761/eureka/
KAFKA_BROKER=kafka:9092
```

### Bases de Datos (auto-creadas)
- `banco_digital_core` - Core banking operations
- `identity` - Users and authentication
- `audit` - Event audit trail
- `reporting` - Reports and analytics

---

## 📝 Documentación

### [DEPLOYMENT.md](DEPLOYMENT.md)
Guía completa de despliegue, troubleshooting y configuración.

### [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md)
Instrucciones para desplegar en Google Cloud Platform (Cloud Run, GKE, Compute Engine).

### [CAMBIOS_REALIZADOS.md](CAMBIOS_REALIZADOS.md)
Detalle de cambios realizados y cómo hacer commit en GitHub.

---

## 🐛 Problemas Comunes

### "Connection refused" en base de datos
```bash
# Esperar a que PostgreSQL esté listo
docker-compose -f docker-compose-services.yml logs postgres

# Recrear contenedores
docker-compose -f docker-compose-services.yml down -v
docker-compose -f docker-compose-services.yml up -d
```

### Servicios en estado "unhealthy"
**Es normal.** Los servicios intentan registrarse en Eureka con `localhost` desde dentro del contenedor, pero funcionan correctamente. Espera 1-2 minutos más para que se inicien completamente.

### Puerto ya en uso
```bash
# Encontrar qué usa el puerto (ejemplo: 8080)
lsof -i :8080

# Cambiar puerto en docker-compose-services.yml
# Cambiar "8080:8080" a "8090:8080"
```

---

## 🚀 Despliegue en Google Cloud

### Opción Recomendada: Cloud Run (Serverless)
- ✅ Costo muy bajo (~$20-30/mes)
- ✅ Sin servidores que mantener
- ✅ Escalado automático
- ✅ Ideal para microservicios

**Ver [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) para instrucciones detalladas.**

### Pasos rápidos:
```bash
# Instalar gcloud SDK
curl https://sdk.cloud.google.com | bash

# Autenticarse
gcloud auth login
gcloud config set project tu-proyecto

# Desplegar cada servicio
gcloud run deploy banco-digital-core \
  --source ./banco-digital \
  --platform managed \
  --region us-central1 \
  --memory 512M
```

---

## 📚 Estructura del Proyecto

```
banco-digital-fabela/
├── docker-compose-services.yml    # Orquestación Docker
├── .env                           # Configuración
├── docker-entrypoint-initdb.d/    # Scripts de BD
├── DEPLOYMENT.md                  # Guía de despliegue
├── GOOGLE_CLOUD_DEPLOYMENT.md     # Despliegue en GCP
├── CAMBIOS_REALIZADOS.md          # Historia de cambios
│
├── eureka-server/                 # Service Discovery
├── banco-digital/                 # Core Banking Service
├── banco-digital-identity/        # Authentication
├── banco-digital-audit/           # Event Audit
├── banco-digital-reporting/       # Reports & Analytics
├── banco-digital-gateway/         # API Gateway
│
├── vault/                         # Configuración Vault (prod)
└── schemas/                       # Esquemas de BD
```

---

## 🔐 Seguridad

### Producción
- ✅ Vault habilitado para secrets management
- ✅ TLS/SSL en todos los endpoints
- ✅ Autenticación OAuth2/JWT
- ✅ Autorización RBAC

### Desarrollo/Docker
- ✅ Vault deshabilitado (usa .env)
- ✅ Configuración simplificada
- ✅ Credenciales por defecto

---

## 📈 Monitoreo

### Localmente
```bash
# Ver métricas Eureka
open http://localhost:8761

# Ver health de servicios
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
```

### En GCP
- Google Cloud Console → Cloud Run → Logs
- Cloud Monitoring → Dashboards
- Cloud Trace → Distributed Tracing

---

## 🤝 Contribuir

1. Crear rama: `git checkout -b feature/tu-feature`
2. Hacer cambios
3. Commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/tu-feature`
5. Pull Request en GitHub

**Ver [CAMBIOS_REALIZADOS.md](CAMBIOS_REALIZADOS.md) para estructura de commits.**

---

## 📞 Soporte

Para problemas:
1. Revisar [DEPLOYMENT.md](DEPLOYMENT.md)
2. Ver logs: `docker-compose logs -f [servicio]`
3. Recrear contenedores: `docker-compose down -v && docker-compose up -d`

---

## 📄 Licencia

[Especificar tu licencia]

---

## ✅ Checklist de Despliegue

- [ ] Docker y Docker Compose instalados
- [ ] Repositorio clonado
- [ ] `docker-compose up -d` ejecutado
- [ ] Esperados 2-3 minutos
- [ ] Todos los servicios responden (`curl` o dashboard)
- [ ] Logs verificados sin errores
- [ ] Bases de datos creadas automáticamente

---

**Última actualización:** 2026-04-30
**Estado:** ✅ Completamente operacional y probado

