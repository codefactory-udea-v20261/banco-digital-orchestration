#!/bin/bash

# Vault Initialization Script for Banco Digital Microservices
# This script initializes Vault with all required policies, auth methods, and secrets

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"

echo "======================================================================"
echo "🔐 VAULT INITIALIZATION - BANCO DIGITAL MICROSERVICES"
echo "======================================================================"

# Wait for Vault to be ready
echo "⏳ Waiting for Vault to be ready..."
for i in {1..30}; do
    if curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
        echo "✅ Vault is ready!"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

export VAULT_ADDR

# ─────────────────────────────────────────────────────────────────────────
# 1. ENABLE DATABASE SECRET ENGINE (for credential rotation)
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "📌 Step 1: Enabling Database Secret Engine"
vault secrets enable -version=2 database || echo "Database engine already enabled"

# ─────────────────────────────────────────────────────────────────────────
# 2. CONFIGURE DATABASE CONNECTION
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 2: Configuring PostgreSQL Connection"
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="core-user,auth-user,audit-user,report-user" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/postgres" \
  username="postgres" \
  password="admin"

# ─────────────────────────────────────────────────────────────────────────
# 3. CREATE DATABASE ROLES FOR EACH SERVICE
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 3: Creating Database Roles"

# Core Banking Service Role
vault write database/roles/core-user \
  db_name=postgresql \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; 
    GRANT CONNECT ON DATABASE banco_digital_core TO \"{{name}}\";
    GRANT USAGE ON SCHEMA public TO \"{{name}}\";
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Identity Service Role
vault write database/roles/auth-user \
  db_name=postgresql \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; 
    GRANT CONNECT ON DATABASE banco_digital_identity TO \"{{name}}\";
    GRANT USAGE ON SCHEMA public TO \"{{name}}\";
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Audit Service Role
vault write database/roles/audit-user \
  db_name=postgresql \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; 
    GRANT CONNECT ON DATABASE banco_digital_audit TO \"{{name}}\";
    GRANT USAGE ON SCHEMA public TO \"{{name}}\";
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Reporting Service Role
vault write database/roles/report-user \
  db_name=postgresql \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; 
    GRANT CONNECT ON DATABASE banco_digital_reporting TO \"{{name}}\";
    GRANT USAGE ON SCHEMA public TO \"{{name}}\";
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"{{name}}\";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# ─────────────────────────────────────────────────────────────────────────
# 4. CREATE KV (KEY-VALUE) SECRET ENGINE FOR APPLICATION SECRETS
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 4: Enabling KV Secret Engine for Application Secrets"
vault secrets enable -version=2 -path=secret kv || echo "KV engine already enabled"

# ─────────────────────────────────────────────────────────────────────────
# 5. STORE APPLICATION SECRETS
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 5: Storing Application Secrets"

# Core Banking Service Secrets
vault kv put secret/core-banking \
  jwt_secret="core_banking_jwt_secret_min_256bits_for_production_environment" \
  service_name="core-banking-service" \
  app_profile="prod"

# Identity Service Secrets
vault kv put secret/identity \
  jwt_secret="identity_service_jwt_secret_min_256bits_for_production_environment" \
  jwt_expiration_ms="3600000" \
  jwt_refresh_expiration_ms="86400000" \
  login_max_failed_attempts="3" \
  login_lockout_minutes="15" \
  default_client_password="SecureTemp1234!" \
  service_name="identity-service" \
  app_profile="prod"

# Audit Service Secrets
vault kv put secret/audit \
  service_name="audit-service" \
  app_profile="prod"

# Reporting Service Secrets
vault kv put secret/reporting \
  service_name="reporting-service" \
  app_profile="prod"

# ─────────────────────────────────────────────────────────────────────────
# 6. ENABLE APPROLE AUTH METHOD (for microservices authentication)
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 6: Enabling AppRole Auth Method"
vault auth enable approle || echo "AppRole already enabled"

# ─────────────────────────────────────────────────────────────────────────
# 7. CREATE APPROLE ROLES FOR EACH SERVICE
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 7: Creating AppRole Roles for Services"

# Core Banking AppRole
vault write auth/approle/role/core-banking \
  token_ttl=1h \
  token_max_ttl=24h \
  token_policies="core-banking-policy" \
  policies="core-banking-policy"

# Identity Service AppRole
vault write auth/approle/role/identity \
  token_ttl=1h \
  token_max_ttl=24h \
  token_policies="identity-policy" \
  policies="identity-policy"

