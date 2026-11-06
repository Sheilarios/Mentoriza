import { Router } from "express";
import { prisma } from "../db.js";
import { computeCosts } from "../lib/rules.js";

export const validationRouter = Router();

export async function getBusiness() {
  const [items, settings] = await Promise.all([prisma.costItem.findMany({ orderBy: { order: "asc" } }), prisma.setting.findMany()]);
  const s = Object.fromEntries(settings.map((x) => [x.key, x.value])) as Record<string, unknown>;
  const price = Number(s.price ?? 15);
  const unitsPerMonth = Number(s.unitsPerMonth ?? 100);
  const fixed = items.filter((i) => i.kind === "fixed").map((i) => ({ label: i.label, amount: Number(i.amount), note: i.note }));
  const variable = items.filter((i) => i.kind === "variable").map((i) => ({ label: i.label, amount: Number(i.amount), note: i.note }));
  const result = computeCosts({ price, unitsPerMonth, fixedCosts: fixed.map((f) => f.amount), variableCosts: variable.map((v) => v.amount) });
  return { unit: String(s.unit ?? "Una suscripción Premium mensual por estudiante"), price, unitsPerMonth, fixed, variable, result, pricing: s.pricing ?? [] };
}

validationRouter.get("/", async (_req, res) => {
  const [interviews, hypotheses, market, tests, changes, settings] = await Promise.all([
    prisma.interview.findMany({ orderBy: { number: "asc" } }),
    prisma.hypothesis.findMany({ orderBy: { number: "asc" } }),
    prisma.marketLevel.findMany({ orderBy: { order: "asc" } }),
    prisma.prototypeTest.findMany({ orderBy: { number: "asc" } }),
    prisma.prototypeChange.findMany({ orderBy: { number: "asc" } }),
    prisma.setting.findMany({ where: { key: { in: ["team", "versions", "canvas", "protection"] } } }),
  ]);
  const s = Object.fromEntries(settings.map((x) => [x.key, x.value]));
  const completed = tests.filter((t) => t.completed).length;
  const avg = tests.length ? Math.round((tests.reduce((a, t) => a + t.minutes, 0) / tests.length) * 10) / 10 : 0;
  res.json({
    interviews,
    summary: {
      interviews: interviews.length,
      confirms: interviews.filter((i) => i.confirms).length,
      mentionedPay: interviews.filter((i) => i.mentionedPay).length,
      hypothesesFailed: hypotheses.filter((h) => h.result === "Se cayó").length,
      prototypeCompleted: `${completed} de ${tests.length}`,
      prototypeAvgMinutes: avg,
    },
    hypotheses,
    market,
    tests,
    changes,
    team: s.team ?? null,
    versions: s.versions ?? [],
    canvas: s.canvas ?? null,
    protection: s.protection ?? [],
  });
});

validationRouter.get("/business", async (_req, res) => {
  res.json(await getBusiness());
});
