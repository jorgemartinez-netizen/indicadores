import { readAll } from './guardian.mjs';
import { store, readVersioned } from './store.mjs';
import { HttpError } from './http.mjs';
import { createHash } from 'node:crypto';
const ttl = 60000;
async function requestBudget(db, env) {
  const fingerprint = createHash('sha256').update(env.GUARDIAN_API_KEY || '').digest('hex');
  const key = `budget/${fingerprint}/${Math.floor(Date.now()/60000)}`;
  for (let i=0; i<5; i++) {
    const old = await readVersioned(db,key);
    const count = old?.data?.count || 0;
    if (count >= 100) throw new HttpError(429, 'El panel alcanzó su presupuesto de consultas. Espera al siguiente minuto.', 60-Math.floor((Date.now()%60000)/1000));
    const result = await db.setJSON(key, { count: count+1 }, old ? { onlyIfMatch:old.etag } : { onlyIfNew:true });
    if (result.modified) return;
  }
  throw new HttpError(429, 'Hay varias consultas simultáneas. Intenta de nuevo en unos segundos.', 10);
}

async function cachedResource(db, resource, filters, env) {
  // La huella cambia al renovar la credencial: no reutilizar datos de otra integración.
  const key = createHash('sha256').update(JSON.stringify([env.GUARDIAN_API_KEY, resource, filters])).digest('hex');
  const existing = await db.get(key, { type: 'json' });
  if (existing?.expiresAt > Date.now()) return existing.value;
  const lockKey = `lock/${key}`;
  const oldLock = await readVersioned(db,lockKey);
  if (oldLock?.data?.until > Date.now()) throw new HttpError(503, 'La actualización está en curso. Intenta en unos segundos.', 10);
  const lock = await db.setJSON(lockKey, { until: Date.now() + 60000 }, oldLock ? { onlyIfMatch: oldLock.etag } : { onlyIfNew: true });
  if (!lock.modified) throw new HttpError(503, 'La actualización está en curso. Intenta en unos segundos.', 10);
  try {
    const value = await readAll(resource, filters, { env, beforeFetch: () => requestBudget(db,env) });
    await db.setJSON(key, { value, expiresAt: Date.now() + ttl });
    return value;
  } finally {
    // Liberar solamente nuestro bloqueo, nunca uno adquirido posteriormente por otra instancia.
    if (lock.etag) await db.setJSON(lockKey, { until: 0 }, { onlyIfMatch: lock.etag });
  }
}
export async function snapshot(range, env = process.env) {
  const db = store('cache');
  const sites = await cachedResource(db, 'sites', {}, env);
  const guards = await cachedResource(db, 'guards', {}, env);
  const onDuty = await cachedResource(db, 'on-duty', {}, env);
  const shifts = await cachedResource(db, 'shifts', range, env);
  return { sites: sites.data, guards: guards.data, onDuty: onDuty.data, shifts: shifts.data, range, fetchedAt: new Date().toISOString(), sourceTimes: [...sites.generatedAt, ...guards.generatedAt, ...onDuty.generatedAt, ...shifts.generatedAt], partial: false };
}
