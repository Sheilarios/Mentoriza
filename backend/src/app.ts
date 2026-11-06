import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { aiEnabled } from "./lib/ai.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { coursesRouter } from "./routes/courses.js";
import { focusRouter } from "./routes/focus.js";
import { meRouter } from "./routes/me.js";
import { mentorPanelRouter, mentoringsRouter, mentorsRouter } from "./routes/mentors.js";
import { plansPublicRouter, plansRouter } from "./routes/plans.js";
import { studyRouter } from "./routes/study.js";
import { adminRouter, leadsRouter, uniAdminRouter } from "./routes/universities.js";
import { validationRouter } from "./routes/validation.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(compression());
  app.use(cors({ origin: config.corsOrigin.length ? config.corsOrigin : true }));
  app.use(express.json({ limit: "1mb" }));
  if (process.env.NODE_ENV !== "test") app.use(morgan(config.isProd ? "combined" : "dev"));

  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: true, legacyHeaders: false, message: { error: "Demasiados intentos. Espera unos minutos." } });
  const aiLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Vas muy rápido. Espera un momento." } });

  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, ai: aiEnabled(), payments: config.paymentsMode, time: new Date().toISOString() });
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/leads", authLimiter, leadsRouter);
  app.use("/api/validation", validationRouter);
  app.use("/api/plans", plansPublicRouter);

  app.use("/api/me", requireAuth, meRouter);
  app.use("/api/courses", requireAuth, coursesRouter);
  app.use("/api/study", requireAuth, aiLimiter, studyRouter);
  app.use("/api/focus", requireAuth, focusRouter);
  app.use("/api/mentors", requireAuth, mentorsRouter);
  app.use("/api/mentorings", requireAuth, mentoringsRouter);
  app.use("/api/mentor-panel", requireAuth, mentorPanelRouter);
  app.use("/api/billing", requireAuth, plansRouter);
  app.use("/api/uni-admin", requireAuth, uniAdminRouter);
  app.use("/api/admin", requireAuth, adminRouter);
  app.use("/api", notFound);

  // Sirve el frontend compilado (despliegue en un solo servicio).
  const staticDir = config.staticDir ? path.resolve(config.staticDir) : "";
  if (staticDir && fs.existsSync(path.join(staticDir, "index.html"))) {
    app.use(express.static(staticDir, { maxAge: "7d", index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(staticDir, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
