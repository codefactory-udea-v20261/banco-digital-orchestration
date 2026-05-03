#!/bin/bash
# deploy-full.sh — Despliegue completo de todos los microservicios a Cloud Run
# Uso: ./deploy-full.sh
set -euo pipefail

REGION="${GCP_REGION:-us-central1}"
PROJECT="${GCP_PROJECT_ID:-project-2183efe1-b87d-4c12-966}"
SQL_INSTANCE="${GCP_SQL_INSTANCE:-$PROJECT:$REGION:banco-digital-db}"
REPO="$REGION-docker.pkg.dev/$PROJECT/banco-digital-repo"
TAG=$(date +%Y%m%d%H%M%S)
JWT_SECRET="${JWT_SECRET:-MyS3cur3JwtS3cr3tK3yF0rBanc0D1g1talPr0j3ct2024!}"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================="
echo "  Banco Digital — Full Deploy"
echo "  Tag: $TAG"
echo "  Project: $PROJECT"
echo "  Region: $REGION"
echo "========================================="

# 1. Configurar Docker auth
echo ""
echo "=== 1. Configurar Docker auth ==="
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# 2. Build y push de todas las imágenes
echo ""
echo "=== 2. Build y Push ==="

declare -A SERVICES=(
  ["banco-digital-identity"]="identity"
  ["banco-digital-audit"]="audit"
  ["banco-digital-reporting"]="reporting"
  ["banco-digital"]="core-banking"
  ["banco-digital-gateway"]="gateway"
)

for dir in "${!SERVICES[@]}"; do
  img="${SERVICES[$dir]}"
  echo "  Building $dir → $img:$TAG"
  cd "$BASE_DIR/$dir"
  docker build -t "$REPO/$img:$TAG" . 2>&1 | tail -1
  echo "  Pushing $img:$TAG"
  docker push "$REPO/$img:$TAG" 2>&1 | tail -1
done

# 3. Deploy backend services
echo ""
echo "=== 3. Deploy backend services ==="

declare -A DB_CONFIG=(
  ["identity"]="banco_digital_identity:auth_user:IdentityAuth456!"
  ["audit"]="banco_digital_audit:audit_user:AuditService789!"
  ["reporting"]="banco_digital_reporting:report_user:ReportingBD101!"
  ["core-banking"]="banco_digital_core:core_user:CoreBanking123!"
)

for svc in identity audit reporting core-banking; do
  IFS=':' read -r db user pass <<< "${DB_CONFIG[$svc]}"
  echo "  Deploying $svc..."
  gcloud run deploy "$svc" \
    --image "$REPO/$svc:$TAG" \
    --region "$REGION" --project "$PROJECT" \
    --add-cloudsql-instances="$SQL_INSTANCE" \
    --memory=512Mi --cpu=1 --timeout=600 \
    --allow-unauthenticated \
    --set-env-vars="APP_PROFILE=prod,SPRING_PROFILES_ACTIVE=prod,SPRING_DATASOURCE_URL=jdbc:postgresql:///$db?cloudSqlInstance=$SQL_INSTANCE&socketFactory=com.google.cloud.sql.postgres.SocketFactory,SPRING_DATASOURCE_USERNAME=$user,SPRING_DATASOURCE_PASSWORD=$pass,JWT_SECRET=$JWT_SECRET,SPRING_CLOUD_VAULT_ENABLED=false" \
    --quiet 2>&1 | grep "Service URL" || true
done

# 4. Get backend URLs
echo ""
echo "=== 4. Obtener URLs ==="
IDENTITY_URL=$(gcloud run services describe identity --region "$REGION" --project "$PROJECT" --format="value(status.url)")
CORE_URL=$(gcloud run services describe core-banking --region "$REGION" --project "$PROJECT" --format="value(status.url)")
AUDIT_URL=$(gcloud run services describe audit --region "$REGION" --project "$PROJECT" --format="value(status.url)")
REPORTING_URL=$(gcloud run services describe reporting --region "$REGION" --project "$PROJECT" --format="value(status.url)")

echo "  Identity:     $IDENTITY_URL"
echo "  Core Banking: $CORE_URL"
echo "  Audit:        $AUDIT_URL"
echo "  Reporting:    $REPORTING_URL"

# 5. Deploy gateway con URLs directas
echo ""
echo "=== 5. Deploy Gateway ==="
gcloud run deploy gateway \
  --image "$REPO/gateway:$TAG" \
  --region "$REGION" --project "$PROJECT" \
  --memory=512Mi --cpu=1 --timeout=600 \
  --allow-unauthenticated \
  --set-env-vars="APP_PROFILE=prod,JWT_SECRET=$JWT_SECRET,IDENTITY_SERVICE_URL=$IDENTITY_URL,CORE_BANKING_SERVICE_URL=$CORE_URL,AUDIT_SERVICE_URL=$AUDIT_URL,REPORTING_SERVICE_URL=$REPORTING_URL,SPRING_CLOUD_VAULT_ENABLED=false" \
  --quiet 2>&1 | grep "Service URL" || true

GATEWAY_URL=$(gcloud run services describe gateway --region "$REGION" --project "$PROJECT" --format="value(status.url)")

# 6. Smoke tests
echo ""
echo "=== 6. Smoke Tests ==="
sleep 10

for svc in identity audit reporting core-banking gateway; do
  url=$(gcloud run services describe "$svc" --region "$REGION" --project "$PROJECT" --format="value(status.url)")
  status=$(curl -s -o /dev/null -w "%{http_code}" "${url}/actuator/health" --max-time 15 2>/dev/null || echo "timeout")
  echo "  $svc: HTTP $status"
done

echo ""
echo "  Login test (gateway):"
curl -s -X POST "${GATEWAY_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"correo":"test@test.com","clave":"test"}' --max-time 15 2>/dev/null | head -c 200
echo ""

echo ""
echo "========================================="
echo "  ✅ Deploy completo"
echo "  Gateway: $GATEWAY_URL"
echo "========================================="
