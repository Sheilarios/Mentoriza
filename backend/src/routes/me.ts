import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { demoAccountsEnabled, isDemoEmail } from "../lib/demo.js";
import { loadUser, publicUser } from "../lib/users.js";
import { toLines } from "../lib/rules.js";
import { HttpError } from "../middleware/error.js";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  res.json(await publicUser(await loadUser(req.auth!.sub)));
});

meRouter.patch("/", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      darkMode: z.boolean().nullable().optional(),
      career: z.string().trim().max(120).nullable().optional(),
      cycle: z.number().int().min(1).max(14).nullable().optional(),
    })
    .parse(req.body);
  await prisma.user.update({ where: { id: req.auth!.sub }, data: body });
  res.json(await publicUser(await loadUser(req.auth!.sub)));
});

meRouter.patch("/password", async (req, res) => {
  const body = z.object({ current: z.string().min(1), next: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres.").max(100) }).parse(req.body);
  const u = await loadUser(req.auth!.sub);
  if (demoAccountsEnabled() && isDemoEmail(u.email)) throw new HttpError(403, "Las cuentas de prueba no pueden cambiar su contraseña.");
  if (!(await bcrypt.compare(body.current, u.passwordHash))) throw new HttpError(400, "Tu contraseña actual no coincide.");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(body.next, 10) } });
  res.json({ ok: true });
});

const EMOJIS = ["📘", "📗", "📙"];

export const SAMPLE_COURSES = [
  {
    name: "Desarrollo Web",
    emoji: "💻",
    syllabus: ["Variables y tipos de datos", "Funciones y alcance", "Arreglos y métodos map/filter", "Manipulación del DOM", "Consumo de APIs con fetch"],
  },
  {
    name: "Cálculo II",
    emoji: "📐",
    syllabus: ["Integrales indefinidas", "Integración por partes", "Sustitución trigonométrica", "Series y convergencia"],
  },
];

meRouter.post("/onboarding", async (req, res) => {
  const body = z
    .object({
      career: z.string().trim().max(120).optional().default(""),
      cycle: z.number().int().min(1).max(14).optional(),
      courses: z.array(z.string().trim().min(1).max(80)).max(3).optional().default([]),
      rubric: z.string().max(8000).optional().default(""),
    })
    .parse(req.body);
  const userId = req.auth!.sub;
  const existing = await prisma.course.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!existing.length && !body.courses.length) {
    for (const c of SAMPLE_COURSES) existing.push(await prisma.course.create({ data: { userId, ...c } }));
  }
  for (const [i, name] of body.courses.entries()) {
    if (!existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      existing.push(await prisma.course.create({ data: { userId, name, emoji: EMOJIS[i] || "📘" } }));
    }
  }
  const first = body.courses.length ? existing.find((c) => c.name.toLowerCase() === body.courses[0].toLowerCase()) : existing[0];
  if (first && body.rubric.trim()) await prisma.course.update({ where: { id: first.id }, data: { rubric: toLines(body.rubric) } });
  await prisma.user.update({ where: { id: userId }, data: { career: body.career || null, cycle: body.cycle ?? null, onboarded: true } });
  res.json(await publicUser(await loadUser(userId)));
});

meRouter.post("/onboarding/reset", async (req, res) => {
  await prisma.user.update({ where: { id: req.auth!.sub }, data: { onboarded: false } });
  res.json(await publicUser(await loadUser(req.auth!.sub)));
});
