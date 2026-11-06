import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { mentorReply } from "../lib/ai.js";
import { MENTORING_DURATIONS, buildOffers, creditsFor, suggestedPrice, type Offer } from "../lib/rules.js";
import { creditStreak, loadUser } from "../lib/users.js";
import { requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

export const mentorsRouter = Router();
export const mentoringsRouter = Router();
export const mentorPanelRouter = Router();

const mentorPublic = { id: true, name: true, headline: true, courses: true, rating: true, userId: true } as const;

mentorsRouter.get("/", async (_req, res) => {
  res.json(await prisma.mentor.findMany({ where: { active: true }, orderBy: { rating: "desc" }, select: mentorPublic }));
});

/** Mentores ordenados por afinidad con el curso. */
async function pool(courseName: string | undefined) {
  const all = await prisma.mentor.findMany({ where: { active: true }, orderBy: { rating: "desc" } });
  const match = all.filter((m) => courseName && m.courses.some((c) => c.toLowerCase() === courseName.toLowerCase()));
  return match.concat(all.filter((m) => !match.includes(m)));
}

const include = { mentor: { select: mentorPublic }, course: { select: { id: true, name: true, emoji: true } }, messages: { orderBy: { createdAt: "asc" as const } } };

async function withOffers<T extends { offers: unknown }>(m: T) {
  const offers = (m.offers as Offer[]) || [];
  const ids = offers.map((o) => o.mentorId);
  const mentors = ids.length ? await prisma.mentor.findMany({ where: { id: { in: ids } }, select: mentorPublic }) : [];
  return { ...m, offers: offers.map((o) => ({ ...o, mentor: mentors.find((x) => x.id === o.mentorId) || null })) };
}

async function access(userId: string, id: string) {
  const m = await prisma.mentoring.findUnique({ where: { id }, include });
  if (!m) throw new HttpError(404, "No encontramos esa mentoría.");
  const isStudent = m.studentId === userId;
  const isMentor = !!m.mentor?.userId && m.mentor.userId === userId;
  if (!isStudent && !isMentor) throw new HttpError(404, "No encontramos esa mentoría.");
  return { m, isStudent, isMentor };
}

mentoringsRouter.get("/", async (req, res) => {
  const list = await prisma.mentoring.findMany({ where: { studentId: req.auth!.sub }, orderBy: { createdAt: "desc" }, take: 10, include: { mentor: { select: mentorPublic }, course: { select: { id: true, name: true, emoji: true } } } });
  res.json(list);
});

mentoringsRouter.post("/", async (req, res) => {
  const body = z
    .object({
      courseId: z.string().min(1),
      topic: z.string().trim().min(3, "Cuéntale al mentor en qué necesitas ayuda.").max(1000),
      urgency: z.enum(["Ahora", "En 1 hora", "Esta noche"]).default("Ahora"),
      minutes: z.number().int().refine((n) => (MENTORING_DURATIONS as readonly number[]).includes(n), "Duración no válida."),
      price: z.number().int().min(1).max(500).optional(),
    })
    .parse(req.body);
  const u = await loadUser(req.auth!.sub);
  if (u.plan === "FREE") throw new HttpError(403, "Los mentores se desbloquean con tu universidad aliada o con Premium.", "PLAN_REQUIRED");
  const course = await prisma.course.findFirst({ where: { id: body.courseId, userId: u.id } });
  if (!course) throw new HttpError(404, "No encontramos ese curso.");
  const P = await pool(course.name);
  if (!P.length) throw new HttpError(503, "No hay mentores disponibles en este momento.");

  if (u.plan === "UNIVERSITY") {
    const need = creditsFor(body.minutes);
    if (need > u.credits) throw new HttpError(400, "Tus créditos no alcanzan para esa duración.", "NO_CREDITS");
    const m = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: u.id }, data: { credits: { decrement: need } } });
      return tx.mentoring.create({
        data: { studentId: u.id, courseId: course.id, topic: body.topic, urgency: body.urgency, minutes: body.minutes, creditsUsed: need, status: "MATCHED", mentorId: P[0].id },
        include,
      });
    });
    return res.status(201).json(await withOffers(m));
  }
  const price = body.price ?? suggestedPrice(body.minutes);
  const offers = buildOffers(P.map((x) => x.id), body.minutes, price);
  const m = await prisma.mentoring.create({ data: { studentId: u.id, courseId: course.id, topic: body.topic, urgency: body.urgency, minutes: body.minutes, offerPrice: price, offers: offers as object[] }, include });
  res.status(201).json(await withOffers(m));
});

mentoringsRouter.get("/:id", async (req, res) => {
  const { m } = await access(req.auth!.sub, req.params.id);
  res.json(await withOffers(m));
});

mentoringsRouter.post("/:id/raise", async (req, res) => {
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (!isStudent || m.status !== "SEARCHING") throw new HttpError(400, "Esta búsqueda ya terminó.");
  const price = m.offerPrice + 2;
  const P = await pool(m.course?.name);
  const updated = await prisma.mentoring.update({ where: { id: m.id }, data: { offerPrice: price, offers: buildOffers(P.map((x) => x.id), m.minutes, price) as object[] }, include });
  res.json(await withOffers(updated));
});

