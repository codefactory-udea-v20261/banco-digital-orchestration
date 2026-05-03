# 🚀 Despliegue en Google Cloud Platform (GCP)

## Opciones de Despliegue

Tienes **3 opciones principales** para desplegar en GCP:

---

## OPCIÓN 1: Cloud Run (RECOMENDADO - La más económica)

### ✅ Ventajas:
- **Serverless** - Pagas solo por ejecución
- **Sin servidor que mantener** - GCP lo maneja
- **Escalado automático**
- **Ideal para microservicios** - Cada servicio es un contenedor independiente
- **Costo: ~$0.00001667 por GB-segundo** (muy económico)

### ❌ Desventajas:
- Timeout máximo 60 minutos
- No es ideal si necesitas conectar múltiples contenedores en tiempo real

### 🔧 Cómo desplegar en Cloud Run:

```bash
# 1. Instalar Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 2. Autenticarse
gcloud auth login
gcloud config set project tu-proyecto-gcp

# 3. Para cada servicio, construir y desplegar:
for svc in eureka-server banco-digital-identity banco-digital \
           banco-digital-audit banco-digital-reporting banco-digital-gateway; do
  
  # Construir imagen
  cd $svc
  gcloud builds submit --tag gcr.io/tu-proyecto/banco-digital-$svc:latest
  
  # Desplegar en Cloud Run
  gcloud run deploy banco-digital-$svc \
    --image gcr.io/tu-proyecto/banco-digital-$svc:latest \
    --platform managed \
    --region us-central1 \
    --memory 512M \
    --cpu 1 \
    --timeout 600 \
    --set-env-vars APP_PROFILE=docker,EUREKA_URL=http://eureka-url
  
  cd ..
done
```

---

## OPCIÓN 2: Cloud Run with Docker Compose (SIMPLIFICADO)

**NOTA:** Cloud Run no soporta nativamente docker-compose, pero puedes:

1. **Usar Cloud Build + Artifact Registry** para construir múltiples imágenes
2. **Desplegar cada servicio por separado**
3. **Usar Cloud SQL** para PostgreSQL (administrado por GCP)
4. **Usar Cloud Pub/Sub** en lugar de Kafka (si aplica)

```bash
# Simplificado:
gcloud builds submit --config cloudbuild.yaml
```

---

## OPCIÓN 3: Google Kubernetes Engine (GKE) - La más robusta

### ✅ Ventajas:
- **Contenedor Docker completo**
- **Soporte completo para docker-compose**
- **Mejor control y flexibilidad**
- **Ideal para aplicaciones grandes**

### ❌ Desventajas:
- **Más caro** (~$0.25 por hora por nodo mínimo)
- **Requiere más configuración**
- **Tienes que mantener actualizado el cluster**

### 🔧 Cómo desplegar en GKE:

```bash
# 1. Crear cluster GKE
gcloud container clusters create banco-digital-cluster \
  --zone us-central1-a \
  --num-nodes 2 \
  --machine-type n1-standard-1

# 2. Obtener credenciales
gcloud container clusters get-credentials banco-digital-cluster \
  --zone us-central1-a

# 3. Desplegar docker-compose
kubectl apply -f docker-compose-services.yml

# 4. Exponer servicios
kubectl expose deployment banco-digital-gateway --type LoadBalancer --port 80 --target-port 8000
```

---

## OPCIÓN 4: Compute Engine (VM) - La más manual

Simplemente:
1. Crear VM en GCP
2. Instalar Docker y Docker Compose
3. Clonar repositorio
4. Ejecutar `docker-compose -f docker-compose-services.yml up -d`
5. Configurar Static IP y Domain

**Desventaja:** Tienes que mantener todo manualmente.

---

## 🎯 RECOMENDACIÓN FINAL

### Para tu caso (6 microservicios + 3 infraestructura):

**OPCIÓN MEJOR RELACIÓN COSTO-BENEFICIO: Cloud Run + Cloud SQL**

**Por qué:**
1. ✅ Serverless = sin servidores que mantener
2. ✅ Costo muy bajo ($20-50/mes si tienes poco tráfico)
3. ✅ Escalado automático
4. ✅ Ideal para microservicios
5. ✅ PostgreSQL administrado (Cloud SQL)

