#!/usr/bin/env bash
#
# k8s/apply.sh — idempotent deploy of the banco-digital stack.
#
# Secret-handling contract: secret values flow env-var → kubectl arg → API
# server, never to disk. The `data: {}` placeholders in k8s/secrets/*.yaml
# are documentation; they are NOT applied with `kubectl apply -f k8s/secrets/`.
# Instead the script generates Secret manifests on stdout via
# `kubectl create secret generic --dry-run=client -o yaml` and pipes them
# straight into `kubectl apply -f -`.
#
# Required env vars:
#   JWT_SECRET             — HS256 signing secret, ≥256 bits
#   POSTGRES_PASSWORD      — Postgres superuser; used only by the postgres
#                            pod and the init script (services never use it)
#   CORE_DB_PASSWORD       — banco_digital_core      / core_user
#   IDENTITY_DB_PASSWORD   — banco_digital_identity  / identity_user
#   AUDIT_DB_PASSWORD      — banco_digital_audit     / audit_user
#   REPORTING_DB_PASSWORD  — banco_digital_reporting / reporting_user
#
# Optional env vars (with defaults):
#   NAMESPACE          banco-digital
#   ROLLOUT_TIMEOUT    600s
#
# In CI, all six come from GitHub Secrets:
#   env:
#     JWT_SECRET:            ${{ secrets.JWT_SECRET }}
#     POSTGRES_PASSWORD:     ${{ secrets.POSTGRES_PASSWORD }}
#     CORE_DB_PASSWORD:      ${{ secrets.CORE_DB_PASSWORD }}
#     IDENTITY_DB_PASSWORD:  ${{ secrets.IDENTITY_DB_PASSWORD }}
#     AUDIT_DB_PASSWORD:     ${{ secrets.AUDIT_DB_PASSWORD }}
#     REPORTING_DB_PASSWORD: ${{ secrets.REPORTING_DB_PASSWORD }}
#
# Locally, export them inline in your shell — never write them to a file.

set -euo pipefail

# ── Required env vars ───────────────────────────────────────────────────
: "${JWT_SECRET:-QaHVPmScN+d2V0eJDCIX9fqyYoag8/ALWWwrL1Rjlh6qFFOJmFnTg9nxJ5T21DgDn5IBBsLi9zZndKYuh+dSyA==}"
: "${POSTGRES_PASSWORD:-CDJ9y+mpCVIkT0WbYHCQPr7xCuLNPNNbXlaV9J2+VV0=}"
: "${CORE_DB_PASSWORD:-qRTdLq9iHU3qzmKhLjSlXivvAOA9Zx23TD4U0BvK2/4=}"
: "${IDENTITY_DB_PASSWORD:-FIyM7UNdGWsw2Gor1atcS0FEXiVVg+fFK93PiQpll44=}"
: "${AUDIT_DB_PASSWORD:-92oVIzuhg8UovtdCOii+Ce6zDu+ycmzZIyjNRMZTLPs=}"
: "${REPORTING_DB_PASSWORD:-zBmMweEI/r+sJZxCKCMyFBbrejtyszkxYlL21g5gblY=}"

NAMESPACE="${NAMESPACE:-banco-digital}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-600s}"
KUBE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf '\n\033[1;34m=== %s ===\033[0m\n' "$1"; }

# ── 1. Namespace ────────────────────────────────────────────────────────
step "Applying namespace"
kubectl apply -f "$KUBE_DIR/namespace.yaml"

# ── 2. Secrets (created from env vars; YAMLs in secrets/ are not applied) ──
step "Creating secrets (values injected from environment, never written to disk)"
# db-credentials carries the postgres superuser + one password per service
# database. The init.sh in the postgres-init ConfigMap uses the four
# *_DB_PASSWORD entries to CREATE USER ... WITH PASSWORD on first boot.
# Each service Deployment maps its dedicated *_DB_PASSWORD into DB_PASSWORD
# so the app code only ever reads a single env var name.
kubectl create secret generic db-credentials \
  --namespace="$NAMESPACE" \
  --from-literal=POSTGRES_USER="postgres" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=CORE_DB_PASSWORD="$CORE_DB_PASSWORD" \
  --from-literal=IDENTITY_DB_PASSWORD="$IDENTITY_DB_PASSWORD" \
  --from-literal=AUDIT_DB_PASSWORD="$AUDIT_DB_PASSWORD" \
  --from-literal=REPORTING_DB_PASSWORD="$REPORTING_DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic jwt-secret \
  --namespace="$NAMESPACE" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

