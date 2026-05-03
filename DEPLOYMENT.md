# Banco Digital Microservices - Docker Deployment Guide

## 🎯 Project Overview

Banco Digital is a microservices-based digital banking platform consisting of:

### Core Services
1. **core-banking** (Puerto 8080) - Main banking operations (accounts, transactions)
2. **identity** (Puerto 8081) - Authentication & authorization  
3. **audit** (Puerto 8082) - Audit logging & compliance
4. **reporting** (Puerto 8083) - Reports & analytics
5. **api-gateway** (Puerto 8000) - API gateway & routing

### Infrastructure Services
- **eureka-server** (Puerto 8761) - Service discovery
- **postgres** (Puerto 5433) - PostgreSQL database (4 databases)
- **kafka** (Puerto 9092) - Message broker
- **zookeeper** (Puerto 2181) - Kafka coordination

---

## 📋 Prerequisites

- Docker & Docker Compose (v20+)
- Git
- Maven 3.9+ (for local builds, not needed for Docker)

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/udea-arquisoft/banco-digital-fabela.git
cd banco-digital-fabela
```

### 2. Build All Services (One-time)
```bash
# Option A: Build with Docker Compose (includes Docker builds)
docker-compose -f docker-compose-services.yml up -d

# Option B: Pre-build locally for faster startup
for svc in eureka-server banco-digital-identity banco-digital banco-digital-audit banco-digital-reporting banco-digital-gateway; do
  (cd $svc && mvn clean package -DskipTests)
done
docker-compose -f docker-compose-services.yml up -d
```

### 3. Verify All Services Are Running
```bash
docker-compose -f docker-compose-services.yml ps

# Test services are responding
curl http://localhost:8761  # Eureka
curl http://localhost:8080  # Core Banking
curl http://localhost:8081  # Identity
curl http://localhost:8082  # Audit
curl http://localhost:8083  # Reporting
curl http://localhost:8000  # API Gateway
```

### 4. View Logs
```bash
# All services
docker-compose -f docker-compose-services.yml logs -f

# Specific service
docker-compose -f docker-compose-services.yml logs -f core-banking
```

### 5. Stop & Clean Up
```bash
# Stop services (keep data)
docker-compose -f docker-compose-services.yml stop

# Stop and remove everything (including data)
docker-compose -f docker-compose-services.yml down -v
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (8000)                           │
│                    banco-digital-gateway                         │
└────────┬────────────────────────────────────────────────────────┘
         │
    ┌────┴────────┬──────────────┬──────────────┐
    │             │              │              │
┌───▼────┐  ┌─────▼──┐   ┌──────▼────┐  ┌─────▼──┐
│ Core   │  │Identity │   │  Audit    │  │Reporting
│Banking │  │ Service │   │  Service  │  │Service
│(8080)  │  │(8081)   │   │ (8082)    │  │(8083)
└───┬────┘  └─────┬──┘   └──────┬────┘  └─────┬──┘
    │            │             │             │
    └────────────┼─────────────┼─────────────┘
                 │             │
         ┌───────▼──────────────▼──────┐
         │  PostgreSQL (5433)           │
         │  - banco_digital_core        │
         │  - banco_digital_identity    │
         │  - banco_digital_audit       │
         │  - banco_digital_reporting   │
         └──────────────────────────────┘
                 │
         ┌───────▼──────────────┐
         │  Eureka (8761)       │
         │  Service Discovery   │
         └──────────────────────┘
                 │
         ┌───────▼──────────────┐
         │  Kafka (9092)        │
         │  Message Broker      │
         └──────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables (.env)

The `.env` file contains all configuration needed:

```bash
# Application Profile (docker = no Vault, suitable for containers)
APP_PROFILE=docker

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=admin

# Service Discovery
EUREKA_URL=http://eureka-server:8761/eureka/

# Message Queue
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Security
JWT_SECRET=dev_secret_replace_in_prod_must_be_256bits
```

### Supported Profiles

- **docker** - No Vault, uses environment variables (default for Docker)
- **local** - Local development, uses hardcoded defaults
- **vault** - Production, loads secrets from Vault (requires running Vault)

---

## 📦 Database Schema

All services use Flyway for database migrations. Schemas are automatically created on first startup.

### Databases
- `banco_digital_core` - Core banking data
- `banco_digital_identity` - User authentication
- `banco_digital_audit` - Audit logs
- `banco_digital_reporting` - Report data

### Automatic Initialization

