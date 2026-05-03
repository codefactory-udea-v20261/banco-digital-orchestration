-- Create per-service database users
-- This script runs as the postgres superuser when the container starts

-- Create Core Banking user
CREATE USER core_user WITH PASSWORD 'CoreBanking123!' CREATEROLE;
GRANT CONNECT ON DATABASE banco_digital_core TO core_user;

-- Create Identity/Auth user
CREATE USER auth_user WITH PASSWORD 'IdentityAuth456!' CREATEROLE;
GRANT CONNECT ON DATABASE banco_digital_identity TO auth_user;

-- Create Audit user
CREATE USER audit_user WITH PASSWORD 'AuditService789!' CREATEROLE;
GRANT CONNECT ON DATABASE banco_digital_audit TO audit_user;

-- Create Reporting user
CREATE USER report_user WITH PASSWORD 'ReportingBD101!' CREATEROLE;
GRANT CONNECT ON DATABASE banco_digital_reporting TO report_user;

-- Grant permissions in each database
-- Note: Must be connected to the specific database to grant schema permissions
-- These will be handled by the services if they own the schema, 
-- but we ensure they have enough permissions to start with.

-- Since we can't easily switch databases in a single script without \c (which might not work in some drivers),
-- we rely on the fact that services will try to initialize.
-- However, we can use a trick or just ensure the users are owners.
ALTER DATABASE banco_digital_core OWNER TO core_user;
ALTER DATABASE banco_digital_identity OWNER TO auth_user;
ALTER DATABASE banco_digital_audit OWNER TO audit_user;
ALTER DATABASE banco_digital_reporting OWNER TO report_user;

\c banco_digital_core
GRANT ALL ON SCHEMA public TO core_user;

\c banco_digital_identity
GRANT ALL ON SCHEMA public TO auth_user;

\c banco_digital_audit
GRANT ALL ON SCHEMA public TO audit_user;

\c banco_digital_reporting
GRANT ALL ON SCHEMA public TO report_user;
