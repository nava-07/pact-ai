import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') }); dotenv.config();
const s = z.string().default('');
export const env = z.object({
  PORT: z.coerce.number().default(5000), NODE_ENV: z.string().default('development'), MONGODB_URI: s, SESSION_SECRET: z.string().default('dev-only-change-me'),
  GEMINI_API_KEY: s, GEMINI_MODEL: z.string().default('gemini-3.5-flash'), PAYPAL_CLIENT_ID: s, PAYPAL_CLIENT_SECRET: s,
  PAYPAL_BASE_URL: z.string().default('https://api-m.sandbox.paypal.com'), PAYPAL_WEBHOOK_ID: s, CLIENT_URL: z.string().default('http://localhost:5173'), SERVER_URL: z.string().default('http://localhost:5000'),
}).parse(process.env);
export const configured = { mongodb: !!env.MONGODB_URI, gemini: !!env.GEMINI_API_KEY, paypal: !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET), paypalWebhook: !!env.PAYPAL_WEBHOOK_ID };
