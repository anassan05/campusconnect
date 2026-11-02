import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["experiments/auth-boundary/*.test.ts"], testTimeout: 30000, hookTimeout: 30000, fileParallelism: false },
});
