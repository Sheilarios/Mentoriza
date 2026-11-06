import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { DEMO_ACCOUNTS, demoAccountsEnabled, demoPassword, findDemoAccount } from "../lib/demo.js";
import { publicUser, loadUser } from "../lib/users.js";
import { limaMonth } from "../lib/rules.js";
import { signToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

export const authRouter = Router();

const email = z.string().trim().toLowerCase().email("Escribe un correo válido.");
const password = z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").max(100);

const nameFromEmail = (e: string) => {
  const t = e.split("@")[0].split(/[._-]/)[0];
  return t.charAt(0).toUpperCase() + t.slice(1);
};

async function respond(userId: string) {
  const u = await loadUser(userId);
  return { token: signToken({ sub: u.id, role: u.role }), user: await publicUser(u) };
}

authRouter.get("/universities", async (_req, res) => {
  const list = await prisma.university.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, shortName: true, domain: true } });
  res.json(list);
});

/** Lista pública de cuentas de prueba (vacía si DEMO_ACCOUNTS=false). */
authRouter.get("/demo-accounts", async (_req, res) => {
  if (!demoAccountsEnabled()) return res.json({ enabled: false, password: null, accounts: [] });
  const existing = await prisma.user.findMany({ where: { email: { in: DEMO_ACCOUNTS.map((a) => a.email) } }, select: { email: true } });
  const ready = new Set(existing.map((u) => u.email));
  res.json({
    enabled: true,
    password: demoPassword(),
    accounts: DEMO_ACCOUNTS.filter((a) => ready.has(a.email)).map(({ key, email, label, description, icon }) => ({ key, email, label, description, icon })),
  });
});

/** Ingreso con un clic a una cuenta de prueba. */
authRouter.post("/demo", async (req, res) => {
  if (!demoAccountsEnabled()) throw new HttpError(404, "Las cuentas de prueba están desactivadas.");
  const { key } = z.object({ key: z.string().min(1) }).parse(req.body);
  const account = findDemoAccount(key);
  if (!account) throw new HttpError(404, "Esa cuenta de prueba no existe.");
  const u = await prisma.user.findUnique({ where: { email: account.email } });
  if (!u) throw new HttpError(404, "La cuenta de prueba aún no está creada. Ejecuta: npm run db:seed");
  // El estudiante Gratis vuelve al plan Gratis para que cada visitante vea la experiencia completa.
  if (key === "estudiante-gratis" && u.plan !== "FREE") {
    await prisma.user.update({ where: { id: u.id }, data: { plan: "FREE", premiumSince: null, premiumRenewAt: null } });
  }
  res.json(await respond(u.id));
});

authRouter.post("/register", async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2, "Escribe tu nombre.").max(80), email, password }).parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "Ya existe una cuenta con ese correo. Ingresa con tu contraseña.");
  const u = await prisma.user.create({ data: { name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, 10), plan: "FREE" } });
  res.status(201).json(await respond(u.id));
});

authRouter.post("/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1, "Escribe tu contraseña.") }).parse(req.body);
  const u = await prisma.user.findUnique({ where: { email: body.email } });
  if (!u || !(await bcrypt.compare(body.password, u.passwordHash))) throw new HttpError(401, "Correo o contraseña incorrectos.");
  res.json(await respond(u.id));
});

/** Ingreso por convenio: correo del dominio de la universidad + contraseña asignada por Mentoriza. */
authRouter.post("/institutional", async (req, res) => {
  const body = z.object({ universityId: z.string().min(1, "Selecciona tu universidad."), email, password: z.string().min(1, "Escribe tu contraseña.") }).parse(req.body);
  const uni = await prisma.university.findFirst({ where: { id: body.universityId, active: true } });
  if (!uni) throw new HttpError(404, "Esa universidad no tiene convenio activo.");
  if (body.email.split("@")[1] !== uni.domain) throw new HttpError(400, `Usa tu correo institucional @${uni.domain}.`);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    const ok = (await bcrypt.compare(body.password, existing.passwordHash)) || (await bcrypt.compare(body.password, uni.accessCodeHash));
    if (!ok) throw new HttpError(401, "Contraseña incorrecta.");
    if (existing.universityId !== uni.id || existing.plan === "FREE") {
      await prisma.user.update({ where: { id: existing.id }, data: { universityId: uni.id, plan: existing.plan === "PREMIUM" ? "PREMIUM" : "UNIVERSITY" } });
    }
    return res.json(await respond(existing.id));
  }
  if (!(await bcrypt.compare(body.password, uni.accessCodeHash))) throw new HttpError(401, "Contraseña incorrecta. Usa la que te entregó tu universidad.");
  const u = await prisma.user.create({
    data: {
      email: body.email,
      name: nameFromEmail(body.email),
      passwordHash: uni.accessCodeHash,
      plan: "UNIVERSITY",
      universityId: uni.id,
      credits: uni.monthlyCredits,
      creditsMonth: limaMonth(),
    },
  });
  res.status(201).json(await respond(u.id));
});
