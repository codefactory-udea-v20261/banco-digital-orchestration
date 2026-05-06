#!/bin/bash
# deploy-database.sh — Setup completo de Cloud SQL para Banco Digital
# Uso: ./deploy-database.sh
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-project-2183efe1-b87d-4c12-966}"
INSTANCE="${GCP_SQL_INSTANCE:-banco-digital-db}"
REGION="${GCP_REGION:-us-central1}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-BancoDigitalAdmin2024!}"

echo "========================================="
echo "  Banco Digital — Database Setup"
echo "  Project: $PROJECT"
echo "  Instance: $INSTANCE"
echo "========================================="

# 1. Crear bases de datos
echo ""
echo "=== 1. Creando bases de datos ==="
for db in banco_digital_core banco_digital_identity banco_digital_audit banco_digital_reporting; do
  echo -n "  $db: "
  gcloud sql databases create $db --instance=$INSTANCE --project=$PROJECT 2>/dev/null \
    && echo "creada" || echo "ya existe"
done

# 2. Crear usuarios
echo ""
echo "=== 2. Creando usuarios ==="
declare -A USERS=(
  ["auth_user"]="IdentityAuth456!"
  ["core_user"]="CoreBanking123!"
  ["audit_user"]="AuditService789!"
  ["report_user"]="ReportingBD101!"
)

for user in "${!USERS[@]}"; do
  echo -n "  $user: "
  gcloud sql users create $user \
    --instance=$INSTANCE --project=$PROJECT \
    --password="${USERS[$user]}" 2>/dev/null \
    && echo "creado" || echo "ya existe"
done

# 3. Autorizar IP local
echo ""
echo "=== 3. Autorizando IP local ==="
MY_IP=$(curl -s https://api.ipify.org)
echo "  IP: $MY_IP"
gcloud sql instances patch $INSTANCE --project=$PROJECT \
  --authorized-networks="$MY_IP/32" --quiet

# 4. Establecer password de postgres
echo ""
echo "=== 4. Configurando password de postgres ==="
gcloud sql users set-password postgres --instance=$INSTANCE \
  --project=$PROJECT --password="$POSTGRES_PASSWORD" --quiet

# 5. Obtener IP de Cloud SQL
echo ""
echo "=== 5. Obteniendo IP de Cloud SQL ==="
SQL_IP=$(gcloud sql instances describe $INSTANCE \
  --project=$PROJECT --format="value(ipAddresses[0].ipAddress)")
echo "  IP: $SQL_IP"

# 6. Otorgar permisos
echo ""
echo "=== 6. Otorgando permisos ==="
export PGPASSWORD="$POSTGRES_PASSWORD"

declare -A DB_USER_MAP=(
  ["banco_digital_identity"]="auth_user"
  ["banco_digital_core"]="core_user"
  ["banco_digital_audit"]="audit_user"
  ["banco_digital_reporting"]="report_user"
)

for db in "${!DB_USER_MAP[@]}"; do
  user="${DB_USER_MAP[$db]}"
  echo "  $user → $db"
  psql -h "$SQL_IP" -U postgres -d "$db" -c "GRANT ALL PRIVILEGES ON DATABASE $db TO $user;" 2>/dev/null || true
  psql -h "$SQL_IP" -U postgres -d "$db" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $user;" 2>/dev/null || true
  psql -h "$SQL_IP" -U postgres -d "$db" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $user;" 2>/dev/null || true
  psql -h "$SQL_IP" -U postgres -d "$db" -c "GRANT ALL ON SCHEMA public TO $user;" 2>/dev/null || true
  psql -h "$SQL_IP" -U postgres -d "$db" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $user;" 2>/dev/null || true
  psql -h "$SQL_IP" -U postgres -d "$db" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $user;" 2>/dev/null || true
done

echo ""
echo "========================================="
echo "  ✅ Base de datos configurada"
echo "  SQL IP: $SQL_IP"
echo "========================================="