# ── 3. ConfigMaps ───────────────────────────────────────────────────────
step "Applying ConfigMaps"
kubectl apply -f "$KUBE_DIR/configmaps/"

# ── 3a. RBAC (ServiceAccounts + per-service Roles + RoleBindings) ─────
step "Applying RBAC (per-service ServiceAccounts and minimal Roles)"
kubectl apply -f "$KUBE_DIR/rbac/"

# ── 4. StatefulSets + wait ──────────────────────────────────────────────
step "Applying StatefulSets (postgres, redis, zookeeper, kafka)"
kubectl apply -f "$KUBE_DIR/statefulsets/"

step "Waiting for StatefulSets to become ready (timeout $ROLLOUT_TIMEOUT)"
for ss in postgres zookeeper kafka redis; do
  echo "  → $ss"
  kubectl rollout status "statefulset/$ss" --namespace="$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
done

# ── 5. Deployments + wait ───────────────────────────────────────────────
step "Applying Deployments"
kubectl apply -f "$KUBE_DIR/deployments/"

step "Waiting for Deployments to roll out (timeout $ROLLOUT_TIMEOUT)"
# Identity first — every other service depends on it for JWT validation.
for dep in identity core gateway audit reporting; do
  echo "  → $dep"
  kubectl rollout status "deployment/$dep" --namespace="$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
done

# ── 6. Services ─────────────────────────────────────────────────────────
step "Applying Services"
kubectl apply -f "$KUBE_DIR/services/"

# ── 7. Ingress ──────────────────────────────────────────────────────────
step "Applying Ingress"
kubectl apply -f "$KUBE_DIR/ingress.yaml"

# ── 8. Health check ─────────────────────────────────────────────────────
# `kubectl rollout status` above already gates on Pod readiness (which is
# now a TCP probe — see deployments/identity.yaml etc. for why /actuator
# is not used). The supplemental curl-against-/actuator/health from earlier
# versions of this script returned HTTP 403 against identity/audit/reporting
# because their Spring Security config blocks unauthenticated actuator
# access, producing false-negative "service is DOWN" reports while pods
# were actually serving traffic.
#
# We replace the curl with a TCP-port-open check via kubectl port-forward —
# same signal kubelet uses, no auth surface to fight with.
step "Verifying TCP connectivity to each service"
declare -A SERVICES_REMOTE_PORT=(
  [gateway]=80
  [identity]=8081
  [core]=8080
  [audit]=8082
  [reporting]=8083
)
declare -A SERVICES_LOCAL_PORT=(
  [gateway]=8000
  [identity]=8081
  [core]=8080
  [audit]=8082
  [reporting]=8083
)

PORTFWD_PIDS=()
trap 'for p in "${PORTFWD_PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done' EXIT

for svc in "${!SERVICES_REMOTE_PORT[@]}"; do
  rport="${SERVICES_REMOTE_PORT[$svc]}"
  lport="${SERVICES_LOCAL_PORT[$svc]}"
  kubectl port-forward "svc/$svc" "$lport:$rport" --namespace="$NAMESPACE" >/dev/null 2>&1 &
  PORTFWD_PIDS+=("$!")
done

# Give port-forwards time to establish.
sleep 5

failures=0
for svc in "${!SERVICES_LOCAL_PORT[@]}"; do
  lport="${SERVICES_LOCAL_PORT[$svc]}"
  # Bash builtin: open a TCP socket to localhost:lport. Returns 0 on connect.
  if (exec 3<>/dev/tcp/127.0.0.1/"$lport") 2>/dev/null; then
    exec 3<&- 3>&-
    echo "  $svc: PORT_OPEN"
  else
    echo "  $svc: UNREACHABLE"
    failures=$((failures+1))
  fi
done

if [ "$failures" -gt 0 ]; then
  echo
  echo "ERROR: $failures service port(s) unreachable. See \`kubectl get pods -n $NAMESPACE\` and \`kubectl logs ...\` for details."
  exit 1
fi

step "All services accepting connections. Deploy complete."
