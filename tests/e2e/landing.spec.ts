import { test, expect } from "@playwright/test";

// NOTE: not yet executed in the agent sandbox (browser binaries blocked);
// it runs in environments with Playwright browsers installed.
test("landing page renders the product name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /CampusConnect/i })).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect((await res.json()).status).toBe("ok");
});
