-- Run as a database administrator BEFORE applying migrations: CREATE POLICY
-- requires the target role to exist. This role has no login or password yet.
-- Migration and application identities must be distinct.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'campusconnect_runtime') THEN
    CREATE ROLE campusconnect_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'campusconnect_runtime'
             AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
    RAISE EXCEPTION 'campusconnect_runtime has unsafe attributes';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
             WHERE r.rolname = 'campusconnect_runtime' OR m.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'campusconnect_runtime')) THEN
    RAISE EXCEPTION 'campusconnect_runtime must not have role memberships in either direction';
  END IF;
END $$;
