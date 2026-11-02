-- Run as a privileged database administrator AFTER migrations. This role is
-- created without LOGIN or password; provision login credentials separately.
-- Never run using the application connection. Migration owner must differ.
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
             WHERE r.rolname = 'campusconnect_runtime') THEN
    RAISE EXCEPTION 'campusconnect_runtime must not be a member of other roles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
             WHERE c.oid IN ('public.colleges'::regclass, 'public.users'::regclass)
               AND r.rolname = 'campusconnect_runtime') THEN
    RAISE EXCEPTION 'runtime role must not own tenant tables';
  END IF;
END $$;
REVOKE ALL ON TABLE public.colleges, public.users FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO campusconnect_runtime;
GRANT SELECT ON public.colleges TO campusconnect_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO campusconnect_runtime;
