import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db.js";
import { extractDocument } from "../lib/ai.js";
import { toLines } from "../lib/rules.js";
import { HttpError } from "../middleware/error.js";

export const coursesRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

export const EXAMPLE_RUBRIC = ["Planteamiento correcto del problema (30%)", "Procedimiento paso a paso (50%)", "Interpretación del resultado (20%)"];

async function own(userId: string, id: string) {
  const c = await prisma.course.findFirst({ where: { id, userId } });
  if (!c) throw new HttpError(404, "No encontramos ese curso.");
  return c;
}

const listOrText = z.union([z.array(z.string()), z.string()]).transform((v) => (Array.isArray(v) ? v.map((x) => x.trim()).filter(Boolean) : toLines(v)));

coursesRouter.get("/", async (req, res) => {
  res.json(await prisma.course.findMany({ where: { userId: req.auth!.sub }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }));
});

coursesRouter.post("/", async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1, "Escribe el nombre del curso.").max(80), emoji: z.string().max(8).optional() }).parse(req.body);
  const count = await prisma.course.count({ where: { userId: req.auth!.sub } });
  if (count >= 12) throw new HttpError(400, "Puedes tener hasta 12 cursos.");
  res.status(201).json(await prisma.course.create({ data: { userId: req.auth!.sub, name: body.name, emoji: body.emoji || "📘" } }));
});

coursesRouter.patch("/:id", async (req, res) => {
  const c = await own(req.auth!.sub, String(req.params.id));
  const body = z.object({ name: z.string().trim().min(1).max(80).optional(), emoji: z.string().max(8).optional(), syllabus: listOrText.optional(), rubric: listOrText.optional() }).parse(req.body);
  const data: Record<string, unknown> = { ...body };
  if (body.syllabus) data.covered = c.covered.filter((t) => body.syllabus!.includes(t));
  res.json(await prisma.course.update({ where: { id: c.id }, data }));
});

coursesRouter.delete("/:id", async (req, res) => {
  const c = await own(req.auth!.sub, String(req.params.id));
  await prisma.course.delete({ where: { id: c.id } });
  res.json({ ok: true });
});

coursesRouter.post("/:id/example-rubric", async (req, res) => {
  const c = await own(req.auth!.sub, String(req.params.id));
  res.json(await prisma.course.update({ where: { id: c.id }, data: { rubric: EXAMPLE_RUBRIC } }));
});

/** Lee una rúbrica o sílabo: texto pegado, archivo .txt/.md, PDF o imagen (imagen requiere IA). */
coursesRouter.post("/:id/document", upload.single("file"), async (req, res) => {
  const c = await own(req.auth!.sub, String(req.params.id));
  const f = req.file;
  let text = typeof req.body?.text === "string" ? req.body.text : "";
  let imageDataUrl: string | undefined;

  if (f) {
    const name = f.originalname.toLowerCase();
    if (f.mimetype === "application/pdf" || name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(f.buffer) });
      try {
        text = (await parser.getText()).text || "";
      } finally {
        await parser.destroy();
      }
    } else if (f.mimetype.startsWith("image/")) {
      imageDataUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;
    } else {
      text = f.buffer.toString("utf8");
    }
  }
  if (!text.trim() && !imageDataUrl) throw new HttpError(400, "No encontramos texto. Pega los criterios o sube otro archivo.");

  const r = await extractDocument({ text: text.trim() || undefined, imageDataUrl });
  if (!r.rubric.length && !r.syllabus.length) {
    throw new HttpError(422, imageDataUrl ? "Para leer fotos se necesita la IA activada. Pega el texto de la rúbrica." : "No pude leer criterios ahí. Prueba pegando el texto.");
  }
  const data: Record<string, unknown> = {};
  if (r.rubric.length) data.rubric = r.rubric;
  if (r.syllabus.length) {
    data.syllabus = r.syllabus;
    data.covered = [];
  }
  const updated = await prisma.course.update({ where: { id: c.id }, data });
  res.json({ course: updated, found: { rubric: r.rubric.length, syllabus: r.syllabus.length } });
});
