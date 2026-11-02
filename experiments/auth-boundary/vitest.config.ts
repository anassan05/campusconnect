import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "next/server": path.resolve("node_modules/next/server.js"), "next/headers": path.resolve("node_modules/next/headers.js") } },
  test: {
    environment: "node",
    include: ["experiments/auth-boundary/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    server: { deps: { inline: ["next-auth"] } },
  },
});
