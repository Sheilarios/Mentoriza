import { Router } from "express";
import { prisma } from "../db.js";
import { PREMIUM_PRICE, FREE_DAILY_QUESTIONS, MINUTES_PER_CREDIT } from "../lib/rules.js";
import { loadUser, publicUser } from "../lib/users.js";
import { HttpError } from "../middleware/error.js";
import { config } from "../config.js";
import { getBusiness } from "./validation.js";

export const plansRouter = Router();
export const plansPublicRouter = Router();

plansPublicRouter.get("/", async (_req, res) => {
  const business = await getBusiness();
  res.json({
    paymentsMode: config.paymentsMode,
    plans: [
      { id: "FREE", name: "Gratis", price: 0, features: [`${FREE_DAILY_QUESTIONS} consultas IA al día`, "Temporizador de enfoque", "Sin mentor humano"] },
      { id: "PREMIUM", name: "Premium", price: PREMIUM_PRICE, features: ["IA sin límite con tu rúbrica", "Mentores pares con tu precio", "Lectura de rúbricas en PDF y foto"] },
      { id: "UNIVERSITY", name: "Universidad aliada", price: null, features: ["Acceso gratis para alumnos", `Créditos de mentoría al mes (1 crédito = ${MINUTES_PER_CREDIT} min)`, "Panel de resultados"] },
    ],
    economics: business.result,
  });
});

plansRouter.post("/premium", async (req, res) => {
  const u = await loadUser(req.auth!.sub);
  if (u.plan === "PREMIUM") throw new HttpError(400, "Ya tienes Premium activo.");
  if (config.paymentsMode !== "demo") throw new HttpError(501, "La pasarela de pago aún no está configurada.");
  const now = new Date();
  const renew = new Date(now);
  renew.setMonth(renew.getMonth() + 1);
  await prisma.$transaction([
    prisma.user.update({ where: { id: u.id }, data: { plan: "PREMIUM", premiumSince: u.premiumSince || now, premiumRenewAt: renew } }),
    prisma.payment.create({ data: { userId: u.id, concept: "Plan Premium (mensual)", amount: PREMIUM_PRICE, status: "DEMO" } }),
  ]);
  res.json(await publicUser(await loadUser(u.id)));
});

plansRouter.post("/cancel", async (req, res) => {
  const u = await loadUser(req.auth!.sub);
  if (u.plan !== "PREMIUM") throw new HttpError(400, "No tienes una suscripción Premium activa.");
  await prisma.user.update({ where: { id: u.id }, data: { plan: u.universityId ? "UNIVERSITY" : "FREE", premiumSince: null, premiumRenewAt: null } });
  res.json(await publicUser(await loadUser(u.id)));
});

plansRouter.get("/payments", async (req, res) => {
  const list = await prisma.payment.findMany({ where: { userId: req.auth!.sub }, orderBy: { createdAt: "desc" }, take: 24 });
  res.json(list.map((p) => ({ ...p, amount: Number(p.amount) })));
});
