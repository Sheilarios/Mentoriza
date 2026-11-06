/**
 * Pruebas de integración de la API. Requieren una base de datos PostgreSQL con migraciones y seed:
 *   npm run db:migrate && npm run db:seed && npm test
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { prisma } from "./db.js";

const app = createApp();
const stamp = Date.now();
const freeEmail = `prueba.${stamp}@gmail.com`;
const uniEmail = `prueba.${stamp}@cientifica.edu.pe`;

let ucsurId = "";

beforeAll(async () => {
  ucsurId = (await prisma.university.findUniqueOrThrow({ where: { domain: "cientifica.edu.pe" } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [freeEmail, uniEmail] } } });
  await prisma.$disconnect();
});

describe("API Mentoriza", () => {
  it("responde el estado de salud", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("el plan gratuito permite 3 consultas al día y bloquea la cuarta", async () => {
    const reg = await request(app).post("/api/auth/register").send({ name: "Prueba", email: freeEmail, password: "secreto1" });
    expect(reg.status).toBe(201);
    const auth = { Authorization: `Bearer ${reg.body.token}` };
    await request(app).post("/api/me/onboarding").set(auth).send({ courses: [] });
    const courses = await request(app).get("/api/courses").set(auth);
    const courseId = courses.body[0].id;
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post("/api/study/ask").set(auth).send({ courseId, question: `¿Cómo integro por partes? intento ${i}` });
      expect(r.status).toBe(201);
    }
    const blocked = await request(app).post("/api/study/ask").set(auth).send({ courseId, question: "Una cuarta duda" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("QUOTA_EXCEEDED");
  });

  it("el plan gratuito no puede pedir mentores", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: freeEmail, password: "secreto1" });
    const auth = { Authorization: `Bearer ${login.body.token}` };
    const courses = await request(app).get("/api/courses").set(auth);
    const r = await request(app).post("/api/mentorings").set(auth).send({ courseId: courses.body[0].id, topic: "Integrales", minutes: 30 });
    expect(r.status).toBe(403);
  });

  it("el convenio exige el dominio de la universidad", async () => {
    const r = await request(app).post("/api/auth/institutional").send({ universityId: ucsurId, email: freeEmail, password: "mentoriza2026" });
    expect(r.status).toBe(400);
  });

  it("una mentoría universitaria de 30 min descuenta 2 de los 4 créditos", async () => {
    const r = await request(app).post("/api/auth/institutional").send({ universityId: ucsurId, email: uniEmail, password: "mentoriza2026" });
    expect(r.status).toBe(201);
    expect(r.body.user.plan).toBe("UNIVERSITY");
    expect(r.body.user.credits).toBe(4);
    const auth = { Authorization: `Bearer ${r.body.token}` };
    const c = await request(app).post("/api/courses").set(auth).send({ name: "Cálculo II" });
    const m = await request(app).post("/api/mentorings").set(auth).send({ courseId: c.body.id, topic: "Integración por partes", minutes: 30 });
    expect(m.status).toBe(201);
    expect(m.body.status).toBe("MATCHED");
    const me = await request(app).get("/api/me").set(auth);
    expect(me.body.credits).toBe(2);
  });

  it("lista las 4 cuentas de prueba sin incluir la de administración", async () => {
    const r = await request(app).get("/api/auth/demo-accounts");
    expect(r.status).toBe(200);
    expect(r.body.enabled).toBe(true);
    const emails = r.body.accounts.map((a: { email: string }) => a.email);
    expect(emails).toEqual(["ana@cientifica.edu.pe", "luis.prueba@gmail.com", "valeria@mentoriza.pe", "coordinacion@cientifica.edu.pe"]);
    expect(emails).not.toContain("admin@mentoriza.pe");
  });

  it("cada cuenta de prueba entra con un clic y con la contraseña mostrada", async () => {
    const list = await request(app).get("/api/auth/demo-accounts");
    const roles: Record<string, string> = { "estudiante-convenio": "STUDENT", "estudiante-gratis": "STUDENT", mentor: "MENTOR", universidad: "UNI_ADMIN" };
    for (const a of list.body.accounts) {
      const click = await request(app).post("/api/auth/demo").send({ key: a.key });
      expect(click.status).toBe(200);
      expect(click.body.user.role).toBe(roles[a.key]);
      const manual = await request(app).post("/api/auth/login").send({ email: a.email, password: list.body.password });
      expect(manual.status).toBe(200);
    }
    const free = await request(app).post("/api/auth/demo").send({ key: "estudiante-gratis" });
    expect(free.body.user.plan).toBe("FREE");
  });

  it("no existe ingreso con un clic para administración ni para correos inventados", async () => {
    const r = await request(app).post("/api/auth/demo").send({ key: "admin" });
    expect(r.status).toBe(404);
  });

  it("una cuenta de prueba no puede cambiar su contraseña", async () => {
    const login = await request(app).post("/api/auth/demo").send({ key: "mentor" });
    const r = await request(app).patch("/api/me/password").set({ Authorization: `Bearer ${login.body.token}` }).send({ current: "mentoriza2026", next: "otraclave1" });
    expect(r.status).toBe(403);
  });

  it("calcula el punto de equilibrio con los datos del cuaderno", async () => {
    const r = await request(app).get("/api/validation/business");
    expect(r.body.result.breakEvenUnits).toBe(48);
    expect(r.body.result.unitCost).toBe(8.9);
  });
});
