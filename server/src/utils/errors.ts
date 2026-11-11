import { NextFunction, Request, Response } from 'express';
export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export const ah = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
