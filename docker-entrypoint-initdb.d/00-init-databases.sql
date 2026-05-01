-- Create per-service databases
-- This script runs as the postgres superuser when the container starts

CREATE DATABASE banco_digital_core;
CREATE DATABASE banco_digital_identity;
CREATE DATABASE banco_digital_audit;
CREATE DATABASE banco_digital_reporting;

-- Connect to each database and create schemas
\c banco_digital_core
CREATE SCHEMA IF NOT EXISTS public;

\c banco_digital_identity
CREATE SCHEMA IF NOT EXISTS public;

\c banco_digital_audit
CREATE SCHEMA IF NOT EXISTS public;

\c banco_digital_reporting
CREATE SCHEMA IF NOT EXISTS public;
