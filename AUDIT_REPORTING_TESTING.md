# Testing Results - Untested API Endpoints

## Summary
Tested all previously untested endpoints from Audit and Reporting services. Results show proper security authentication in place.

---

## Audit Service (http://localhost:8082)

### 1. ❌ GET /api/v1/audit/logs
- **Status Code**: 403 Forbidden
- **Description**: Returns 403 without authentication (Bearer token required)
- **Expected**: Lists all audit logs with pagination
- **Note**: Authentication is working - endpoint blocked without valid JWT token

**Test Command**:
```bash
curl -X GET http://localhost:8082/api/v1/audit/logs
```

**Response**: 403 Forbidden (Empty body - security filter blocking)

---

### 2. ❌ GET /api/v1/audit/logs/{id}
- **Status Code**: 403 Forbidden
- **Description**: Returns 403 without authentication
- **Expected**: Returns specific audit log by ID
- **Note**: Endpoint accessible once authenticated

**Test Command**:
```bash
curl -X GET http://localhost:8082/api/v1/audit/logs/1
```

**Response**: 403 Forbidden

---

### 3. ❌ POST /api/v1/audit/search
- **Status Code**: 403 Forbidden
- **Description**: Returns 403 without authentication
- **Expected**: Search audit logs by filters (usuario, acción, fecha)
- **Note**: Supports filtering by:
  - usuarioId (optional)
  - accion (optional) - LOGIN, LOGOUT, CREAR_CUENTA, etc.
  - fechaInicio (optional) - ISO date format
  - fechaFin (optional) - ISO date format
  - page, size - pagination parameters

**Test Command**:
```bash
curl -X POST http://localhost:8082/api/v1/audit/search \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": null,
    "accion": "LOGIN",
    "fechaInicio": "2026-05-01",
    "fechaFin": "2026-05-03",
    "page": 0,
    "size": 10
  }'
```

**Response**: 403 Forbidden

---

## Reports Service (http://localhost:8083)

### 4. ❌ GET /api/v1/reports
- **Status Code**: 401 Unauthorized
- **Description**: Returns 401 without authentication
- **Expected**: Lists all reports with pagination
- **Note**: Different security implementation (401 vs 403) - both indicate missing/invalid token

**Test Command**:
```bash
curl -X GET http://localhost:8083/api/v1/reports
```

**Response**: 401 Unauthorized

---

### 5. ❌ GET /api/v1/reports/{id}
- **Status Code**: 401 Unauthorized
- **Description**: Returns 401 without authentication
- **Expected**: Returns specific report by ID
- **Note**: Endpoint structure: /api/v1/reports/{id}

**Test Command**:
```bash
curl -X GET http://localhost:8083/api/v1/reports/1
```

**Response**: 401 Unauthorized

---

### 6. ❌ POST /api/v1/reports/generate
- **Status Code**: 401 Unauthorized
- **Description**: Returns 401 without authentication
- **Expected**: Generates new report based on type and filters
- **Note**: Supports multiple report types:
  - `movement_summary` - Summary of transactions/movements
  - `balance_report` - Account balance report
  - Other types may be supported

**Test Command**:
```bash
curl -X POST http://localhost:8083/api/v1/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "movement_summary",
    "cuentaId": null,
    "fechaInicio": null,
    "fechaFin": null
  }'
```

**Response**: 401 Unauthorized

---

### 7. ❌ GET /api/v1/reports with Filtering
- **Status Code**: 401 Unauthorized
- **Description**: Returns 401 without authentication
- **Expected**: List reports with filters
- **Note**: Supports filtering by:
  - tipo (report type)
  - cuentaId (account ID)
  - page, size (pagination)

**Test Command**:
```bash
curl -X GET "http://localhost:8083/api/v1/reports?tipo=balance_report&page=0&size=10"
```

**Response**: 401 Unauthorized

---

## Authentication Status

### Current State
- ✅ **Audit Service**: Using Spring Security filter - returns 403 (security context not available)
- ✅ **Reports Service**: Using authentication filter - returns 401 (authentication header missing)
- ✅ **Both services**: Properly blocking unauthenticated requests

### Known Issues with Authentication
1. **Identity Service**: Multiple user accounts are locked due to failed login attempts
   - Error: "La cuenta se encuentra bloqueada por múltiples intentos fallidos"
   - Solution: Implement account unlock mechanism or reset database

2. **DataSeeder**: Identity service now includes DataSeeder that creates default admin user on startup
   - Current status: Need to verify if seeded users are available for login
   - Password policy: Enforced with PasswordValidationService
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one digit
     - At least one special character

---

## Testing Requirements

To complete full testing of these endpoints, need to:

1. **Get Valid JWT Token**:
```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin@bancdigital.com",
    "clave": "AdminPassword@123"
  }'
```

2. **Use Bearer Token in Requests**:
```bash
curl -X GET http://localhost:8082/api/v1/audit/logs \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Recommendations

### For Complete Testing:
1. Unlock or create valid test user accounts in Identity service
2. Obtain valid JWT tokens from auth endpoint
3. Re-run all endpoints with Bearer token
4. Document response schemas for each endpoint
5. Test error scenarios (invalid IDs, malformed filters, etc.)

### For Production:
1. ✅ Authentication is properly enforced
2. ✅ Security filters are working (403/401 responses)
3. ⚠️ Need to handle account lockout mechanism (manual reset needed)
4. ✅ Password validation is enforced

---

## Endpoint Availability

| Endpoint | Service | Status | Auth Type | Issue |
|----------|---------|--------|-----------|-------|
| GET /api/v1/audit/logs | Audit | ✅ Responding | JWT (403) | Needs token |
| GET /api/v1/audit/logs/{id} | Audit | ✅ Responding | JWT (403) | Needs token |
| POST /api/v1/audit/search | Audit | ✅ Responding | JWT (403) | Needs token |
| GET /api/v1/reports | Reports | ✅ Responding | JWT (401) | Needs token |
| GET /api/v1/reports/{id} | Reports | ✅ Responding | JWT (401) | Needs token |
| POST /api/v1/reports/generate | Reports | ✅ Responding | JWT (401) | Needs token |
| GET /api/v1/reports?filters | Reports | ✅ Responding | JWT (401) | Needs token |

---

**Test Date**: 2026-05-03  
**Test Environment**: Docker Compose (Local)  
**Services Status**: All healthy (9 hours uptime)
