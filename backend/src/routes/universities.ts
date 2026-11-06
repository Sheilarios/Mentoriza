import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { loadUser } from "../lib/users.js";

export const leadsRouter = Router();
export const uniAdminRouter = Router();
export const adminRouter = Router();

leadsRouter.post("/", async (req, res) => {
  const body = z
    .object({
      university: z.string().trim().min(2, "Escribe el nombre de la universidad.").max(160),
      email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
      position: z.string().trim().min(2, "Escribe el cargo del contacto.").max(120),
    })
    .parse(req.body);
  await prisma.lead.create({ data: body });
  res.status(201).json({ ok: true });
});

async function dashboard(universityId: string) {
  const uni = await prisma.university.findUnique({ where: { id: universityId } });
  if (!uni) throw new HttpError(404, "Universidad no encontrada.");
  const students = await prisma.user.findMany({ where: { universityId, role: "STUDENT" }, select: { id: true } });
  const ids = students.map((s) => s.id);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [questions, solved, credits, mentorings, activeRows, byCourse] = await Promise.all([
    prisma.question.count({ where: { userId: { in: ids } } }),
    prisma.question.count({ where: { userId: { in: ids }, solved: true } }),
    prisma.mentoring.aggregate({ where: { studentId: { in: ids }, status: { not: "CANCELLED" } }, _sum: { creditsUsed: true } }),
    prisma.mentoring.count({ where: { studentId: { in: ids }, status: "DONE" } }),
    prisma.question.findMany({ where: { userId: { in: ids }, createdAt: { gte: since30 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.question.findMany({ where: { userId: { in: ids } }, select: { course: { select: { name: true } } } }),
  ]);
  const counts = new Map<string, number>();
  for (const q of byCourse) counts.set(q.course.name, (counts.get(q.course.name) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  return {
    university: { id: uni.id, name: uni.name, shortName: uni.shortName, domain: uni.domain, monthlyCredits: uni.monthlyCredits },
    students: ids.length,
    active30d: activeRows.length,
    questions,
    solvedRate: questions ? Math.round((solved / questions) * 100) : 0,
    creditsUsed: credits._sum.creditsUsed || 0,
    mentoringsDone: mentorings,
    topCourses: top,
  };
}

uniAdminRouter.use(requireRole("UNI_ADMIN", "ADMIN"));
uniAdminRouter.get("/dashboard", async (req, res) => {
  const u = await loadUser(req.auth!.sub);
  const id = u.role === "ADMIN" && typeof req.query.universityId === "string" ? req.query.universityId : u.universityId;
  if (!id) throw new HttpError(400, "Tu cuenta no está vinculada a una universidad.");
  res.json(await dashboard(id));
});

// ---------- Administración de la plataforma ----------
adminRouter.use(requireRole("ADMIN"));

adminRouter.get("/stats", async (_req, res) => {
  const [byPlan, questions, mentorings, leads, payments] = await Promise.all([
    prisma.user.groupBy({ by: ["plan"], _count: true, where: { role: "STUDENT" } }),
    prisma.question.count(),
    prisma.mentoring.count({ where: { status: "DONE" } }),
    prisma.lead.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);
  res.json({ byPlan: Object.fromEntries(byPlan.map((p) => [p.plan, p._count])), questions, mentorings, leads, paymentsTotal: Number(payments._sum.amount || 0) });
});

adminRouter.get("/leads", async (_req, res) => {
  res.json(await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 }));
});

adminRouter.get("/universities", async (_req, res) => {
  const list = await prisma.university.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } });
  res.json(list.map(({ accessCodeHash: _h, ...u }) => u));
});

const uniBody = z.object({
  name: z.string().trim().min(3).max(160),
  shortName: z.string().trim().min(2).max(12),
  domain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Dominio inválido (ej. utp.edu.pe)."),
  accessCode: z.string().min(6, "El código de acceso debe tener al menos 6 caracteres."),
  monthlyCredits: z.number().int().min(0).max(100).default(4),
});

adminRouter.post("/universities", async (req, res) => {
  const b = uniBody.parse(req.body);
  if (await prisma.university.findUnique({ where: { domain: b.domain } })) throw new HttpError(409, "Ya existe una universidad con ese dominio.");
  const u = await prisma.university.create({ data: { name: b.name, shortName: b.shortName, domain: b.domain, monthlyCredits: b.monthlyCredits, accessCodeHash: await bcrypt.hash(b.accessCode, 10) } });
  const { accessCodeHash: _h, ...rest } = u;
  res.status(201).json(rest);
});

adminRouter.patch("/universities/:id", async (req, res) => {
  const b = uniBody.partial().extend({ active: z.boolean().optional() }).parse(req.body);
  const { accessCode, ...data } = b;
  const u = await prisma.university.update({ where: { id: req.params.id }, data: { ...data, ...(accessCode ? { accessCodeHash: await bcrypt.hash(accessCode, 10) } : {}) } });
  const { accessCodeHash: _h, ...rest } = u;
  res.json(rest);
});

adminRouter.post("/mentors", async (req, res) => {
  const b = z.object({ name: z.string().trim().min(2).max(80), headline: z.string().trim().min(2).max(160), courses: z.array(z.string().trim()).default([]) }).parse(req.body);
  res.status(201).json(await prisma.mentor.create({ data: b }));
});
