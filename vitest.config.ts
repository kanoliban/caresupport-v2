import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["convex/**/*.test.ts", "tests/**/*.test.ts", "scripts/**/*.test.ts"],
    globals: true,
  },
});
