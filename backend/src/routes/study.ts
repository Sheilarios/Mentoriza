import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { checkAnswer, explainStep, solveStepByStep } from "../lib/ai.js";
import { ATTEMPTS_BEFORE_MENTOR, canAsk, remainingQuestions } from "../lib/rules.js";
import { creditStreak, loadUser, questionsToday } from "../lib/users.js";
import { HttpError } from "../middleware/error.js";

export const studyRouter = Router();

async function ownQuestion(userId: string, id: string) {
  const q = await prisma.question.findFirst({ where: { id, userId }, include: { course: true } });
  if (!q) throw new HttpError(404, "No encontramos esa consulta.");
  return q;
}

const view = (q: { attempts: number } & Record<string, unknown>) => ({ ...q, needMentor: q.attempts >= ATTEMPTS_BEFORE_MENTOR });

studyRouter.get("/quota", async (req, res) => {
  const u = await loadUser(req.auth!.sub);
  const used = await questionsToday(u.id);
  res.json({ plan: u.plan, used, left: remainingQuestions(u.plan, used) });
});

studyRouter.get("/history", async (req, res) => {
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const since = typeof req.query.since === "string" ? new Date(req.query.since) : undefined;
  const list = await prisma.question.findMany({
    where: { userId: req.auth!.sub, ...(courseId ? { courseId } : {}), ...(since && !isNaN(+since) ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(list.map(view));
});

studyRouter.post("/ask", async (req, res) => {
  const body = z.object({ courseId: z.string().min(1), question: z.string().trim().min(3, "Cuéntame tu duda con un poco más de detalle.").max(2000) }).parse(req.body);
  const u = await loadUser(req.auth!.sub);
  const used = await questionsToday(u.id);
  if (!canAsk(u.plan, used)) throw new HttpError(429, "Llegaste a tus 3 consultas de hoy.", "QUOTA_EXCEEDED");
  const course = await prisma.course.findFirst({ where: { id: body.courseId, userId: u.id } });
  if (!course) throw new HttpError(404, "No encontramos ese curso.");
  const a = await solveStepByStep(course, body.question);
  const q = await prisma.question.create({
    data: {
      userId: u.id,
      courseId: course.id,
      text: body.question,
      topic: a.topic,
      steps: a.steps,
      done: a.steps.map(() => false),
      rubricHint: a.rubricHint,
      checkQ: a.checkQ,
      checkA: a.checkA,
      source: a.source,
    },
  });
  res.status(201).json({ question: view(q), left: remainingQuestions(u.plan, used + 1) });
});

studyRouter.post("/questions/:id/steps/:j/understood", async (req, res) => {
  const q = await ownQuestion(req.auth!.sub, req.params.id);
  const j = Number(req.params.j);
  if (!Number.isInteger(j) || j < 0 || j >= q.steps.length) throw new HttpError(400, "Paso inválido.");
  const done = [...q.done];
  done[j] = true;
  const allDone = done.length === q.steps.length && done.every(Boolean);
  let streak: number | null = null;
  let covered: string | null = null;
  if (allDone && !q.solved) {
    const L = q.course.syllabus;
    const tp = q.topic.toLowerCase();
    const t = L.find((l) => l.toLowerCase() === tp) || L.find((l) => l.toLowerCase().includes(tp) || tp.includes(l.toLowerCase()));
    if (t && !q.course.covered.includes(t)) {
      await prisma.course.update({ where: { id: q.courseId }, data: { covered: { push: t } } });
      covered = t;
    }
    streak = await creditStreak(q.userId);
  }
  const updated = await prisma.question.update({ where: { id: q.id }, data: { done, solved: q.solved || allDone } });
  res.json({ question: view(updated), completed: allDone, covered, streak });
});

studyRouter.post("/questions/:id/steps/:j/explain", async (req, res) => {
  const q = await ownQuestion(req.auth!.sub, req.params.id);
  const j = Number(req.params.j);
  if (!Number.isInteger(j) || j < 0 || j >= q.steps.length) throw new HttpError(400, "Paso inválido.");
  const explanation = await explainStep(q.course.name, q.text, q.steps[j]);
  const updated = await prisma.question.update({ where: { id: q.id }, data: { attempts: { increment: 1 } } });
  res.json({ explanation, question: view(updated) });
});

studyRouter.post("/questions/:id/check", async (req, res) => {
  const { answer } = z.object({ answer: z.string().trim().min(1, "Escribe primero tu respuesta.").max(2000) }).parse(req.body);
  const q = await ownQuestion(req.auth!.sub, req.params.id);
  const r = await checkAnswer(q.checkQ, q.checkA, answer);
  const streak = r.ok ? await creditStreak(q.userId) : null;
  res.json({ ...r, streak });
});

studyRouter.get("/questions/:id/guide", async (req, res) => {
  const q = await ownQuestion(req.auth!.sub, req.params.id);
  res.json({ answer: q.checkA });
});
