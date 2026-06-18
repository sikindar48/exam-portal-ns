import { Request, Response, NextFunction } from "express";
import { hasRole } from "../services/roles.js";

/**
 * Middleware that permits request execution only if the user has one of the allowed roles.
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    let authorized = false;
    for (const role of allowedRoles) {
      if (await hasRole(req.user.id, role as any)) {
        authorized = true;
        break;
      }
    }
    
    if (!authorized) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}