**Limitaciones a considerar:**
- Kafka (Cloud Pub/Sub alternative)
- Zookeeper (no necesario en Cloud Pub/Sub)

---

## 🛠️ CONFIGURACIÓN RECOMENDADA

### Arquitectura propuesta para Cloud Run:

```
┌─────────────────────────────────────┐
│   Cloud Load Balancer (TCP/HTTP)    │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐  ┌───▼──┐  ┌────▼──┐
    │API   │  │Auth  │  │Core   │
    │Gate  │  │Srv   │  │Bank   │
    │Run   │  │Run   │  │Run    │
    └───┬──┘  └───┬──┘  └────┬──┘
        │         │         │
    ┌───▼─────────▼─────────▼──┐
    │   Cloud SQL (PostgreSQL)  │
    │   (Managed Database)      │
    └───────────────────────────┘
    
    Cloud Pub/Sub (Event streaming)
```

---

## 📝 PASOS PARA DESPLEGAR EN CLOUD RUN

### Paso 1: Preparar proyecto GCP

```bash
# 1.1 Instalar gcloud SDK (si no está)
curl https://sdk.cloud.google.com | bash

# 1.2 Autenticarse
gcloud auth login

# 1.3 Crear proyecto (si no existe)
gcloud projects create banco-digital-prod --name="Banco Digital"

# 1.4 Establecer proyecto actual
gcloud config set project banco-digital-prod

# 1.5 Habilitar APIs necesarias
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Paso 2: Crear PostgreSQL administrado

```bash
# Crear instancia Cloud SQL
gcloud sql instances create banco-digital-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=ROOT_PASSWORD_AQUI

# Crear bases de datos
gcloud sql databases create banco_digital_core --instance=banco-digital-db
gcloud sql databases create identity --instance=banco-digital-db
gcloud sql databases create audit --instance=banco-digital-db
gcloud sql databases create reporting --instance=banco-digital-db
```

### Paso 3: Desplegar servicios en Cloud Run

```bash
# Para cada servicio:
cd banco-digital
gcloud run deploy banco-digital-core \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512M \
  --set-env-vars \
    APP_PROFILE=docker,\
    DB_HOST=CLOUD_SQL_IP,\
    DB_USER=postgres,\
    DB_PASSWORD=PASSWORD

cd ../banco-digital-gateway
gcloud run deploy banco-digital-gateway \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512M \
  # ... similar
```

### Paso 4: Configurar acceso

```bash
# Crear servicio de proxy para Cloud SQL
gcloud sql proxy \
  --instances=banco-digital-prod:us-central1:banco-digital-db=tcp:5432
```

---

## 💰 ESTIMADO DE COSTOS MENSUALES

### Cloud Run (Recomendado):
- **Invocaciones:** ~$0.40/millón
- **Memoria:** ~$0.0000041/GB-segundo
- **Con ~1000 req/día:** ~$10-20/mes

### Cloud SQL (PostgreSQL):
- **Instancia db-f1-micro:** ~$7.67/mes
- **Storage:** ~$0.18/GB/mes

### **TOTAL: ~$20-30/mes** ✅ (muy económico)

---

## 🚨 CONSIDERACIONES IMPORTANTES

1. **Migraciones Flyway:** Se ejecutan automáticamente al iniciar
2. **Variables de entorno:** Configurar via `--set-env-vars` en Cloud Run
3. **Secret Manager:** Usar para credenciales sensibles
4. **Monitoreo:** Google Cloud Console proporciona logs automáticos
5. **Auto-scaling:** Cloud Run escala automáticamente

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Puedo usar Kafka en Cloud Run?**
R: No. Usa Cloud Pub/Sub en su lugar (compatible con el código actual)

**P: ¿Qué pasa si mi aplicación se ejecuta más de 60 minutos?**
R: Cloud Run tiene timeout de 60 min. Para procesos largos, usa Cloud Tasks

**P: ¿Cloud SQL está siempre disponible?**
R: Sí, es un servicio administrado. GCP mantiene uptime 99.95%

---

## 📞 PRÓXIMOS PASOS

1. **Decidir opción de despliegue** (recomiendo Cloud Run)
2. **Crear proyecto GCP**
3. **Ejecutar scripts de configuración**
4. **Desplegar servicios**
5. **Configurar dominio custom**
6. **Monitoreo y alertas**

¿Necesitas ayuda con alguno de estos pasos?

