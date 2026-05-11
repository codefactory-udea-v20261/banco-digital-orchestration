# ADR-001: Squash banco-digital-reporting Flyway history

- Status: accepted
- Date: 2026-05-07
- Deciders: Estefanía Garcés (DBA)
- Scope: `banco-digital-reporting/src/main/resources/db/migration/`

## Context

Reporting's Flyway history was a copy of Core Banking's. It carried four migrations (V4, V5, V7, V8) that created auth tables, role-mapping tables, and audit triggers — none of which belong in a reporting service — and then dropped them all in V8. On a fresh database the same `flyway:migrate` run created tables only to delete them seconds later.

The history also kept FK constraints and `NOT NULL` columns sized for Core's command-side schema. As soon as the materialization adapter started consuming `CustomerCreatedEvent` and `TransactionCompletedEvent` from Kafka, those constraints rejected partial or out-of-order events. Read-models built from event streams have to be permissive about missing fields and arrival order; Core's strict relational model is the wrong shape for them.

A point-fix migration (V10 to drop the constraints) would have left the dead V4/V5/V7/V8 migrations in the chain forever. Reporting has not been deployed yet; we have a window to do the cleanup correctly before any environment is locked in.

## Decision

Squash the migration chain. Delete V4/V5/V7/V8 entirely, renumber V6 → V4 and V9 → V5, and rewrite V2/V3 with constraints suitable for an eventually-consistent read-model:

| Old | New | Content |
|---|---|---|
| V1 | V1 | Schema + roles (unchanged) |
| V2 | V2 | `cliente`, `tipo_cuenta`, `cuenta` — no FK on `cuenta.cliente_id`, no `NOT NULL` on `cliente` name/document/birthdate fields, no `UNIQUE` on `numero_cedula`/`numero_cuenta` |
| V3 | V3 | `tipo_transaccion`, `transaccion` — no FK on `cuenta_origen_id`/`cuenta_destino_id`, no `NOT NULL` on `monto`/`saldo_*`, no `CHECK` on `monto`, no `UNIQUE` on `referencia`. **Auditoría table removed entirely** (it lived in Core's V3 by accident and was already dropped in old V8) |
| V4 | (deleted) | Auth tables — never belonged here |
| V5 | (deleted) | Many-to-many migration of auth tables — never belonged here |
| V6 | V4 | `obtener_saldo_total_cliente` stored function (unchanged) |
| V7 | (deleted) | `fn_auditar_cambios` + audit triggers — never belonged here |
| V8 | (deleted) | `DROP` cleanup of V4/V5/V7 — no longer needed because those migrations are gone |
| V9 | V5 | `processed_events` idempotency table (unchanged) |

Net schema after the squash equals the schema that the old chain produced after V8 ran, minus the unused `auditoria` table and minus the FK/NOT-NULL/UNIQUE constraints listed above.

## Consequences

**Positive:**
- Migration chain is self-explanatory. A new contributor reading `db/migration/` sees only what belongs in a reporting service.
- The materialization adapter can `INSERT` partial event payloads without juggling placeholder defaults to satisfy `NOT NULL`. Out-of-order arrival (transaction event before its `AccountOpened` partner) no longer fails on FK violation.
- One fewer table (`auditoria`) — fewer privileges to grant, less surface for stale code.

**Negative:**
- **Any existing deployment must reset its schema before pulling this change.** Flyway will refuse to start against a `flyway_schema_history` whose recorded checksums don't match the rewritten V2/V3, and the renumber means V4/V5 already shipped under different names. Acceptable because reporting has not been deployed to any environment yet — the existing Cloud Run instances are non-functional and slated for deletion as part of step 6 of the master fix order.
- We lose strict referential integrity in the read-model. This is the correct trade-off for eventually-consistent read sides — but a reviewer who comes from a transactional-DB background should know it was deliberate, not an oversight. (This is the reason for this ADR.)
- The squash is irreversible without writing more migrations. If we ever need the old shape we'd have to add forward migrations restoring the dropped constraints.

## Compliance / migration steps

For any environment that already ran the old V1–V9 chain:

```sql
-- One-time reset on each non-production environment.
DROP DATABASE banco_digital_reporting;
CREATE DATABASE banco_digital_reporting;
```

Then redeploy the service; Flyway runs the new V1–V5 against the empty database. No data migration needed because no production data exists.

For new environments (including the planned GKE cluster), no special steps — Flyway runs cleanly from scratch.

## Alternatives considered

1. **Add a V10 that drops constraints and the leftover auth/audit tables.** Rejected: leaves V4/V5/V7/V8 polluting the chain forever, harder to onboard new contributors, and we'd still need a V11 to drop `auditoria`.
2. **Leave the strict schema and synthesize placeholder values in the materialization adapter** (e.g. `'1900-01-01'` for `fecha_nacimiento`, `0` for `saldo_anterior`). Rejected: pollutes the read-model with sentinel data, breaks aggregations that touch those columns, and conflates "we don't know" with "the value is zero".
3. **Switch to JPA-managed schema and abandon Flyway here.** Rejected: reporting uses raw JDBC (`NamedParameterJdbcTemplate`) and has no entities; switching would mean writing entities just to drive DDL, which is the wrong tool for a read-model.

## References

- `banco-digital-reporting/src/main/resources/db/migration/` — the resulting V1–V5 chain.
- `banco-digital-reporting/src/main/java/com/udea/bancodigital/reporting/infrastructure/adapter/out/ReportingMaterializationAdapter.java` — the consumer of the relaxed schema.
- `docs/diagnosis.md` § "Reporting service gap analysis" — the audit that surfaced the issue.
