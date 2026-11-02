import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /CampusConnect/i })).toBeVisible();
  });

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders the form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });
});
