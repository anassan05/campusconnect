import { randomUUID, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { withTenantTransaction } from "../../src/lib/tenant-transaction";

if (!process.env.TEST_ADMIN_DATABASE_URL || !process.env.TEST_RUNTIME_DATABASE_URL) throw new Error("Disposable PostgreSQL test URLs required");
const admin = new PrismaClient({ datasources: { db: { url: process.env.TEST_ADMIN_DATABASE_URL } } });
const runtime = new PrismaClient({ datasources: { db: { url: process.env.TEST_RUNTIME_DATABASE_URL } } });
const a = randomUUID(), b = randomUUID(), userA = randomUUID(), userB = randomUUID(), platform = randomUUID();
const suffix = randomUUID();
const emails = { a: `poc-a-${suffix}@example.invalid`, b: `poc-b-${suffix}@example.invalid`, platform: `poc-platform-${suffix}@example.invalid` };
const password = `synthetic-${randomUUID()}`;
type Actor = { user_id: string; college_id: string | null; role: string };
async function login(email: string, pass: string): Promise<string | null> {
  const rows = await runtime.$queryRaw<Array<{ token: string | null }>>`SELECT cc_auth_poc.login(${email}, ${pass}) AS token`;
  return rows[0].token;
}
async function resolve(token: string): Promise<Actor[]> {
  return runtime.$queryRaw<Actor[]>`SELECT * FROM cc_auth_poc.resolve(${token})`;
}

beforeAll(async () => {
  await admin.college.createMany({ data: [{ id: a, name: "POC college A" }, { id: b, name: "POC college B" }] });
  await admin.user.createMany({ data: [
    { id: userA, email: emails.a, role: "STUDENT", collegeId: a },
    { id: userB, email: emails.b, role: "COLLEGE_ADMIN", collegeId: b },
    { id: platform, email: emails.platform, role: "PLATFORM_SUPER_ADMIN" },
  ] });
  for (const id of [userA, userB, platform]) {
    await admin.$executeRaw`INSERT INTO cc_auth_poc.credentials (user_id, password_hash)
      VALUES (${id}::uuid, cc_auth_poc_crypto.crypt(${password}, cc_auth_poc_crypto.gen_salt('bf', 12)))`;
  }
});
afterAll(async () => { await runtime.$disconnect(); await admin.$disconnect(); });

describe("Disposable PostgreSQL authentication boundary proof", () => {
  it("verifies synthetic credentials without returning hashes", async () => {
    const token = await login(emails.a.toUpperCase(), password);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const identity = await resolve(token!);
    expect(identity).toEqual([{ user_id: userA, college_id: a, role: "STUDENT" }]);
    expect(JSON.stringify(identity)).not.toContain("password");
  });
  it("rejects invalid, unknown, and inactive credentials with the same null response", async () => {
    await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active = false WHERE user_id = ${userA}::uuid`;
    try {
      expect(await login(emails.a, password)).toBeNull();
      expect(await login(emails.b, "incorrect synthetic password")).toBeNull();
      expect(await login(`unknown-${suffix}@example.invalid`, password)).toBeNull();
    } finally {
      await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active = true WHERE user_id = ${userA}::uuid`;
    }
  });
  it("denies ordinary role direct access to credential hashes and session storage", async () => {
    await expect(runtime.$queryRaw`SELECT password_hash FROM cc_auth_poc.credentials`).rejects.toThrow();
    await expect(runtime.$queryRaw`SELECT * FROM cc_auth_poc.sessions`).rejects.toThrow();
    await expect(runtime.$queryRaw`SELECT password_hash FROM cc_auth_poc.dummy_hash`).rejects.toThrow();
  });
  it("denies cross-tenant identity enumeration through the normal runtime role", async () => {
    expect(await runtime.user.findMany({ where: { id: { in: [userA, userB, platform] } } })).toEqual([]);
    await withTenantTransaction(runtime, a, async (tx) => {
      expect(await tx.user.findUnique({ where: { id: userB } })).toBeNull();
      expect(await tx.user.findUnique({ where: { id: platform } })).toBeNull();
      expect(await tx.user.findUnique({ where: { id: userA } })).not.toBeNull();
    });
  });
  it("authenticates a platform identity through the same credential interface", async () => {
    const token = await login(emails.platform, password);
    expect(token).toBeTruthy();
    expect(await resolve(token!)).toEqual([{ user_id: platform, college_id: null, role: "PLATFORM_SUPER_ADMIN" }]);
  });
  it("rejects arbitrary user and college IDs as session capabilities", async () => {
    for (const invalid of [userB, b, randomBytes(32).toString("hex"), "", "not-a-session"]) expect(await resolve(invalid)).toEqual([]);
    const token = await login(emails.a, password);
    expect(await resolve(token!)).toEqual([{ user_id: userA, college_id: a, role: "STUDENT" }]);
  });
  it("enforces expiration and revocation", async () => {
    const token = (await login(emails.a, password))!;
    expect(await resolve(token)).toHaveLength(1);
    await runtime.$executeRaw`SELECT cc_auth_poc.revoke(${token})`;
    expect(await resolve(token)).toEqual([]);
    const expired = (await login(emails.a, password))!;
    await admin.$executeRaw`UPDATE cc_auth_poc.sessions SET expires_at = clock_timestamp() - interval '1 second'
      WHERE token_hash = cc_auth_poc_crypto.digest(${expired}, 'sha256')`;
    expect(await resolve(expired)).toEqual([]);
  });
  it("resolves current role and immediately denies inactive accounts", async () => {
    const token = (await login(emails.a, password))!;
    try {
      await admin.user.update({ where: { id: userA }, data: { role: "COORDINATOR" } });
      expect(await resolve(token)).toEqual([{ user_id: userA, college_id: a, role: "COORDINATOR" }]);
      await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active = false WHERE user_id = ${userA}::uuid`;
      expect(await resolve(token)).toEqual([]);
    } finally {
      await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active = true WHERE user_id = ${userA}::uuid`;
      await admin.user.update({ where: { id: userA }, data: { role: "STUDENT" } });
    }
  });
  it("has a non-login definer owner with no memberships or bypass privileges", async () => {
    const roles = await admin.$queryRaw<Array<{ rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolreplication: boolean; memberships: bigint }>>`
      SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication,
      (SELECT count(*) FROM pg_auth_members m WHERE m.member = r.oid OR m.roleid = r.oid) AS memberships
      FROM pg_roles r WHERE rolname = 'cc_auth_poc_owner'`;
    expect(roles).toEqual([{ rolcanlogin: false, rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, memberships: 0n }]);
    const [{ createAllowed }] = await admin.$queryRaw<Array<{ createAllowed: boolean }>>`
      SELECT has_schema_privilege('cc_auth_poc_owner', 'cc_auth_poc', 'CREATE') AS "createAllowed"`;
    expect(createAllowed).toBe(false);
  });
  it("keeps table privileges and ownership separate from the runtime and definer roles", async () => {
    const rows = await admin.$queryRaw<Array<{ tablename: string; owner: string; runtime_select: boolean; definer_update: boolean }>>`
      SELECT c.relname AS tablename, pg_get_userbyid(c.relowner) AS owner,
        has_table_privilege('campusconnect_runtime', c.oid, 'SELECT') AS runtime_select,
        has_table_privilege('cc_auth_poc_owner', c.oid, 'UPDATE') AS definer_update
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='cc_auth_poc' AND c.relname IN ('credentials', 'dummy_hash', 'sessions') ORDER BY c.relname`;
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.owner).not.toBe("campusconnect_runtime");
      expect(row.owner).not.toBe("cc_auth_poc_owner");
      expect(row.runtime_select).toBe(false);
      expect(row.definer_update).toBe(row.tablename === "sessions");
    }
    const [{ canUpdateUsers, canSelectUsers }] = await admin.$queryRaw<Array<{ canUpdateUsers: boolean; canSelectUsers: boolean }>>`
      SELECT has_any_column_privilege('cc_auth_poc_owner', 'public.users', 'UPDATE') AS "canUpdateUsers",
             has_table_privilege('campusconnect_runtime', 'public.users', 'SELECT') AS "canSelectUsers"`;
    expect(canUpdateUsers).toBe(false);
    // The ordinary SELECT grant remains RLS-constrained, not unrestricted.
    expect(canSelectUsers).toBe(true);
  });
  it("only permits the intended functions and denies PUBLIC execution", async () => {
    const functions = await admin.$queryRaw<Array<{ name: string; definer: boolean; owner: string; settings: string[]; public_execute: boolean; runtime_execute: boolean }>>`
      SELECT p.proname AS name, p.prosecdef AS definer, pg_get_userbyid(p.proowner) AS owner, p.proconfig AS settings,
      EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute,
      has_function_privilege('campusconnect_runtime', p.oid, 'EXECUTE') AS runtime_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'cc_auth_poc' ORDER BY p.proname`;
    expect(functions.map(f => f.name)).toEqual(["login", "resolve", "revoke"]);
    for (const f of functions) expect(f).toMatchObject({ definer: true, owner: "cc_auth_poc_owner", settings: ["search_path=pg_catalog"], public_execute: false, runtime_execute: true });
    await expect(runtime.$queryRaw`SELECT cc_auth_poc_crypto.crypt('password', 'anything')`).rejects.toThrow();
  });
  it("retains forced tenant RLS and runtime policies while scoping broker policy to its owner", async () => {
    const policies = await admin.$queryRaw<Array<{ policyname: string; roles: string }>>`
      SELECT policyname, array_to_string(roles, ',') AS roles FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'users' ORDER BY policyname`;
    expect(policies).toEqual([
      { policyname: "cc_poc_auth_lookup", roles: "cc_auth_poc_owner" },
      { policyname: "users_tenant_isolation", roles: "campusconnect_runtime" },
    ]);
    const tables = await admin.$queryRaw<Array<{ name: string; enabled: boolean; forced: boolean }>>`
      SELECT c.relname AS name, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE (n.nspname='public' AND c.relname IN ('users', 'colleges'))
         OR (n.nspname='cc_auth_poc' AND c.relname IN ('credentials', 'sessions', 'dummy_hash'))`;
    expect(tables).toHaveLength(5);
    for (const table of tables) expect(table).toMatchObject({ enabled: true, forced: true });
  });
});
