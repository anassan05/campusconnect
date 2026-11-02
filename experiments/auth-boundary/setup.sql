-- EXPERIMENT ONLY: disposable PostgreSQL 16 database, administrator connection.
-- Not a Prisma migration. Never run this on a shared or production cluster.
-- Uses the already migrated Phase 1A public.users and campusconnect_runtime.
CREATE ROLE cc_auth_poc_owner NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA cc_auth_poc;
CREATE SCHEMA cc_auth_poc_crypto;
CREATE EXTENSION pgcrypto WITH SCHEMA cc_auth_poc_crypto;
REVOKE ALL ON SCHEMA cc_auth_poc, cc_auth_poc_crypto FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cc_auth_poc_crypto FROM PUBLIC;
GRANT USAGE ON SCHEMA public, cc_auth_poc, cc_auth_poc_crypto TO cc_auth_poc_owner;
GRANT USAGE ON SCHEMA cc_auth_poc TO campusconnect_runtime;
GRANT EXECUTE ON FUNCTION cc_auth_poc_crypto.crypt(text, text),
  cc_auth_poc_crypto.gen_random_bytes(integer), cc_auth_poc_crypto.digest(text, text)
  TO cc_auth_poc_owner;

-- This additional policy targets only the NOLOGIN proof owner. It does not
-- change the Phase 1A runtime policy or grant cross-tenant SELECT to runtime.
CREATE POLICY cc_poc_auth_lookup ON public.users FOR SELECT TO cc_auth_poc_owner USING (true);
GRANT SELECT (id, email, college_id, role) ON public.users TO cc_auth_poc_owner;

CREATE TABLE cc_auth_poc.credentials (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE cc_auth_poc.sessions (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE cc_auth_poc.dummy_hash (password_hash text NOT NULL);
INSERT INTO cc_auth_poc.dummy_hash VALUES
  (cc_auth_poc_crypto.crypt('synthetic dummy password', cc_auth_poc_crypto.gen_salt('bf', 12)));
ALTER TABLE cc_auth_poc.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_poc.credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_poc.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_poc.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_poc.dummy_hash ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_poc.dummy_hash FORCE ROW LEVEL SECURITY;
CREATE POLICY cc_poc_credentials ON cc_auth_poc.credentials TO cc_auth_poc_owner USING (true);
CREATE POLICY cc_poc_sessions ON cc_auth_poc.sessions TO cc_auth_poc_owner USING (true) WITH CHECK (true);
CREATE POLICY cc_poc_dummy ON cc_auth_poc.dummy_hash TO cc_auth_poc_owner USING (true);
REVOKE ALL ON ALL TABLES IN SCHEMA cc_auth_poc FROM PUBLIC, campusconnect_runtime;
GRANT SELECT ON cc_auth_poc.credentials, cc_auth_poc.dummy_hash TO cc_auth_poc_owner;
GRANT SELECT, INSERT, UPDATE ON cc_auth_poc.sessions TO cc_auth_poc_owner;

-- The bearer capability is returned only after verification; no hash, user ID,
-- or college ID is accepted as a session credential. Output is a 256-bit token.
CREATE FUNCTION cc_auth_poc.login(input_email text, input_password text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE account_id uuid; stored_hash text; active boolean; checked_hash text; token text;
BEGIN
  IF input_email IS NULL OR length(input_email) > 254 OR input_password IS NULL
     OR octet_length(input_password) > 72 OR length(input_password) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT u.id, c.password_hash, c.is_active INTO account_id, stored_hash, active
    FROM public.users AS u JOIN cc_auth_poc.credentials AS c ON c.user_id = u.id
    WHERE lower(u.email) = lower(btrim(input_email));
  checked_hash := coalesce(stored_hash, (SELECT d.password_hash FROM cc_auth_poc.dummy_hash AS d LIMIT 1));
  IF cc_auth_poc_crypto.crypt(input_password, checked_hash) <> checked_hash
     OR account_id IS NULL OR active IS NOT TRUE THEN RETURN NULL; END IF;
  token := encode(cc_auth_poc_crypto.gen_random_bytes(32), 'hex');
  INSERT INTO cc_auth_poc.sessions(token_hash, user_id, expires_at)
    VALUES (cc_auth_poc_crypto.digest(token, 'sha256'), account_id, clock_timestamp() + interval '15 minutes');
  RETURN token;
END $$;

CREATE FUNCTION cc_auth_poc.resolve(input_token text)
RETURNS TABLE(user_id uuid, college_id uuid, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT u.id, u.college_id, u.role::text
  FROM cc_auth_poc.sessions AS s
  JOIN cc_auth_poc.credentials AS c ON c.user_id = s.user_id
  JOIN public.users AS u ON u.id = s.user_id
  WHERE input_token ~ '^[0-9a-f]{64}$'
    AND s.token_hash = cc_auth_poc_crypto.digest(input_token, 'sha256')
    AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp() AND c.is_active;
$$;

CREATE FUNCTION cc_auth_poc.revoke(input_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  UPDATE cc_auth_poc.sessions SET revoked_at = clock_timestamp()
  WHERE input_token ~ '^[0-9a-f]{64}$'
    AND token_hash = cc_auth_poc_crypto.digest(input_token, 'sha256') AND revoked_at IS NULL;
$$;

-- Owner can execute only these pre-defined functions and cannot log in. It has
-- no CREATE privilege in either schema after ownership transfer.
GRANT CREATE ON SCHEMA cc_auth_poc TO cc_auth_poc_owner;
ALTER FUNCTION cc_auth_poc.login(text, text) OWNER TO cc_auth_poc_owner;
ALTER FUNCTION cc_auth_poc.resolve(text) OWNER TO cc_auth_poc_owner;
ALTER FUNCTION cc_auth_poc.revoke(text) OWNER TO cc_auth_poc_owner;
REVOKE CREATE ON SCHEMA cc_auth_poc FROM cc_auth_poc_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cc_auth_poc FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cc_auth_poc.login(text, text), cc_auth_poc.resolve(text), cc_auth_poc.revoke(text) TO campusconnect_runtime;
