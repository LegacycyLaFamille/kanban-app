import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      res.status(401).json({ error: "Authentification requise" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("FATAL: JWT_SECRET manquant.");

    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};
