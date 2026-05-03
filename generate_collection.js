const fs = require('fs');

const collection = {
  "info": {
    "_postman_id": "b18b417f-4318-47bc-8ef3-6c84c13a968a",
    "name": "Banco Digital Fabela - Enterprise API",
    "description": "Colección completa de pruebas funcionales y de integración para la arquitectura de microservicios del Banco Digital Fabela.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "_exporter_id": "10000000"
  },
  "variable": [
    {
      "key": "email",
      "value": "dynamic",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "1. Identity & Auth",
      "item": [
        {
          "name": "1.1 Provision Client Access (Register)",
          "event": [
            {
              "listen": "prerequest",
              "script": {
                "exec": [
                  "const uniqueEmail = `qa_user_${Date.now()}@bancodigital.com`;",
                  "pm.environment.set(\"test_username\", uniqueEmail);",
                  "pm.environment.set(\"test_password\", \"SecurePass123!\");"
                ],
                "type": "text/javascript"
              }
            },
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200 or 201\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "if(pm.response.code === 200 || pm.response.code === 201) {",
                  "    var jsonData = pm.response.json();",
                  "    if (jsonData.userId) {",
                  "        pm.environment.set(\"user_id\", jsonData.userId);",
                  "    }",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{test_username}}\",\n  \"password\": \"{{test_password}}\",\n  \"roles\": [\"USER\"]\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/internal/users/provision-client-access",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "internal", "users", "provision-client-access"]
            }
          }
        },
        {
          "name": "1.2 Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "var jsonData = pm.response.json();",
                  "pm.test(\"Response has token\", function () {",
                  "    pm.expect(jsonData).to.have.property(\"token\");",
                  "});",
                  "if (jsonData.token) {",
                  "    pm.environment.set(\"access_token\", jsonData.token);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{test_username}}\",\n  \"password\": \"{{test_password}}\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/login",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        },
        {
          "name": "1.3 Get Current User (Me)",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/me",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "me"]
            }
          }
        }
      ]
    },
    {
      "name": "2. Customers (Core)",
      "item": [
        {
          "name": "2.1 Create Customer",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200 or 201\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "var jsonData = pm.response.json();",
                  "pm.test(\"Response has id\", function () {",
                  "    pm.expect(jsonData).to.have.property(\"id\");",
                  "});",
                  "if (jsonData.id) {",
                  "    pm.environment.set(\"customer_id\", jsonData.id);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"nombre\": \"Cliente Test\",\n  \"apellido\": \"QA\",\n  \"tipoDocumento\": \"CC\",\n  \"numeroDocumento\": \"1234567890\",\n  \"email\": \"{{test_username}}\",\n  \"telefono\": \"3000000000\",\n  \"direccion\": \"Calle Falsa 123\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        },
        {
          "name": "2.2 Get Customer Profile",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes/{{customer_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes", "{{customer_id}}"]
            }
          }
        },
        {
          "name": "2.3 Update Customer",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "PATCH",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"telefono\": \"3111111111\",\n  \"direccion\": \"Carrera Verdadera 456\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes/{{customer_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes", "{{customer_id}}"]
            }
          }
        }
      ]
    },
    {
      "name": "3. Accounts (Core)",
      "item": [
        {
          "name": "3.1 Create Account",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200 or 201\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "var jsonData = pm.response.json();",
                  "pm.test(\"Response has account id\", function () {",
                  "    pm.expect(jsonData).to.have.property(\"id\");",
                  "});",
                  "if (jsonData.id) {",
                  "    pm.environment.set(\"account_id\", jsonData.id);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{customer_id}}\",\n  \"tipoCuenta\": \"AHORROS\",\n  \"saldoInicial\": 1000000\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "3.2 Create Destination Account (For Transfers)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200 or 201\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "var jsonData = pm.response.json();",
                  "if (jsonData.id) {",
                  "    pm.environment.set(\"destination_account_id\", jsonData.id);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"clienteId\": \"{{customer_id}}\",\n  \"tipoCuenta\": \"CORRIENTE\",\n  \"saldoInicial\": 0\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas"]
            }
          }
        },
        {
          "name": "3.3 Get Account Balance",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/cuentas/{{account_id}}/saldo",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "cuentas", "{{account_id}}", "saldo"]
            }
          }
        }
      ]
    },
    {
      "name": "4. Transactions (Core)",
      "item": [
        {
          "name": "4.1 Withdrawal (Retiro)",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"cuentaId\": \"{{account_id}}\",\n  \"monto\": 50000,\n  \"descripcion\": \"Retiro en cajero automático\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transacciones/retiro",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transacciones", "retiro"]
            }
          }
        },
        {
          "name": "4.2 Transfer (Transferencia)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200 or 201\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "var jsonData = pm.response.json();",
                  "if (jsonData.id) {",
                  "    pm.environment.set(\"transaction_id\", jsonData.id);",
                  "}"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"cuentaOrigenId\": \"{{account_id}}\",\n  \"cuentaDestinoId\": \"{{destination_account_id}}\",\n  \"monto\": 150000,\n  \"descripcion\": \"Pago de servicios\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transferencias",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transferencias"]
            }
          }
        },
        {
          "name": "4.3 Transaction History",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transacciones/historial/{{account_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transacciones", "historial", "{{account_id}}"]
            }
          }
        }
      ]
    },
    {
      "name": "5. Audit (Audit)",
      "item": [
        {
          "name": "5.1 Get All Audit Logs",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/audit",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "audit"]
            }
          }
        },
        {
          "name": "5.2 Get Audit Event by ID",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/audit/1",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "audit", "1"]
            }
          }
        }
      ]
    },
    {
      "name": "6. Reporting (Reporting)",
      "item": [
        {
          "name": "6.1 Total Balance Report",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/saldo-total",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "saldo-total"]
            }
          }
        },
        {
          "name": "6.2 Movements Report",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/movimientos?cuentaId={{account_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "movimientos"],
              "query": [
                {
                  "key": "cuentaId",
                  "value": "{{account_id}}"
                }
              ]
            }
          }
        },
        {
          "name": "6.3 Movements Summary",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/resumen-movimientos?cuentaId={{account_id}}",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "resumen-movimientos"],
              "query": [
                {
                  "key": "cuentaId",
                  "value": "{{account_id}}"
                }
              ]
            }
          }
        },
        {
          "name": "6.4 Accounts Report",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/cuentas",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "cuentas"]
            }
          }
        },
        {
          "name": "6.5 Activity Report",
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/reportes/actividad",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "reportes", "actividad"]
            }
          }
        }
      ]
    },
    {
      "name": "7. Negative Tests & Edge Cases",
      "item": [
        {
          "name": "7.1 Login - Invalid Credentials",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 401 or 400\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([400, 401]);",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{test_username}}\",\n  \"password\": \"WrongPassword!\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/login",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        },
        {
          "name": "7.2 Transfer - Insufficient Funds",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 400 or 422 or 409\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([400, 409, 422]);",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"cuentaOrigenId\": \"{{account_id}}\",\n  \"cuentaDestinoId\": \"{{destination_account_id}}\",\n  \"monto\": 999999999999,\n  \"descripcion\": \"Prueba sin fondos\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transferencias",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transferencias"]
            }
          }
        },
        {
          "name": "7.3 Transfer - Invalid Destination Account",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 404 or 400\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([400, 404]);",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"cuentaOrigenId\": \"{{account_id}}\",\n  \"cuentaDestinoId\": \"invalid-uuid-0000-0000-0000\",\n  \"monto\": 1000,\n  \"descripcion\": \"Prueba destino inválido\"\n}"
            },
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/transferencias",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "transferencias"]
            }
          }
        },
        {
          "name": "7.4 Security - Access Without Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 401 or 403\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([401, 403]);",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/clientes",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "clientes"]
            }
          }
        }
      ]
    },
    {
      "name": "8. Security & Teardown",
      "item": [
        {
          "name": "8.1 Logout",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200, 204 or 401\", function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 204, 401]);",
                  "});",
                  "pm.environment.unset(\"access_token\");"
                ],
                "type": "text/javascript"
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                { "key": "token", "value": "{{access_token}}", "type": "string" }
              ]
            },
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{base_url_gateway}}/api/v1/auth/logout",
              "host": ["{{base_url_gateway}}"],
              "path": ["api", "v1", "auth", "logout"]
            }
          }
        }
      ]
    }
  ]
};

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
