#!/usr/bin/env bash
#
# k8s/monitoring/apply-monitoring.sh — Deploy Prometheus + Grafana into banco-digital namespace.
#
# Prerequisites:
#   - kubectl configured against your GKE cluster
#   - Microservices already running (gateway, identity, core, audit, reporting)
#   - Microservice images rebuilt/redeployed after /actuator/prometheus security changes
#
# Usage:
#   ./k8s/monitoring/apply-monitoring.sh
#
# Optional env vars:
#   NAMESPACE              banco-digital (default)
#   GRAFANA_ADMIN_PASSWORD   default: GrafanaAdmin123!
#   ROLLOUT_TIMEOUT          300s (default)

set -euo pipefail

NAMESPACE="${NAMESPACE:-banco-digital}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-GrafanaAdmin123!}"
MONITORING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf '\n\033[1;34m=== %s ===\033[0m\n' "$1"; }

step "Verifying namespace $NAMESPACE exists"
kubectl get namespace "$NAMESPACE" >/dev/null

step "Creating Grafana admin secret"
kubectl create secret generic grafana-admin \
  --namespace="$NAMESPACE" \
  --from-literal=admin-user="admin" \
  --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

step "Applying Prometheus manifests"
kubectl apply -f "$MONITORING_DIR/prometheus-configmap.yaml"
kubectl apply -f "$MONITORING_DIR/prometheus-deployment.yaml"
kubectl apply -f "$MONITORING_DIR/prometheus-service.yaml"

step "Applying Grafana manifests"
kubectl apply -f "$MONITORING_DIR/grafana-datasources-configmap.yaml"
kubectl apply -f "$MONITORING_DIR/grafana-dashboards-configmap.yaml"
kubectl apply -f "$MONITORING_DIR/grafana-deployment.yaml"
kubectl apply -f "$MONITORING_DIR/grafana-service.yaml"

step "Waiting for Prometheus rollout"
kubectl rollout status deployment/prometheus --namespace="$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"

step "Waiting for Grafana rollout"
kubectl rollout status deployment/grafana --namespace="$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"

step "Monitoring pods"
kubectl get pods -n "$NAMESPACE" -l component=monitoring

step "Verify Prometheus targets (requires port-forward in another terminal)"
cat <<EOF

✅ Prometheus + Grafana desplegados en namespace: $NAMESPACE

Acceso local (ejecutar en terminales separadas):

  # Prometheus UI + targets
  kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE
  → http://localhost:9090/targets

  # Grafana
  kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE
  → http://localhost:3000
     Usuario: admin
     Clave:   $GRAFANA_ADMIN_PASSWORD

Verificar scrape de microservicios:
  curl -s http://localhost:9090/api/v1/targets | grep -o '"health":"[^"]*"'

Si algún target está DOWN, redeploy los microservicios con los cambios de /actuator/prometheus.

EOF
