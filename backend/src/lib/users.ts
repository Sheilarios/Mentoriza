import type { University, User } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/error.js";
import { currentCredits, limaStartOfDay, nextStreak, remainingQuestions } from "./rules.js";

export type FullUser = User & { university: University | null };

/** Carga el usuario y recarga sus créditos universitarios si cambió el mes. */
export async function loadUser(id: string): Promise<FullUser> {
  const u = await prisma.user.findUnique({ where: { id }, include: { university: true } });
  if (!u) throw new HttpError(401, "Tu cuenta ya no existe. Vuelve a ingresar.");
  if (u.plan === "UNIVERSITY" && u.university) {
    const c = currentCredits(u.credits, u.creditsMonth, u.university.monthlyCredits);
    if (c.reset) {
      return prisma.user.update({ where: { id }, data: { credits: c.credits, creditsMonth: c.month }, include: { university: true } });
    }
  }
  return u;
}

export async function questionsToday(userId: string): Promise<number> {
  return prisma.question.count({ where: { userId, createdAt: { gte: limaStartOfDay() } } });
}

export async function publicUser(u: FullUser) {
  const used = await questionsToday(u.id);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: u.plan,
    university: u.university ? { id: u.university.id, name: u.university.name, shortName: u.university.shortName, monthlyCredits: u.university.monthlyCredits } : null,
    career: u.career,
    cycle: u.cycle,
    onboarded: u.onboarded,
    darkMode: u.darkMode,
    credits: u.credits,
    streak: u.streakCount,
    streakLast: u.streakLast,
    premiumSince: u.premiumSince,
    premiumRenewAt: u.premiumRenewAt,
    questionsToday: used,
    questionsLeft: remainingQuestions(u.plan, used),
  };
}

/** Suma un día a la racha si es la primera actividad del día. Devuelve la racha si cambió. */
export async function creditStreak(userId: string): Promise<number | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { streakCount: true, streakLast: true } });
  if (!u) return null;
  const s = nextStreak(u.streakCount, u.streakLast);
  if (!s.changed) return null;
  await prisma.user.update({ where: { id: userId }, data: { streakCount: s.count, streakLast: s.last } });
  return s.count;
}
