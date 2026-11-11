import mongoose from 'mongoose';
import { app } from './app.js';
import { configured, env } from './config/env.js';
async function main() {
  if (configured.mongodb) { await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }); console.log('MongoDB connected'); }
  else console.warn('MONGODB_URI is empty: running without a database.');
  app.listen(env.PORT, () => console.log(`Pact AI server on :${env.PORT} · PayPal ${env.PAYPAL_BASE_URL.includes('sandbox') ? 'Sandbox' : 'LIVE'}`));
}
main().catch(e => { console.error('Startup failed:', (e as Error).message); process.exit(1); });
