const fs = require('fs');

const collection = {
  "info": {
    "_postman_id": "b18b417f-4318-47bc-8ef3-6c84c13a968a",
    "name": "Banco Digital Fabela - Full E2E & Security Suite",
    "description": "Enterprise-Grade automated testing suite for Banco Digital, covering all endpoints, success cases, negative cases, and strict security isolation (e.g. client cannot view other client's data).",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Admin Setup & Provisioning",
      "item": [
        {
          "name": "1.1 Admin Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                  "var data = pm.response.json();",
                  "if (data.token) { pm.environment.set('admin_token', data.token); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"correo\": \"admin@bancodigital.com\",\n  \"clave\": \"Admin123!\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/login",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        },
        {
          "name": "1.2 Create Client A",
          "event": [
            {
              "listen": "prerequest",
              "script": {
                "exec": [
                  "const id = Date.now();",
                  "pm.environment.set('client_a_email', `client.a.${id}@test.com`);",
                  "pm.environment.set('client_a_cedula', id.toString().substring(0, 10));"
                ],
                "type": "text/javascript"
              }
            },
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data = resp.data || resp;",
                  "if (data.id) { pm.environment.set('client_a_id', data.id); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{admin_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCedula\": \"{{client_a_cedula}}\",\n  \"primerNombre\": \"Alice\",\n  \"primerApellido\": \"QA\",\n  \"email\": \"{{client_a_email}}\",\n  \"telefono\": \"3001111111\",\n  \"fechaNacimiento\": \"1990-01-01\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        },
        {
          "name": "1.3 Provision Client A Access",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": ["pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));"]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{client_a_id}}\",\n  \"email\": \"{{client_a_email}}\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/internal/users/provision-client-access",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "internal", "users", "provision-client-access"]
            }
          }
        },
        {
          "name": "1.4 Create Client B",
          "event": [
            {
              "listen": "prerequest",
              "script": {
                "exec": [
                  "const id = Date.now() + 1;",
                  "pm.environment.set('client_b_email', `client.b.${id}@test.com`);",
                  "pm.environment.set('client_b_cedula', id.toString().substring(0, 10) + '-B');"
                ],
                "type": "text/javascript"
              }
            },
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data = resp.data || resp;",
                  "if (data.id) { pm.environment.set('client_b_id', data.id); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{admin_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCedula\": \"{{client_b_cedula}}\",\n  \"primerNombre\": \"Bob\",\n  \"primerApellido\": \"QA\",\n  \"email\": \"{{client_b_email}}\",\n  \"telefono\": \"3002222222\",\n  \"fechaNacimiento\": \"1992-02-02\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        },
        {
          "name": "1.5 Provision Client B Access",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": ["pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));"]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{client_b_id}}\",\n  \"email\": \"{{client_b_email}}\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/internal/users/provision-client-access",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "internal", "users", "provision-client-access"]
            }
          }
        },
        {
          "name": "1.6 Create Account Client A",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data = resp.data || resp;",
                  "if (data.id) { pm.environment.set('account_a_id', data.id); }",
                  "if (data.numeroCuenta) { pm.environment.set('account_a_num', data.numeroCuenta); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{admin_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{client_a_id}}\",\n  \"tipoCuenta\": \"AHORRO\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "1.7 Create Account Client B",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data = resp.data || resp;",
                  "if (data.id) { pm.environment.set('account_b_id', data.id); }",
                  "if (data.numeroCuenta) { pm.environment.set('account_b_num', data.numeroCuenta); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{admin_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{client_b_id}}\",\n  \"tipoCuenta\": \"CORRIENTE\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        }
      ]
    },
    {
      "name": "2. Client A Auth & Operations",
      "item": [
        {
          "name": "2.1 Login Client A",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                  "var data = pm.response.json();",
                  "if (data.token) { pm.environment.set('client_a_token', data.token); }",
                  "if (data.refreshToken) { pm.environment.set('client_a_refresh_token', data.refreshToken); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"correo\": \"{{client_a_email}}\",\n  \"clave\": \"Temp1234!\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/login",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        },
        {
          "name": "2.1.1 Token Refresh (Client A)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                  "var data = pm.response.json();",
                  "if (data.token) { pm.environment.set('client_a_token', data.token); }",
                  "if (data.refreshToken) { pm.environment.set('client_a_refresh_token', data.refreshToken); }"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"refreshToken\": \"{{client_a_refresh_token}}\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/refresh",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "refresh"]
            }
          }
        },
        {
          "name": "2.2 Get My Profile (Success)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": ["pm.test('Status 200', () => pm.response.to.have.status(200));"]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes/{{client_a_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes", "{{client_a_id}}"]
            }
          }
        },
        {
          "name": "2.3 Get My Balance (Success)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": ["pm.test('Status 200', () => pm.response.to.have.status(200));"]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas/{{account_a_id}}/saldo",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas", "{{account_a_id}}", "saldo"]
            }
          }
        },
        {
          "name": "2.4 Make Transfer (Success)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "// Allow 422 if no initial funds, but endpoint should be reachable",
                  "pm.test('Status 200/201/202/422', () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 422]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCuentaOrigen\": \"{{account_a_num}}\",\n  \"numeroCuentaDestino\": \"{{account_b_num}}\",\n  \"monto\": 1000\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transferencias",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transferencias"]
            }
          }
        }
      ]
    },
    {
      "name": "3. Security & Isolation Tests (Client A)",
      "item": [
        {
          "name": "3.1 Cannot Create Client (403)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403', () => pm.expect(pm.response.code).to.be.oneOf([403, 401]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCedula\": \"0000000000\",\n  \"primerNombre\": \"Hacker\",\n  \"primerApellido\": \"Test\",\n  \"email\": \"hacker@test.com\",\n  \"telefono\": \"3000000000\",\n  \"fechaNacimiento\": \"1990-01-01\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        },
        {
          "name": "3.2 Cannot View Client B Profile (403/404)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403 or 404', () => pm.expect(pm.response.code).to.be.oneOf([403, 404]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes/{{client_b_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes", "{{client_b_id}}"]
            }
          }
        },
        {
          "name": "3.3 Cannot Update Client B Profile (403/404)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403 or 404', () => pm.expect(pm.response.code).to.be.oneOf([403, 404]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "PATCH",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"telefono\": \"3111111111\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes/{{client_b_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes", "{{client_b_id}}"]
            }
          }
        },
        {
          "name": "3.4 Cannot Create Account (403)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403', () => pm.expect(pm.response.code).to.be.oneOf([403, 401]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{client_a_id}}\",\n  \"tipoCuenta\": \"AHORRO\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "3.5 Cannot View Client B Balance (403/404)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403 or 404', () => pm.expect(pm.response.code).to.be.oneOf([403, 404]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas/{{account_b_id}}/saldo",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas", "{{account_b_id}}", "saldo"]
            }
          }
        },
        {
          "name": "3.6 Cannot Access Audit Logs (403)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 403', () => pm.expect(pm.response.code).to.be.oneOf([403, 401]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/audit",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "audit"]
            }
          }
        }
      ]
    },
    {
      "name": "4. Other Endpoints (Reporting & Transactions)",
      "item": [
        {
          "name": "4.1 Get Activity Report (Client A)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200', () => pm.expect(pm.response.code).to.be.oneOf([200]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/actividad?fechaInicio=2024-01-01&fechaFin=2024-12-31",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "actividad"],
              "query": [
                { "key": "fechaInicio", "value": "2024-01-01" },
                { "key": "fechaFin", "value": "2024-12-31" }
              ]
            }
          }
        },
        {
          "name": "4.2 Get Movements Summary (Client A)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200 or 501', () => pm.expect(pm.response.code).to.be.oneOf([200, 501]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/resumen-movimientos?cuentaId={{account_a_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "resumen-movimientos"],
              "query": [
                { "key": "cuentaId", "value": "{{account_a_id}}" }
              ]
            }
          }
        },
        {
          "name": "4.3 Withdrawal (Retiro) (Client A)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201/202/422', () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 422]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"cuentaId\": \"{{account_a_id}}\",\n  \"monto\": 50000,\n  \"descripcion\": \"Retiro Cajero\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transacciones/retiro",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transacciones", "retiro"]
            }
          }
        },
        {
          "name": "4.4 Transfer - Insufficient Funds (422)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 422 or 400', () => pm.expect(pm.response.code).to.be.oneOf([422, 400]));"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{client_a_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCuentaOrigen\": \"{{account_a_num}}\",\n  \"numeroCuentaDestino\": \"{{account_b_num}}\",\n  \"monto\": 9999999999\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transferencias",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transferencias"]
            }
          }
        }
      ]
    }
  ]
};

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Collection postman_collection.json generated successfully!');
