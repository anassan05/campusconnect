import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantTransaction } from "@/lib/tenant-transaction";

// Run ONLY against a disposable, migrated test database. The fixture writer must
// bypass RLS; the client under test must be the actual restricted login role.
if (!process.env.TEST_ADMIN_DATABASE_URL || !process.env.TEST_RUNTIME_DATABASE_URL) {
  throw new Error("TEST_ADMIN_DATABASE_URL and TEST_RUNTIME_DATABASE_URL are required");
}
const runtimeUrl = new URL(process.env.TEST_RUNTIME_DATABASE_URL);
runtimeUrl.searchParams.set("connection_limit", "1");
const admin = new PrismaClient({ datasources: { db: { url: process.env.TEST_ADMIN_DATABASE_URL } } });
const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
const a = randomUUID();
const b = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
const platform = randomUUID();
const email = () => `${randomUUID()}@example.invalid`;

beforeAll(async () => {
  await admin.college.createMany({ data: [{ id: a, name: "Synthetic A" }, { id: b, name: "Synthetic B" }] });
  await admin.user.createMany({ data: [
    { id: userA, collegeId: a, email: email(), role: "STUDENT" },
    { id: userB, collegeId: b, email: email(), role: "STUDENT" },
    { id: platform, email: email(), role: "PLATFORM_SUPER_ADMIN" },
  ] });
});
afterAll(async () => { await runtime.$disconnect(); await admin.$disconnect(); });

describe("PostgreSQL tenant isolation (restricted runtime login)", () => {
  it("A cannot read B's college or users or platform identities", async () => {
    await withTenantTransaction(runtime, a, async (tx) => {
      expect(await tx.college.findMany({ where: { id: b } })).toEqual([]);
      expect(await tx.user.findMany({ where: { id: { in: [userB, platform] } } })).toEqual([]);
      expect(await tx.user.findUnique({ where: { id: userA } })).not.toBeNull();
    });
  });

  it("A cannot insert for B or create a platform identity", async () => {
    await expect(withTenantTransaction(runtime, a, (tx) => tx.user.create({ data: {
      id: randomUUID(), email: email(), role: "STUDENT", collegeId: b,
    } }))).rejects.toThrow();
    await expect(withTenantTransaction(runtime, a, (tx) => tx.user.create({ data: {
      id: randomUUID(), email: email(), role: "PLATFORM_SUPER_ADMIN",
    } }))).rejects.toThrow();
  });

  it("A cannot update or delete B's records, or move an A row to B", async () => {
    await withTenantTransaction(runtime, a, async (tx) => {
      expect((await tx.user.updateMany({ where: { id: userB }, data: { email: email() } })).count).toBe(0);
      expect((await tx.user.deleteMany({ where: { id: userB } })).count).toBe(0);
    });
    await expect(withTenantTransaction(runtime, a, (tx) => tx.user.update({
      where: { id: userA }, data: { collegeId: b },
    }))).rejects.toThrow();
    expect(await admin.user.findUnique({ where: { id: userB } })).not.toBeNull();
  });

  it("missing context denies reads and writes", async () => {
    expect(await runtime.college.findMany({ where: { id: { in: [a, b] } } })).toEqual([]);
    expect(await runtime.user.findMany({ where: { id: { in: [userA, userB] } } })).toEqual([]);
    expect((await runtime.user.updateMany({ where: { id: userA }, data: { email: email() } })).count).toBe(0);
    expect((await runtime.user.deleteMany({ where: { id: userA } })).count).toBe(0);
    await expect(runtime.user.create({ data: { email: email(), role: "STUDENT", collegeId: a } })).rejects.toThrow();
  });

  it("a tenant user cannot reference a creator in a different tenant", async () => {
    // Row itself satisfies RLS; the composite FK, not RLS, must reject it.
    await expect(withTenantTransaction(runtime, a, (tx) => tx.user.create({ data: {
      id: randomUUID(), email: email(), role: "STUDENT", collegeId: a, createdByUserId: userB,
    } }))).rejects.toMatchObject({ code: "P2003" });
    await withTenantTransaction(runtime, a, async (tx) => {
      expect(await tx.user.create({ data: {
        id: randomUUID(), email: email(), role: "STUDENT", collegeId: a, createdByUserId: userA,
      } })).toMatchObject({ createdByUserId: userA });
    });
  });

  it("checks role attributes, membership, ownership, and enabled/forced RLS", async () => {
    const roles = await runtime.$queryRaw<Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean; memberships: bigint }>>`
      SELECT current_user, r.rolsuper, r.rolbypassrls,
      (SELECT count(*) FROM pg_auth_members m WHERE m.member = r.oid) AS memberships
      FROM pg_roles r WHERE r.rolname = current_user`;
    expect(roles).toEqual([{ current_user: "campusconnect_runtime", rolsuper: false, rolbypassrls: false, memberships: 0n }]);
    const tables = await runtime.$queryRaw<Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; owner: string }>>`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('users', 'colleges') ORDER BY c.relname`;
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.relrowsecurity).toBe(true);
      expect(table.relforcerowsecurity).toBe(true);
      expect(table.owner).not.toBe("campusconnect_runtime");
    }
  });

  it("does not leak context when the same pooled connection is reused after commit and rollback", async () => {
    const pidA = await withTenantTransaction(runtime, a, async (tx) => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      expect(await tx.user.findUnique({ where: { id: userA } })).not.toBeNull();
      return pid;
    });
    const [{ pid, setting }] = await runtime.$queryRaw<Array<{ pid: number; setting: string | null }>>`
      SELECT pg_backend_pid() AS pid, current_setting('app.college_id', true) AS setting`;
    expect(pid).toBe(pidA);
    expect(setting || "").toBe("");
    await withTenantTransaction(runtime, b, async (tx) => {
      const [{ pid: pidB }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      expect(pidB).toBe(pidA);
      expect(await tx.user.findUnique({ where: { id: userA } })).toBeNull();
      expect(await tx.user.findUnique({ where: { id: userB } })).not.toBeNull();
    });
    await expect(withTenantTransaction(runtime, a, async () => { throw new Error("rollback"); })).rejects.toThrow("rollback");
    const [{ pid: pidAfter, setting: after }] = await runtime.$queryRaw<Array<{ pid: number; setting: string | null }>>`
      SELECT pg_backend_pid() AS pid, current_setting('app.college_id', true) AS setting`;
    expect(pidAfter).toBe(pidA);
    expect(after || "").toBe("");
    expect(await runtime.user.findMany({ where: { id: { in: [userA, userB] } } })).toEqual([]);
  });

  it("enforces the role/tenant invariant even for a privileged writer", async () => {
    await expect(admin.user.create({ data: { email: email(), role: "STUDENT" } })).rejects.toThrow();
    await expect(admin.user.create({ data: { email: email(), role: "PLATFORM_SUPER_ADMIN", collegeId: a } })).rejects.toThrow();
  });
});
