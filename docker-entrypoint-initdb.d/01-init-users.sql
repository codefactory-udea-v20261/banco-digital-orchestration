-- Create per-service database users
-- This script runs as the postgres superuser when the container starts

-- Create Core Banking user
CREATE USER core_user WITH PASSWORD 'CoreBanking123!';
GRANT CONNECT ON DATABASE banco_digital_core TO core_user;
GRANT USAGE ON SCHEMA public TO core_user;
GRANT CREATE ON SCHEMA public TO core_user;

-- Create Identity/Auth user
CREATE USER auth_user WITH PASSWORD 'IdentityAuth456!';
GRANT CONNECT ON DATABASE banco_digital_identity TO auth_user;
GRANT USAGE ON SCHEMA public TO auth_user;
GRANT CREATE ON SCHEMA public TO auth_user;

-- Create Audit user
CREATE USER audit_user WITH PASSWORD 'AuditService789!';
GRANT CONNECT ON DATABASE banco_digital_audit TO audit_user;
GRANT USAGE ON SCHEMA public TO audit_user;
GRANT CREATE ON SCHEMA public TO audit_user;

-- Create Reporting user
CREATE USER report_user WITH PASSWORD 'ReportingBD101!';
GRANT CONNECT ON DATABASE banco_digital_reporting TO report_user;
GRANT USAGE ON SCHEMA public TO report_user;
GRANT CREATE ON SCHEMA public TO report_user;
