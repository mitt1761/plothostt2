import { Request, Response, NextFunction } from 'express';

// Extend express session to support userId
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Sesi kedaluwarsa atau Anda belum masuk (unauthorized)' });
  }
}
