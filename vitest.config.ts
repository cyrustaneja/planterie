import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

// Unlike Next.js, Vitest doesn't load .env.local into process.env on its own. Modules
// under test (e.g. src/env.ts) read process.env directly, so populate it here —
// falling back to whatever's already set (e.g. CI secrets) if the file is absent.
function loadDotEnvLocal() {
  const envPath = path.resolve(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) {
      process.env[match[1]] ??= match[2];
    }
  }
}

loadDotEnvLocal();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
