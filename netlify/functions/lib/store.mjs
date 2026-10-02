import { getStore } from '@netlify/blobs';
import { HttpError } from './http.mjs';
export function store(name) {
  try { return getStore({ name: `guardian-panel-${name}`, consistency: 'strong' }); }
  catch { throw new HttpError(503, 'El almacenamiento del panel no está disponible. Usa Netlify Dev o un sitio desplegado.'); }
}
export async function readVersioned(db, key) {
  const current = await db.getWithMetadata(key, { type: 'json' });
  if (!current || current.etag) return current;
  // El emulador de Blobs no devuelve ETag en GET. Obtener una versión estable
  // a través de LIST, verificándola antes y después de la lectura.
  for (let i=0;i<3;i++) {
    const before = (await db.list({ prefix:key })).blobs.find(b=>b.key===key)?.etag;
    const value = await db.getWithMetadata(key, { type:'json' });
    const after = (await db.list({ prefix:key })).blobs.find(b=>b.key===key)?.etag;
    if (!value && !after) return null;
    if (before && before===after && value) return { ...value, etag:after };
  }
  throw new HttpError(503, 'No se pudo obtener una versión estable del registro. Actualiza e intenta de nuevo.');
}
export async function withLease(db,key,work) {
  const old = await readVersioned(db,key);
  if (old?.data?.until>Date.now()) throw new HttpError(409, 'Otro supervisor está guardando una programación para este guardia. Intenta en unos segundos.');
  const lock=await db.setJSON(key,{until:Date.now()+30000},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});
  if (!lock.modified || !lock.etag) throw new HttpError(409, 'La programación cambió mientras guardabas. Intenta de nuevo.');
  try {return await work();} finally {await db.setJSON(key,{until:0},{onlyIfMatch:lock.etag});}
}
export async function allSchedules(db) {
  const rows = [];
  for await (const page of db.list({ prefix: 'shift/', paginate: true })) {
    const values = await Promise.all(page.blobs.map(b => readVersioned(db,b.key)));
    for (const value of values) if (value?.data && !value.data.deleted) rows.push({ ...value.data, etag: value.etag });
  }
  return rows;
}
export async function consumeLoginAttempt(db, key, now = Date.now()) {
  // Compartido entre instancias; actualización condicional para no perder intentos concurrentes.
  for (let i = 0; i < 5; i++) {
    const existing = await readVersioned(db,key);
    const current = existing?.data?.resetAt > now ? existing.data : { count: 0, resetAt: now + 15 * 60000 };
    if (current.count >= 10) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.', Math.ceil((current.resetAt - now) / 1000));
    const result = await db.setJSON(key, { ...current, count: current.count + 1 }, existing ? { onlyIfMatch: existing.etag } : { onlyIfNew: true });
    if (result.modified) return;
  }
  throw new HttpError(429, 'Hay varios intentos simultáneos. Espera un momento.', 30);
}
