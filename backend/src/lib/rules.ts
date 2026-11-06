/**
 * Reglas de negocio de Mentoriza (funciones puras, cubiertas por pruebas).
 * Los valores provienen del cuaderno de entregables Científica Sprint 2026 (hojas P4 y P5).
 */

/** Consultas de IA por día en el plan gratuito. */
export const FREE_DAILY_QUESTIONS = 3;
/** Precio de la suscripción Premium mensual en soles. */
export const PREMIUM_PRICE = 15;
/** Minutos de mentoría que cubre un crédito universitario. */
export const MINUTES_PER_CREDIT = 15;
/** Tarifa de referencia de un mentor (S/ por hora) para sugerir precio. */
export const MENTOR_HOURLY_REFERENCE = 40;
/** Intentos fallidos ("No entendí este paso") antes de sugerir un mentor humano. */
export const ATTEMPTS_BEFORE_MENTOR = 3;
/** Duraciones de mentoría permitidas (minutos). */
export const MENTORING_DURATIONS = [15, 30, 60] as const;

const LIMA_TZ = "America/Lima";

/** Fecha local de Lima en formato YYYY-MM-DD. */
export function limaDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Mes local de Lima en formato YYYY-MM. */
export function limaMonth(d: Date = new Date()): string {
  return limaDate(d).slice(0, 7);
}

/** Inicio del día actual en Lima expresado como Date UTC (Lima es UTC-5 sin horario de verano). */
export function limaStartOfDay(d: Date = new Date()): Date {
  return new Date(`${limaDate(d)}T00:00:00-05:00`);
}

export type PlanKind = "FREE" | "PREMIUM" | "UNIVERSITY";

/** Consultas de IA restantes hoy. `null` significa ilimitado. */
export function remainingQuestions(plan: PlanKind, usedToday: number): number | null {
  if (plan !== "FREE") return null;
  return Math.max(0, FREE_DAILY_QUESTIONS - usedToday);
}

export function canAsk(plan: PlanKind, usedToday: number): boolean {
  const r = remainingQuestions(plan, usedToday);
  return r === null || r > 0;
}

/** Créditos universitarios necesarios para una mentoría de `minutes` minutos. */
export function creditsFor(minutes: number): number {
  return Math.ceil(minutes / MINUTES_PER_CREDIT);
}

/** Precio sugerido (S/) para una mentoría de `minutes` minutos. */
export function suggestedPrice(minutes: number): number {
  return Math.round((MENTOR_HOURLY_REFERENCE * minutes) / 60);
}

/** Créditos vigentes: si cambió el mes, se recargan con el cupo mensual de la universidad. */
export function currentCredits(stored: number, storedMonth: string | null, monthlyCredits: number, now: Date = new Date()): { credits: number; month: string; reset: boolean } {
  const month = limaMonth(now);
  if (storedMonth !== month) return { credits: monthlyCredits, month, reset: true };
  return { credits: stored, month, reset: false };
}

/** Racha de estudio: suma un día si el último registro fue ayer; reinicia si fue antes. */
export function nextStreak(count: number, last: string | null, now: Date = new Date()): { count: number; last: string; changed: boolean } {
  const today = limaDate(now);
  if (last === today) return { count, last, changed: false };
  const yesterday = limaDate(new Date(now.getTime() - 86_400_000));
  return { count: last === yesterday ? count + 1 : 1, last: today, changed: true };
}

export interface CostModel {
  price: number;
  unitsPerMonth: number;
  fixedCosts: number[];
  variableCosts: number[];
}

export interface CostResult {
  totalFixed: number;
  variablePerUnit: number;
  fixedPerUnit: number;
  unitCost: number;
  unitMargin: number;
  marginPct: number;
  breakEvenUnits: number;
  monthlyRevenue: number;
  monthlyResult: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Costos, margen y punto de equilibrio (hoja P5 · Costos y precio). */
export function computeCosts(m: CostModel): CostResult {
  const totalFixed = r2(m.fixedCosts.reduce((a, b) => a + b, 0));
  const variablePerUnit = r2(m.variableCosts.reduce((a, b) => a + b, 0));
  const fixedPerUnit = m.unitsPerMonth > 0 ? r2(totalFixed / m.unitsPerMonth) : 0;
  const unitCost = r2(variablePerUnit + fixedPerUnit);
  const unitMargin = r2(m.price - unitCost);
  const marginPct = m.price > 0 ? Math.round((unitMargin / m.price) * 1000) / 1000 : 0;
  const contribution = m.price - variablePerUnit;
  const breakEvenUnits = contribution > 0 ? Math.ceil(totalFixed / contribution) : 0;
  const monthlyRevenue = r2(m.price * m.unitsPerMonth);
  const monthlyResult = r2(monthlyRevenue - variablePerUnit * m.unitsPerMonth - totalFixed);
  return { totalFixed, variablePerUnit, fixedPerUnit, unitCost, unitMargin, marginPct, breakEvenUnits, monthlyRevenue, monthlyResult };
}

export interface Offer {
  mentorId: string;
  price: number;
  eta: number;
}

/** Ofertas de mentores para un estudiante Premium que propone `price` por `minutes` minutos. */
export function buildOffers(mentorIds: string[], minutes: number, price: number): Offer[] {
  const s = suggestedPrice(minutes);
  const prices = [price >= Math.round(s * 0.85) ? price : Math.round(s * 0.9), s + 1, Math.round(s * 1.15) + 1];
  if (!mentorIds.length) return [];
  return prices.map((p, i) => ({ mentorId: mentorIds[i % mentorIds.length], price: p, eta: 2 + i * 2 }));
}

/** Divide un texto en líneas limpias (temas o criterios). */
export function toLines(t: string | null | undefined): string[] {
  return (t || "").split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
}
