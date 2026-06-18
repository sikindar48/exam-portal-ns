import { Request, Response, NextFunction } from "express";
import { getUser } from "../auth/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Bypass Firebase validation for guest test lookup
  if (req.path === "/api/tests" && req.query.share_code) {
    return next();
  }

  const user = await getUser(req);
  if (user) {
    req.user = user;
  }
  next();
}
