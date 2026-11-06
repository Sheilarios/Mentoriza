import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "./error.js";

export type Role = "STUDENT" | "MENTOR" | "UNI_ADMIN" | "ADMIN";

export interface AuthPayload {
  sub: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

export function signToken(p: AuthPayload): string {
  return jwt.sign(p, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return next(new HttpError(401, "Inicia sesión para continuar."));
  try {
    req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    next(new HttpError(401, "Tu sesión expiró. Vuelve a ingresar."));
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new HttpError(403, "No tienes permiso para esta sección."));
    next();
  };
