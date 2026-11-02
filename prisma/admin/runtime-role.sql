-- Run as a privileged database administrator AFTER migration. First run
-- create-runtime-role.sql, then apply migrations as a distinct table owner.
-- Never execute this script using the application connection.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'campusconnect_runtime'
                 AND NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
    RAISE EXCEPTION 'campusconnect_runtime is missing or has unsafe attributes';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
             WHERE r.rolname = 'campusconnect_runtime' OR m.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'campusconnect_runtime')) THEN
    RAISE EXCEPTION 'campusconnect_runtime must not have role memberships in either direction';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
             WHERE c.oid IN ('public.colleges'::regclass, 'public.users'::regclass)
               AND r.rolname = 'campusconnect_runtime') THEN
    RAISE EXCEPTION 'runtime role must not own tenant tables';
  END IF;
  -- This catches direct and PUBLIC privileges. An operator must fix unsafe
  -- schema privileges rather than silently changing other principals' grants.
  IF has_schema_privilege('campusconnect_runtime', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'runtime role must not have CREATE on the application schema';
  END IF;
END $$;
REVOKE ALL ON TABLE public.colleges, public.users FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO campusconnect_runtime;
GRANT SELECT ON public.colleges TO campusconnect_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO campusconnect_runtime;

-- Fail rather than silently leave unexpected effective privileges in place.
DO $$
DECLARE
  priv text;
BEGIN
  FOREACH priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('campusconnect_runtime', 'public.colleges', priv) THEN
      RAISE EXCEPTION 'unexpected colleges privilege: %', priv;
    END IF;
  END LOOP;
  FOREACH priv IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('campusconnect_runtime', 'public.users', priv) THEN
      RAISE EXCEPTION 'unexpected users privilege: %', priv;
    END IF;
  END LOOP;
  FOREACH priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'REFERENCES'] LOOP
    IF has_any_column_privilege('campusconnect_runtime', 'public.colleges', priv) THEN
      RAISE EXCEPTION 'unexpected colleges column privilege: %', priv;
    END IF;
  END LOOP;
  IF has_any_column_privilege('campusconnect_runtime', 'public.users', 'REFERENCES') THEN
    RAISE EXCEPTION 'unexpected users REFERENCES column privilege';
  END IF;
  FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] LOOP
    IF has_any_column_privilege('campusconnect_runtime', 'public.colleges', priv || ' WITH GRANT OPTION')
       OR has_any_column_privilege('campusconnect_runtime', 'public.users', priv || ' WITH GRANT OPTION') THEN
      RAISE EXCEPTION 'unexpected column grant option: %', priv;
    END IF;
  END LOOP;
  FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('campusconnect_runtime', 'public.colleges', priv || ' WITH GRANT OPTION')
       OR has_table_privilege('campusconnect_runtime', 'public.users', priv || ' WITH GRANT OPTION') THEN
      RAISE EXCEPTION 'unexpected table grant option: %', priv;
    END IF;
  END LOOP;
END $$;
COMMIT;
