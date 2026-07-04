// Server-only env access. Import this instead of reading process.env directly
// so a missing var fails fast at startup instead of surfacing as undefined deep in a request.
import "server-only";

interface ServerEnv {
  DATABASE_URL: string;
  STORAGE_ACCESS_KEY: string;
  STORAGE_SECRET: string;
  STORAGE_BUCKET: string;
  STORAGE_ENDPOINT: string;
  GEMINI_API_KEY: string;
  TAGGING_PROVIDER: string;
  TAGGING_MODEL: string;
  AUTH_SECRET: string;
  APP_URL: string;
}

const REQUIRED_KEYS: (keyof ServerEnv)[] = [
  "DATABASE_URL",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET",
  "STORAGE_BUCKET",
  "STORAGE_ENDPOINT",
  "GEMINI_API_KEY",
  "TAGGING_PROVIDER",
  "TAGGING_MODEL",
  "AUTH_SECRET",
  "APP_URL",
];

function loadServerEnv(): ServerEnv {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env.local and fill them in.`,
    );
  }
  return {
    DATABASE_URL: process.env.DATABASE_URL as string,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY as string,
    STORAGE_SECRET: process.env.STORAGE_SECRET as string,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET as string,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT as string,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,
    TAGGING_PROVIDER: process.env.TAGGING_PROVIDER as string,
    TAGGING_MODEL: process.env.TAGGING_MODEL as string,
    AUTH_SECRET: process.env.AUTH_SECRET as string,
    APP_URL: process.env.APP_URL as string,
  };
}

export const env = loadServerEnv();
