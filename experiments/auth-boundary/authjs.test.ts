// HTTP-level feasibility test only. This configuration is NOT an app route.
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

if (!process.env.TEST_ADMIN_DATABASE_URL || !process.env.TEST_RUNTIME_DATABASE_URL) throw new Error("Disposable PostgreSQL URLs required");
const admin = new PrismaClient({ datasources: { db: { url: process.env.TEST_ADMIN_DATABASE_URL } } });
const runtime = new PrismaClient({ datasources: { db: { url: process.env.TEST_RUNTIME_DATABASE_URL } } });
const college = randomUUID(), id = randomUUID(), email = `authjs-${randomUUID()}@example.invalid`;
const password = `synthetic-${randomUUID()}`;
const secret = randomUUID() + randomUUID();
const origin = "https://auth-test.example.invalid";
type Actor = { user_id: string; college_id: string | null; role: string };
async function resolve(capability: string): Promise<Actor[]> {
  return runtime.$queryRaw<Actor[]>`SELECT * FROM cc_auth_poc.resolve(${capability})`;
}

// Auth.js' encrypted JWT contains the secret capability. The session callback
// deliberately returns no identity, authorization claims, or capability.
const { handlers } = NextAuth({
  secret,
  trustHost: true,
  useSecureCookies: true,
  session: { strategy: "jwt", maxAge: 900 },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      if (typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
      const rows = await runtime.$queryRaw<Array<{ cap: string | null }>>`
        SELECT cc_auth_poc.login(${credentials.email}, ${credentials.password}) AS cap`;
      return rows[0].cap ? { id: randomUUID(), capability: rows[0].cap } : null;
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.capability = (user as { capability?: unknown }).capability;
      if (typeof token.capability !== "string") return null;
      try { return (await resolve(token.capability)).length === 1 ? token : null; }
      catch { return null; }
    },
    async session({ session }) { return { expires: session.expires, user: { name: "Signed in" } }; },
  },
  events: {
    async signOut(message) {
      if ("token" in message && typeof message.token?.capability === "string")
        await runtime.$executeRaw`SELECT cc_auth_poc.revoke(${message.token.capability})`;
    },
  },
  logger: { error() {}, warn() {}, debug() {} },
});
function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) { return new NextRequest(`${origin}${path}`, init); }
function cookiePairs(response: Response) { return response.headers.getSetCookie().map(value => value.split(";")[0]).join("; "); }
async function csrf() {
  const response = await handlers.GET(request("/api/auth/csrf"));
  expect(response.status).toBe(200);
  const body = await response.json() as { csrfToken: string };
  return { csrfToken: body.csrfToken, cookies: cookiePairs(response) };
}
async function signIn(pass = password) {
  const initial = await csrf();
  const form = new URLSearchParams({ csrfToken: initial.csrfToken, email, password: pass, callbackUrl: `${origin}/` });
  const response = await handlers.POST(request("/api/auth/callback/credentials", {
    method: "POST", headers: { cookie: initial.cookies, "content-type": "application/x-www-form-urlencoded" }, body: form,
  }));
  return { response, initial };
}
async function session(cookie: string) {
  return handlers.GET(request("/api/auth/session", { headers: { cookie } }));
}
async function serverActor(cookie: string, requestedCollege = "") {
  const req = request(`/protected?collegeId=${encodeURIComponent(requestedCollege)}`, { headers: { cookie } });
  const jwt = await getToken({ req, secret, secureCookie: true });
  if (!jwt || typeof jwt.capability !== "string") return [];
  return resolve(jwt.capability);
}

beforeAll(async () => {
  await admin.college.create({ data: { id: college, name: "Auth.js synthetic college" } });
  await admin.user.create({ data: { id, email, role: "STUDENT", collegeId: college } });
  await admin.$executeRaw`INSERT INTO cc_auth_poc.credentials (user_id, password_hash)
    VALUES (${id}::uuid, cc_auth_poc_crypto.crypt(${password}, cc_auth_poc_crypto.gen_salt('bf', 12)))`;
});
afterAll(async () => { await admin.$disconnect(); await runtime.$disconnect(); });

describe("Auth.js v5 credentials and encrypted JWT proof (no live endpoint)", () => {
  it("issues a secure HTTP-only cookie; session JSON excludes the broker capability", async () => {
    const { response } = await signIn();
    expect(response.status).toBe(302);
    const setCookies = response.headers.getSetCookie();
    const sessionCookie = setCookies.find(value => value.startsWith("__Secure-authjs.session-token="));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/Secure/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
    const cookie = cookiePairs(response);
    const jwt = await getToken({ req: request("/protected", { headers: { cookie } }), secret, secureCookie: true });
    expect(jwt?.capability).toMatch(/^[0-9a-f]{64}$/);
    const result = await session(cookie);
    const text = await result.text();
    expect(result.status).toBe(200);
    expect(text).not.toContain(String(jwt?.capability));
    expect(text).not.toContain("password");
    expect(JSON.parse(text)).toMatchObject({ user: { name: "Signed in" } });
    expect(await serverActor(cookie)).toEqual([{ user_id: id, college_id: college, role: "STUDENT" }]);
  });
  it("rejects invalid credentials and a forged or missing cookie", async () => {
    const { response } = await signIn("wrong synthetic password");
    expect(response.headers.get("location")).toContain("CredentialsSignin");
    expect(response.headers.getSetCookie().some(value => value.startsWith("__Secure-authjs.session-token="))).toBe(false);
    expect(await serverActor("")).toEqual([]);
    expect(await serverActor("__Secure-authjs.session-token=forged")).toEqual([]);
  });
  it("ignores a client-supplied tenant when resolving the authenticated actor", async () => {
    const { response } = await signIn();
    const cookie = cookiePairs(response);
    const foreignCollege = randomUUID();
    expect(await serverActor(cookie, foreignCollege)).toEqual([{ user_id: id, college_id: college, role: "STUDENT" }]);
  });
  it("rejects a credentials POST without a CSRF token", async () => {
    const response = await handlers.POST(request("/api/auth/callback/credentials", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }),
    }));
    expect(response.headers.getSetCookie().some(value => value.startsWith("__Secure-authjs.session-token="))).toBe(false);
    expect(response.headers.get("location")).toContain("MissingCSRF");
  });
  it("checks current role, account status and server revocation for existing cookies", async () => {
    const { response } = await signIn();
    const cookie = cookiePairs(response);
    try {
      await admin.user.update({ where: { id }, data: { role: "COORDINATOR" } });
      expect(await serverActor(cookie)).toEqual([{ user_id: id, college_id: college, role: "COORDINATOR" }]);
      await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active=false WHERE user_id=${id}::uuid`;
      expect(await serverActor(cookie)).toEqual([]);
      expect(await (await session(cookie)).json()).toBeNull();
    } finally {
      await admin.$executeRaw`UPDATE cc_auth_poc.credentials SET is_active=true WHERE user_id=${id}::uuid`;
      await admin.user.update({ where: { id }, data: { role: "STUDENT" } });
    }
    const csrfInfo = await csrf();
    const responseOut = await handlers.POST(request("/api/auth/signout", {
      method: "POST", headers: { cookie: `${cookie}; ${csrfInfo.cookies}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrfInfo.csrfToken, callbackUrl: `${origin}/` }),
    }));
    expect(responseOut.status).toBe(302);
    // Replay the original cookie: server-side revocation, not just cookie deletion.
    expect(await serverActor(cookie)).toEqual([]);
    expect(await (await session(cookie)).json()).toBeNull();
  });
});