mentoringsRouter.post("/:id/accept", async (req, res) => {
  const { index } = z.object({ index: z.number().int().min(0) }).parse(req.body);
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (!isStudent || m.status !== "SEARCHING") throw new HttpError(400, "Esta búsqueda ya terminó.");
  const o = ((m.offers as unknown as Offer[]) || [])[index];
  if (!o) throw new HttpError(400, "Esa oferta ya no está disponible.");
  const updated = await prisma.mentoring.update({ where: { id: m.id }, data: { mentorId: o.mentorId, finalPrice: o.price, status: "MATCHED" }, include });
  res.json(await withOffers(updated));
});

mentoringsRouter.post("/:id/enter", async (req, res) => {
  const { m } = await access(req.auth!.sub, req.params.id);
  if (m.status !== "MATCHED" && m.status !== "IN_ROOM") throw new HttpError(400, "La sala no está disponible.");
  let updated = m;
  if (m.status === "MATCHED") {
    updated = await prisma.mentoring.update({ where: { id: m.id }, data: { status: "IN_ROOM" }, include });
    if (!updated.messages.length && updated.mentor) {
      await prisma.message.create({ data: { mentoringId: m.id, from: "mentor", text: `¡Hola! Soy ${updated.mentor.name.split(" ")[0]}. Cuéntame qué intentaste con: “${m.topic.slice(0, 120)}”.` } });
      updated = (await prisma.mentoring.findUnique({ where: { id: m.id }, include }))!;
    }
  }
  res.json(await withOffers(updated));
});

mentoringsRouter.post("/:id/messages", async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(req.body);
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (m.status !== "IN_ROOM") throw new HttpError(400, "La sala está cerrada.");
  await prisma.message.create({ data: { mentoringId: m.id, from: isStudent ? "student" : "mentor", text } });
  // Mentores de demostración (sin cuenta) responden con IA; los mentores con cuenta responden desde su panel.
  if (isStudent && m.mentor && !m.mentor.userId) {
    const reply = await mentorReply(m.mentor.name, m.course?.name || "su curso", m.topic, text, m.messages.length);
    await prisma.message.create({ data: { mentoringId: m.id, from: "mentor", text: reply } });
  }
  const updated = (await prisma.mentoring.findUnique({ where: { id: m.id }, include }))!;
  res.json(await withOffers(updated));
});

mentoringsRouter.post("/:id/end", async (req, res) => {
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (m.status !== "IN_ROOM" && m.status !== "MATCHED") throw new HttpError(400, "Esta mentoría ya terminó.");
  const updated = await prisma.mentoring.update({ where: { id: m.id }, data: { status: "DONE", endedAt: new Date() }, include });
  if (m.finalPrice > 0) {
    await prisma.payment.create({ data: { userId: m.studentId, concept: `Mentoría ${m.minutes} min · ${m.mentor?.name || ""}`.trim(), amount: m.finalPrice, status: "DEMO" } });
  }
  const streak = isStudent ? await creditStreak(m.studentId) : null;
  res.json({ ...(await withOffers(updated)), streak });
});

mentoringsRouter.post("/:id/rate", async (req, res) => {
  const { stars } = z.object({ stars: z.number().int().min(1).max(5) }).parse(req.body);
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (!isStudent || m.status !== "DONE") throw new HttpError(400, "Solo puedes calificar mentorías terminadas.");
  await prisma.mentoring.update({ where: { id: m.id }, data: { rating: stars } });
  if (m.mentorId) {
    const agg = await prisma.mentoring.aggregate({ where: { mentorId: m.mentorId, rating: { not: null } }, _avg: { rating: true } });
    if (agg._avg.rating) await prisma.mentor.update({ where: { id: m.mentorId }, data: { rating: Math.round(agg._avg.rating * 10) / 10 } });
  }
  res.json({ ok: true });
});

mentoringsRouter.post("/:id/cancel", async (req, res) => {
  const { m, isStudent } = await access(req.auth!.sub, req.params.id);
  if (!isStudent || (m.status !== "SEARCHING" && m.status !== "MATCHED")) throw new HttpError(400, "Esta mentoría ya no se puede cancelar.");
  await prisma.$transaction(async (tx) => {
    if (m.creditsUsed > 0) await tx.user.update({ where: { id: m.studentId }, data: { credits: { increment: m.creditsUsed } } });
    await tx.mentoring.update({ where: { id: m.id }, data: { status: "CANCELLED", creditsUsed: 0 } });
  });
  res.json({ ok: true });
});

// ---------- Panel del mentor (rol MENTOR con cuenta vinculada) ----------
mentorPanelRouter.use(requireRole("MENTOR", "ADMIN"));

mentorPanelRouter.get("/sessions", async (req, res) => {
  const mentor = await prisma.mentor.findUnique({ where: { userId: req.auth!.sub } });
  if (!mentor) return res.json({ mentor: null, sessions: [] });
  const sessions = await prisma.mentoring.findMany({
    where: { mentorId: mentor.id, status: { in: ["MATCHED", "IN_ROOM", "DONE"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { student: { select: { name: true, university: { select: { shortName: true } } } }, course: { select: { name: true, emoji: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  res.json({ mentor, sessions });
});