# Audit Service AppRole
vault write auth/approle/role/audit \
  token_ttl=1h \
  token_max_ttl=24h \
  token_policies="audit-policy" \
  policies="audit-policy"

# Reporting Service AppRole
vault write auth/approle/role/reporting \
  token_ttl=1h \
  token_max_ttl=24h \
  token_policies="reporting-policy" \
  policies="reporting-policy"

# ─────────────────────────────────────────────────────────────────────────
# 8. CREATE POLICIES FOR EACH SERVICE
# ─────────────────────────────────────────────────────────────────────────

echo "📌 Step 8: Creating Vault Policies"

# Core Banking Policy
vault policy write core-banking-policy - <<EOF
path "database/creds/core-user" {
  capabilities = ["read"]
}
path "secret/data/core-banking/*" {
  capabilities = ["read", "list"]
}
EOF

# Identity Policy
vault policy write identity-policy - <<EOF
path "database/creds/auth-user" {
  capabilities = ["read"]
}
path "secret/data/identity/*" {
  capabilities = ["read", "list"]
}
EOF

# Audit Policy
vault policy write audit-policy - <<EOF
path "database/creds/audit-user" {
  capabilities = ["read"]
}
path "secret/data/audit/*" {
  capabilities = ["read", "list"]
}
EOF

# Reporting Policy
vault policy write reporting-policy - <<EOF
path "database/creds/report-user" {
  capabilities = ["read"]
}
path "secret/data/reporting/*" {
  capabilities = ["read", "list"]
}
EOF

# ─────────────────────────────────────────────────────────────────────────
# 9. GENERATE ROLE-ID AND SECRET-ID FOR EACH SERVICE
# ─────────────────────────────────────────────────────────────────────────

echo ""
echo "📌 Step 9: Generating AppRole Credentials"
echo ""

# Core Banking Credentials
echo "🔐 CORE BANKING SERVICE"
CORE_ROLE_ID=$(vault read -field=role_id auth/approle/role/core-banking/role-id)
CORE_SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/core-banking/secret-id)
echo "  ROLE_ID:   $CORE_ROLE_ID"
echo "  SECRET_ID: $CORE_SECRET_ID"
echo "  Store these in .env or secrets management"
echo ""

# Identity Service Credentials
echo "🔐 IDENTITY SERVICE"
IDENTITY_ROLE_ID=$(vault read -field=role_id auth/approle/role/identity/role-id)
IDENTITY_SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/identity/secret-id)
echo "  ROLE_ID:   $IDENTITY_ROLE_ID"
echo "  SECRET_ID: $IDENTITY_SECRET_ID"
echo "  Store these in .env or secrets management"
echo ""

# Audit Service Credentials
echo "🔐 AUDIT SERVICE"
AUDIT_ROLE_ID=$(vault read -field=role_id auth/approle/role/audit/role-id)
AUDIT_SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/audit/secret-id)
echo "  ROLE_ID:   $AUDIT_ROLE_ID"
echo "  SECRET_ID: $AUDIT_SECRET_ID"
echo "  Store these in .env or secrets management"
echo ""

# Reporting Service Credentials
echo "🔐 REPORTING SERVICE"
REPORTING_ROLE_ID=$(vault read -field=role_id auth/approle/role/reporting/role-id)
REPORTING_SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/reporting/secret-id)
echo "  ROLE_ID:   $REPORTING_ROLE_ID"
echo "  SECRET_ID: $REPORTING_SECRET_ID"
echo "  Store these in .env or secrets management"
echo ""

# ─────────────────────────────────────────────────────────────────────────
# 10. SUMMARY
# ─────────────────────────────────────────────────────────────────────────

echo "======================================================================"
echo "✅ VAULT INITIALIZATION COMPLETE"
echo "======================================================================"
echo ""
echo "🔑 NEXT STEPS:"
echo "  1. Store AppRole credentials in .env files:"
echo "     VAULT_ROLE_ID=<role_id>"
echo "     VAULT_SECRET_ID=<secret_id>"
echo ""
echo "  2. Add Spring Cloud Config Client to pom.xml"
echo ""
echo "  3. Create bootstrap.yml in each service with:"
echo "     spring.cloud.vault.authentication=approle"
echo "     spring.cloud.vault.app-role.role-id=\${VAULT_ROLE_ID}"
echo "     spring.cloud.vault.app-role.secret-id=\${VAULT_SECRET_ID}"
echo ""
echo "  4. Update application.yml to use Vault properties"
echo ""
echo "======================================================================"
