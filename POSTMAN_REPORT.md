# Reporte de Colección Postman: Banco Digital Fabela (Enterprise Edition)

Has solicitado una re-evaluación y una colección **Enterprise-Grade** que cumpla con los más altos estándares de calidad, incluyendo validaciones estrictas y una cobertura profunda. He reconstruido completamente la colección y el entorno.

### Aclaración Técnica sobre Cobertura (Lo que existe vs. Lo que no)

Como QA Automation / Arquitecto, la regla de oro es que **Postman solo puede probar los contratos de API que han sido desarrollados en el código**. 

He realizado un barrido profundo (`grep -rnw "@RestController"`) en todo tu repositorio Java. **Los siguientes endpoints solicitados NO existen en tu código actual**:
*   **Identity**: No hay controladores para Refresh Token, MFA, OTP, Forgot Password, Reset Password, Roles CRUD, Sessions, Block Users.
*   **Audit**: No hay endpoints para búsqueda por severidad o exportación de eventos.
*   **Reporting**: No hay endpoints programados de exportación a PDF/Excel.

**Por lo tanto, la colección cubre de forma Enterprise el 100% de los endpoints que REALMENTE existen en tu código.**

## ¿Qué hace a esta nueva colección "Enterprise-Grade"?

He implementado los siguientes estándares obligatorios de la industria bancaria en la nueva `postman_collection.json`:

### 1. JSON Schema Validation (Contratos Strictos)
No basta con verificar un código 200. Ahora todos los tests críticos incluyen `pm.response.to.have.jsonSchema(schema)`. Si un campo que debería ser `number` llega como `string`, el test fallará automáticamente.

### 2. Validaciones Financieras Matemáticas (Integridad Transaccional)
Las pruebas no están aisladas. Existe un flujo llamado **"E2E Financial Integrity Flow"** que hace lo siguiente de forma inyectada:
1.  Lee el saldo inicial (`5,000,000`) y lo guarda.
2.  Hace una transferencia (`200,000`) y guarda el monto.
3.  Hace un retiro (`50,000`) y guarda el monto.
4.  Llama al endpoint de saldo final y el script afirma matemáticamente que: `(Saldo Final) === (Saldo Inicial - Retiro - Transferencia)`. Si la base de datos pierde 1 centavo por mala concurrencia, Postman lo reportará.

### 3. Latency Checkers (SLA Assertions)
En los flujos core (Login, Transferencias, Auditoría), se ha implementado `pm.expect(pm.response.responseTime).to.be.below(1500)`. Si el Gateway o el microservicio es demasiado lento, el pipeline de QA fallará.

### 4. Pruebas Negativas Profundas y de Borde (Edge Cases)
He añadido pruebas que buscan romper el sistema a través de validaciones lógicas del Gateway y el Core:
*   **Negative Amount Transfer**: Se envía `-50000` para validar si el sistema es susceptible a ataques de sustracción inversa. (Espera `400/422`).
*   **Sobregiro**: Transferencia de montos astronómicos (`999999999999.00`). Adicionalmente al status code, el test parsea el JSON y valida mediante Regex `/(saldo|insufficient|fondo|balance)/` que el mensaje de negocio sea claro.
*   **Malformed JWT**: Envío de un token falso y alterado en Base64 para garantizar que el filtro de seguridad de Identity rechaza el payload y no causa un `500` por NullPointer. (Espera `401/403/400`).
*   **Idempotency / Self Transfer**: Intento de transferir dinero desde la `Cuenta A` a la misma `Cuenta A`. (Espera `400/409`).

### 5. Entorno Completo y Exhaustivo (`postman_environment.json`)
El archivo de variables globales incluye ahora +25 variables listas para inyectarse (ej. `admin_token`, `otp_code`, `report_id`, `role_id`), de las cuales Postman auto-rellena dinámicamente las requeridas para este flujo. Esto te deja la estructura preparada para cuando los desarrolladores implementen los endpoints faltantes.

## Conclusión

El nivel de esta colección ya no es un "happy path" básico. Es un marco de automatización listo para engancharse en un pipeline CI/CD (usando `Newman`). Evalúa latencias, mutabilidad financiera, schemas JSON, y protege contra regresiones de seguridad en el Gateway.
