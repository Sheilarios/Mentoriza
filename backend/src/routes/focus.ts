import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { creditStreak } from "../lib/users.js";
import { limaStartOfDay } from "../lib/rules.js";

export const focusRouter = Router();

focusRouter.post("/", async (req, res) => {
  const { minutes, startedAt } = z.object({ minutes: z.number().int().min(1).max(180), startedAt: z.string().optional() }).parse(req.body);
  const userId = req.auth!.sub;
  await prisma.focusSession.create({ data: { userId, minutes } });
  const streak = await creditStreak(userId);
  const since = startedAt && !isNaN(+new Date(startedAt)) ? new Date(startedAt) : new Date(Date.now() - minutes * 60_000);
  const topics = await prisma.question.findMany({ where: { userId, createdAt: { gte: since } }, select: { topic: true } });
  res.status(201).json({ streak, questions: topics.length, topics: [...new Set(topics.map((t) => t.topic))] });
});

focusRouter.get("/summary", async (req, res) => {
  const userId = req.auth!.sub;
  const weekAgo = new Date(limaStartOfDay().getTime() - 6 * 86_400_000);
  const s = await prisma.focusSession.aggregate({ where: { userId, createdAt: { gte: weekAgo } }, _sum: { minutes: true }, _count: true });
  res.json({ minutesWeek: s._sum.minutes || 0, sessionsWeek: s._count });
});
