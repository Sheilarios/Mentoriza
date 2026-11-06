import { describe, expect, it } from "vitest";
import { buildOffers, canAsk, computeCosts, creditsFor, currentCredits, limaDate, nextStreak, remainingQuestions, suggestedPrice, toLines } from "./rules.js";

describe("plan gratuito", () => {
  it("permite 3 consultas de IA al día", () => {
    expect(remainingQuestions("FREE", 0)).toBe(3);
    expect(canAsk("FREE", 2)).toBe(true);
    expect(canAsk("FREE", 3)).toBe(false);
  });
  it("Premium y Universidad no tienen límite", () => {
    expect(remainingQuestions("PREMIUM", 50)).toBeNull();
    expect(canAsk("UNIVERSITY", 99)).toBe(true);
  });
});

describe("mentorías", () => {
  it("1 crédito universitario cubre 15 minutos", () => {
    expect(creditsFor(15)).toBe(1);
    expect(creditsFor(30)).toBe(2);
    expect(creditsFor(60)).toBe(4);
  });
  it("sugiere el precio con la referencia de S/ 40 por hora", () => {
    expect(suggestedPrice(60)).toBe(40);
    expect(suggestedPrice(30)).toBe(20);
    expect(suggestedPrice(15)).toBe(10);
  });
  it("genera 3 ofertas y respeta un precio razonable del estudiante", () => {
    const o = buildOffers(["a", "b"], 30, 20);
    expect(o).toHaveLength(3);
    expect(o[0].price).toBe(20);
    expect(o[2].mentorId).toBe("a");
  });
  it("recarga los créditos al cambiar de mes", () => {
    const now = new Date("2026-11-06T17:00:00Z");
    expect(currentCredits(1, "2026-10", 4, now)).toEqual({ credits: 4, month: "2026-11", reset: true });
    expect(currentCredits(1, "2026-11", 4, now).credits).toBe(1);
  });
});

describe("racha de estudio", () => {
  it("suma si estudiaste ayer y reinicia si no", () => {
    const now = new Date("2026-11-06T17:00:00Z");
    expect(nextStreak(4, "2026-11-05", now)).toMatchObject({ count: 5, changed: true });
    expect(nextStreak(4, "2026-11-01", now)).toMatchObject({ count: 1, changed: true });
    expect(nextStreak(4, "2026-11-06", now)).toMatchObject({ count: 4, changed: false });
  });
  it("usa la hora de Lima", () => {
    expect(limaDate(new Date("2026-11-07T03:00:00Z"))).toBe("2026-11-06");
  });
});

describe("costos y punto de equilibrio (hoja P5)", () => {
  const r = computeCosts({ price: 15, unitsPerMonth: 100, fixedCosts: [0, 100, 80, 0, 120, 100, 150], variableCosts: [0.9, 2, 0.5] });
  it("costos fijos S/ 550 y variable S/ 3.40", () => {
    expect(r.totalFixed).toBe(550);
    expect(r.variablePerUnit).toBe(3.4);
  });
  it("costo unitario S/ 8.90, margen S/ 6.10 (40.7 %)", () => {
    expect(r.unitCost).toBe(8.9);
    expect(r.unitMargin).toBe(6.1);
    expect(r.marginPct).toBe(0.407);
  });
  it("punto de equilibrio de 48 suscripciones al mes", () => {
    expect(r.breakEvenUnits).toBe(48);
  });
});

describe("lectura de rúbricas", () => {
  it("limpia viñetas sin borrar números del contenido", () => {
    expect(toLines("- Criterio A (30%)\n2. Criterio B\n\n3D y vectores")).toEqual(["Criterio A (30%)", "Criterio B", "3D y vectores"]);
  });
});
