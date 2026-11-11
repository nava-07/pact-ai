import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
declare module 'express-serve-static-core' { interface Request { uid?: string } }
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try { req.uid = (jwt.verify(req.cookies?.pact_token ?? '', env.SESSION_SECRET) as { uid: string }).uid; next(); } catch { next(new HttpError(401, 'Sign in required')); }
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) { res.status(400).json({ error: 'Invalid request', details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }); return; }
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  console.error(err); res.status(500).json({ error: 'Something went wrong' }); // never leak stack traces
};
