# Monitoring — Prometheus + Grafana en GKE

Stack de observabilidad para el namespace `banco-digital`. Prometheus scrapea `/actuator/prometheus` de cada microservicio; Grafana visualiza las métricas con un dashboard preconfigurado.

## Arquitectura

```
Prometheus (9090) ──scrape──► gateway, identity, core, audit, reporting
       ▲
       └── datasource ── Grafana (3000)
```

## Despliegue

### 1. Redesplegar microservicios (requerido una vez)

Los servicios deben permitir `/actuator/prometheus` sin JWT. Eso ya está en el código; hay que **reconstruir y redesplegar** las imágenes:

- `banco-digital-gateway`
- `banco-digital-identity`
- `banco-digital` (core)
- `banco-digital-audit`
- `banco-digital-reporting`

### 2. Desplegar monitoring

```bash
chmod +x k8s/monitoring/apply-monitoring.sh
./k8s/monitoring/apply-monitoring.sh
```

Opcional:

```bash
export GRAFANA_ADMIN_PASSWORD="TuClaveSegura123!"
./k8s/monitoring/apply-monitoring.sh
```

### 3. Verificar pods

```bash
kubectl get pods -n banco-digital -l component=monitoring
```

Esperado:

```
NAME                          READY   STATUS
prometheus-xxxxxxxxxx-xxxxx     1/1     Running
grafana-xxxxxxxxxx-xxxxx        1/1     Running
```

## Acceso

### Prometheus

```bash
kubectl port-forward svc/prometheus 9090:9090 -n banco-digital
```

- UI: http://localhost:9090
- Targets: http://localhost:9090/targets → todos los jobs `banco-digital-*` en **UP**

### Grafana

```bash
kubectl port-forward svc/grafana 3000:3000 -n banco-digital
```

- UI: http://localhost:3000
- Usuario: `admin`
- Contraseña: `GrafanaAdmin123!` (o la que definiste en `GRAFANA_ADMIN_PASSWORD`)
- Dashboard: carpeta **Banco Digital → Banco Digital - Overview**

## Comprobación rápida

```bash
# Targets de Prometheus (con port-forward activo)
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Métricas de un servicio (desde dentro del cluster)
kubectl run curl-test --rm -it --restart=Never --image=curlimages/curl -n banco-digital -- \
  curl -s http://core:8080/actuator/prometheus | head -5
```

## Jobs de scrape configurados

| Job | Target | Path |
|-----|--------|------|
| banco-digital-gateway | gateway:80 | /actuator/prometheus |
| banco-digital-identity | identity:8081 | /actuator/prometheus |
| banco-digital-core | core:8080 | /actuator/prometheus |
| banco-digital-audit | audit:8082 | /actuator/prometheus |
| banco-digital-reporting | reporting:8083 | /actuator/prometheus |

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Target DOWN | Redesplegar el microservicio con el cambio de seguridad en actuator |
| Grafana sin datos | Verificar datasource Prometheus → http://prometheus:9090 |
| Pod CrashLoopBackOff | `kubectl logs deployment/prometheus -n banco-digital` |
| Sin métricas HTTP | Generar tráfico (Postman login, crear cliente, etc.) |

## Eliminar monitoring

```bash
kubectl delete deployment prometheus grafana -n banco-digital
kubectl delete svc prometheus grafana -n banco-digital
kubectl delete configmap prometheus-config grafana-datasources grafana-dashboards-config -n banco-digital
kubectl delete secret grafana-admin -n banco-digital
```
