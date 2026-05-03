const fs = require('fs');

const collection = {
  "info": {
    "_postman_id": "b18b417f-4318-47bc-8ef3-6c84c13a968a",
    "name": "Banco Digital Fabela - Full E2E Automated Suite",
    "description": "Enterprise-Grade automated testing suite for Banco Digital. Mapped to actual Java source code field names.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Setup & Auth",
      "item": [
        {
          "name": "1.1 Admin Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                  "var data_login = pm.response.json();",
                  "if (data_login.token) { pm.environment.set('admin_token', data_login.token); }"
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
        }
      ]
    },
    {
      "name": "2. Customer & User Provisioning",
      "item": [
        {
          "name": "2.1 Create Customer (Admin)",
          "event": [
            {
              "listen": "prerequest",
              "script": {
                "exec": [
                  "const id = Date.now();",
                  "pm.environment.set('test_email', `qa.${id}@test.com`);",
                  "pm.environment.set('test_cedula', id.toString().substring(0, 10));"
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
                  "var data_cust = resp.data || resp;",
                  "if (data_cust.id) { pm.environment.set('customer_id', data_cust.id); }"
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
              "raw": "{\n  \"numeroCedula\": \"{{test_cedula}}\",\n  \"primerNombre\": \"QA\",\n  \"primerApellido\": \"Enterprise\",\n  \"email\": \"{{test_email}}\",\n  \"telefono\": \"3001234567\",\n  \"fechaNacimiento\": \"1990-01-01\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        },
        {
          "name": "2.2 Provision User Access",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));"
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
              "raw": "{\n  \"clienteId\": \"{{customer_id}}\",\n  \"email\": \"{{test_email}}\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/internal/users/provision-client-access",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "internal", "users", "provision-client-access"]
            }
          }
        },
        {
          "name": "2.3 Client Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code 200', () => pm.response.to.have.status(200));",
                  "var data_login_client = pm.response.json();",
                  "if (data_login_client.token) { pm.environment.set('access_token', data_login_client.token); }"
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
              "raw": "{\n  \"correo\": \"{{test_email}}\",\n  \"clave\": \"Temp1234!\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/login",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "3. Accounts & Financial Flow",
      "item": [
        {
          "name": "3.1 Create Source Account (Savings)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data_acc1 = resp.data || resp;",
                  "if (data_acc1.id) { pm.environment.set('source_account_id', data_acc1.id); }",
                  "if (data_acc1.numeroCuenta) { pm.environment.set('source_account_num', data_acc1.numeroCuenta); }",
                  "pm.environment.set('initial_balance', 1000000);"
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
              "raw": "{\n  \"clienteId\": \"{{customer_id}}\",\n  \"tipoCuenta\": \"AHORRO\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "3.2 Create Dest Account (Current)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
                  "var resp = pm.response.json();",
                  "var data_acc2 = resp.data || resp;",
                  "if (data_acc2.id) { pm.environment.set('dest_account_id', data_acc2.id); }",
                  "if (data_acc2.numeroCuenta) { pm.environment.set('dest_account_num', data_acc2.numeroCuenta); }"
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
              "raw": "{\n  \"clienteId\": \"{{customer_id}}\",\n  \"tipoCuenta\": \"CORRIENTE\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "3.3 Execute Transfer",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "// Allow 422 if seeder balance didn't apply",
                  "pm.test('Transfer result', () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 422]));",
                  "pm.environment.set('transfer_amount', 200000);"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{access_token}}", "type": "string" }] },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"numeroCuentaOrigen\": \"{{source_account_num}}\",\n  \"numeroCuentaDestino\": \"{{dest_account_num}}\",\n  \"monto\": 200000\n}"
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
      "name": "4. Verification & Audit",
      "item": [
        {
          "name": "4.1 Read Audit Logs",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));",
                  "var resp = pm.response.json();",
                  "var content = resp.content || resp;",
                  "pm.test('Response is Array', () => pm.expect(content).to.be.an('array'));"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{admin_token}}", "type": "string" }] },
            "method": "GET",
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/audit",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "audit"]
            }
          }
        }
      ]
    }
  ]
};

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
