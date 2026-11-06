import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message || "Datos inválidos", issues: err.issues });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === "entity.too.large" || e?.status === 413) return res.status(413).json({ error: "El archivo es demasiado grande." });
  console.error(err);
  res.status(500).json({ error: "Ocurrió un error inesperado. Intenta de nuevo." });
}
