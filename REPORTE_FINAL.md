# Reporte de Correcciones y Ejecución - Banco Digital Fabela

Este documento detalla las acciones realizadas para estabilizar y poner en funcionamiento todos los microservicios del proyecto.

## Proyectos Identificados
- **eureka-server**: Servidor de descubrimiento (Puerto 8761)
- **banco-digital-gateway**: API Gateway (Puerto 8000)
- **banco-digital-identity**: Servicio de Identidad y Autenticación (Puerto 8081)
- **banco-digital** (core-banking): Servicio central bancario (Puerto 8080)
- **banco-digital-audit**: Servicio de Auditoría (Puerto 8082)
- **banco-digital-reporting**: Servicio de Reportes (Puerto 8083)
- **Infraestructura**: PostgreSQL, Kafka, Zookeeper, Redis, Vault.

## Errores Encontrados y Soluciones

### 1. Permisos de Base de Datos (PostgreSQL 15+)
- **Error**: `permission denied for schema public` y `permission denied to create role`.
- **Causa**: PostgreSQL 15 cambió los permisos por defecto del esquema `public`. Flyway intentaba crear tablas e índices y fallaba.
- **Solución**: Se actualizó el script `docker-entrypoint-initdb.d/01-init-users.sql` para otorgar `GRANT ALL ON SCHEMA public` a cada usuario de servicio y el atributo `CREATEROLE`.

### 2. Expansión de Variables de Entorno en Docker
- **Error**: Los contenedores iniciaban con el perfil `${APP_PROFILE}` (literal) en lugar de `docker`.
- **Causa**: El uso de la forma de ejecución (array) en `ENTRYPOINT` del Dockerfile impide que la shell expanda las variables de entorno.
- **Solución**: Se cambió el `ENTRYPOINT` a la forma de shell: `ENTRYPOINT ["sh", "-c", "java ..."]` en todos los Dockerfiles.

### 3. Jerarquía de Configuración de Eureka
- **Error**: Los servicios no se registraban en Eureka a pesar de tener la URL correcta en las variables de entorno.
- **Causa**: En los archivos `application.yml`, el bloque `eureka:` estaba anidado erróneamente bajo `spring:`. Spring Cloud busca `eureka:` en el nivel superior.
- **Solución**: Se movió el bloque `eureka:` al nivel superior en todos los archivos `application.yml`.

### 4. Dependencia de Redis Faltante
- **Error**: `Connection refused: localhost/127.0.0.1:6379` al iniciar el servicio de identidad.
- **Causa**: Los servicios utilizan Redis para caché/tokens, pero no estaba definido en `docker-compose-services.yml`.
- **Solución**: Se agregó un servicio `redis` al archivo `docker-compose-services.yml` y se configuró `SPRING_DATA_REDIS_HOST` en los servicios.

### 5. Configuración Local (Sin Docker)
- **Error**: Conflictos con variables de entorno del sistema (como `DB_PASSWORD` o `DB_HOST`).
- **Causa**: Los archivos `application-local.yml` usaban nombres de variables genéricos que colisionaban con el entorno del host.
- **Solución**: Se actualizaron los archivos `application-local.yml` para usar variables más específicas (ej: `IDENTITY_DB_PASSWORD`) y se ajustaron los puertos por defecto para Kafka (29092 para acceso desde el host).

## Instrucciones de Ejecución

### Opción A: Con Docker (Recomendado)
1. Construir las imágenes:
   ```bash
   docker compose -f docker-compose-services.yml build
   ```
2. Levantar todo el sistema:
   ```bash
   docker compose -f docker-compose-services.yml up -d
   ```
3. Verificar estado:
   ```bash
   docker compose -f docker-compose-services.yml ps
   ```

### Opción B: Sin Docker (Local)
1. Levantar solo la infraestructura necesaria:
   ```bash
   docker compose -f docker-compose-services.yml up -d postgres redis zookeeper kafka
   ```
2. Iniciar Eureka Server:
   ```bash
   cd eureka-server && ./mvnw spring-boot:run
   ```
3. Iniciar cada microservicio (en terminales separadas):
   ```bash
   cd [directorio-del-servicio] && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
   ```
   *Nota: Asegúrese de que no existan variables de entorno como DB_HOST o DB_PASSWORD en su terminal que puedan interferir.*

## Archivos Modificados
- `docker-entrypoint-initdb.d/01-init-users.sql`
- `docker-compose-services.yml`
- `eureka-server/Dockerfile`, `eureka-server/src/main/resources/application.yml`
- `banco-digital-gateway/Dockerfile`, `banco-digital-gateway/src/main/resources/application.yml`, `banco-digital-gateway/src/main/resources/application-local.yml`
- `banco-digital-identity/Dockerfile`, `banco-digital-identity/src/main/resources/application.yml`, `banco-digital-identity/src/main/resources/application-local.yml`
- `banco-digital/Dockerfile`, `banco-digital/src/main/resources/application.yml`, `banco-digital/src/main/resources/application-local.yml`
- `banco-digital-audit/Dockerfile`, `banco-digital-audit/src/main/resources/application.yml`, `banco-digital-audit/src/main/resources/application-local.yml`
- `banco-digital-reporting/Dockerfile`, `banco-digital-reporting/src/main/resources/application.yml`, `banco-digital-reporting/src/main/resources/application-local.yml`

## Validación Final
Se verificó que el Gateway (puerto 8000) redirige correctamente a los servicios y que todos los servicios aparecen registrados en Eureka (puerto 8761).