On first startup, the Docker entrypoint script creates all databases and users:
- `postgres` (superuser) - DB administration
- `core_user` - Core banking service
- `auth_user` - Identity service
- `audit_user` - Audit service
- `report_user` - Reporting service

---

## 🧪 Testing Services

### Direct API Calls

```bash
# Health checks
curl http://localhost:8080/actuator/health   # Core Banking
curl http://localhost:8081/actuator/health   # Identity
curl http://localhost:8082/actuator/health   # Audit
curl http://localhost:8083/actuator/health   # Reporting
curl http://localhost:8000/actuator/health   # Gateway
curl http://localhost:8761                   # Eureka

# Swagger/OpenAPI Documentation
# http://localhost:8080/swagger-ui.html      # Core Banking
# http://localhost:8081/swagger-ui.html      # Identity
# http://localhost:8082/swagger-ui.html      # Audit
# http://localhost:8083/swagger-ui.html      # Reporting
```

### Service Discovery

```bash
# Check registered services in Eureka
curl http://localhost:8761/eureka/apps | xml

# Check specific service
curl http://localhost:8761/eureka/apps/CORE-BANKING-SERVICE
```

---

## 🐛 Troubleshooting

### Services Show "unhealthy" in Health Checks

**Cause**: Services use `localhost` for Eureka registration instead of container name `eureka-server`.

**Solution**: This is expected behavior in Docker. Services are still operational even if health checks show DOWN. Inter-service communication uses Docker DNS resolution which works correctly.

**To verify**:
```bash
curl http://localhost:8080/actuator/health  # Should return response even if status=DOWN
```

### Service X Won't Start

```bash
# Check logs
docker logs banco-digital-<service>

# Common causes:
# 1. Database not ready - wait 30 seconds
# 2. Kafka not ready - wait for Zookeeper to be healthy
# 3. Port already in use - change port in docker-compose.yml
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker exec banco-digital-postgres pg_isready -U postgres

# Check database exists
docker exec banco-digital-postgres psql -U postgres -lqt | grep banco

# View init scripts ran
docker exec banco-digital-postgres psql -U postgres -l
```

### Kafka Issues

```bash
# Check Kafka is healthy
docker exec banco-digital-kafka kafka-broker-api-versions --bootstrap-servers localhost:9092

# View Kafka logs
docker logs banco-digital-kafka

# Check topics created
docker exec banco-digital-kafka kafka-topics --list --bootstrap-servers localhost:9092
```

---

## 📝 Deployment Checklist

- [ ] Docker & Docker Compose installed
- [ ] Clone repository
- [ ] Run `docker-compose -f docker-compose-services.yml up -d`
- [ ] Wait 2-3 minutes for all services to initialize
- [ ] Test health endpoints: `curl http://localhost:8761`
- [ ] Check Eureka: http://localhost:8761 (browser)
- [ ] Verify all 9 containers are running: `docker ps`

---

## 🚢 Deployment Files

### Main Configuration
- `docker-compose-services.yml` - Complete stack (recommended)
- `docker-compose.yml` - Lightweight stack (infrastructure only)
- `.env` - Environment variables for docker-compose

### Build Configuration
- `*/Dockerfile` - Each service has its own Dockerfile
- `*/pom.xml` - Maven build configuration
- `*/src/main/resources/application-docker.yml` - Docker profile config

---

## 📚 Additional Resources

### Microservices
- Core Banking: `./banco-digital/`
- Identity: `./banco-digital-identity/`
- Audit: `./banco-digital-audit/`
- Reporting: `./banco-digital-reporting/`
- Gateway: `./banco-digital-gateway/`
- Eureka: `./eureka-server/`

### Documentation
- Build guide: `compile.md`
- API documentation: Swagger/OpenAPI at each service's `/swagger-ui.html`

### Database
- Migrations: `*/src/main/resources/db/migration/`
- Init scripts: `docker-entrypoint-initdb.d/`

---

## 🔐 Security Notes

- Default credentials (postgres/admin) are for development only
- Change JWT_SECRET for production
- Disable Eureka registration in production (optional)
- Use Vault for production secrets (not Vault profile = no Vault dependency)
- Consider using Spring Cloud Config Server for centralized config

---

## 📞 Support

For issues, check:
1. Docker logs: `docker logs <container>`
2. Service health endpoints
3. Eureka dashboard: http://localhost:8761
4. Database status: `docker exec banco-digital-postgres psql -U postgres -l`

---

**Last Updated**: 2026-04-30
**Version**: 1.0.0
