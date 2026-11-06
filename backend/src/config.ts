import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl: req("DATABASE_URL"),
  jwtSecret: isProd ? req("JWT_SECRET") : process.env.JWT_SECRET || "dev-secret-cambia-esto",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),
  ai: {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL || "gpt-4o-mini",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 25000),
  },
  paymentsMode: process.env.PAYMENTS_MODE || "demo",
  staticDir: process.env.STATIC_DIR || "",
};
