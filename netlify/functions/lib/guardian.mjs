import { HttpError } from './http.mjs';
const HOST = 'us-central1-guardiancheck-prod.cloudfunctions.net';
export function settings(env = process.env) {
  const base = env.GUARDIAN_API_URL || `https://${HOST}/integrationApi`;
  let url; try { url = new URL(base); } catch { throw new HttpError(503, 'La URL de GuardianCheck no es válida.'); }
  if (url.protocol !== 'https:' || url.hostname !== HOST || url.port || url.username || url.password || url.pathname.replace(/\/$/, '') !== '/integrationApi' || url.search || url.hash) throw new HttpError(503, 'La URL de GuardianCheck no es válida.');
  if (!env.GUARDIAN_API_KEY) throw new HttpError(503, 'Falta configurar la credencial de GuardianCheck en el servidor.');
  return { base: base.replace(/\/$/, ''), key: env.GUARDIAN_API_KEY };
}
export function dateRange(url, today) {
  const day = today || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const to = url.searchParams.get('to') || day;
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
  if (!valid(to)) throw new HttpError(400, 'La fecha final no es válida.');
  const from = url.searchParams.get('from') || new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10);
  if (!valid(from) || !valid(to) || from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 92 || to > day) throw new HttpError(400, 'Selecciona un periodo válido de hasta 93 días, sin fechas futuras.');
  return { from, to };
}
export async function readAll(resource, filters = {}, { fetcher = fetch, env = process.env, maxPages = 100, beforeFetch = async () => {} } = {}) {
  const { base, key } = settings(env);
  const records = new Map(); const seen = new Set(); const generatedAt = [];
  let cursor = null;
  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({ ...filters, limit: '100' });
    if (cursor) query.set('cursor', cursor);
    await beforeFetch();
    let response;
    try { response = await fetcher(`${base}/v1/${resource}?${query}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(12000), redirect: 'error' }); }
    catch { throw new HttpError(502, 'No se pudo conectar con GuardianCheck.'); }
    if (!response.ok) {
      const messages = { 401: 'La credencial de GuardianCheck venció o no es válida.', 403: 'GuardianCheck no autorizó los recursos o servicios solicitados.', 429: 'Se alcanzó la cuota de GuardianCheck. Espera antes de actualizar.' };
      throw new HttpError(response.status === 429 ? 429 : 502, messages[response.status] || 'GuardianCheck no pudo completar la consulta.', response.status === 429 ? response.headers.get('Retry-After') || 60 : undefined);
    }
    let data; try { data = await response.json(); } catch { throw new HttpError(502, 'GuardianCheck devolvió una respuesta no válida.'); }
    if (!Array.isArray(data.data) || !Object.hasOwn(data, 'nextCursor') || (data.nextCursor !== null && (typeof data.nextCursor !== 'string' || !data.nextCursor))) throw new HttpError(502, 'La paginación de GuardianCheck no es válida.');
    for (const row of data.data) {
      if (!row || typeof row.id !== 'string') throw new HttpError(502, 'GuardianCheck devolvió un registro sin ID estable.');
      records.set(row.id, row);
    }
    if (data.generatedAt) generatedAt.push(data.generatedAt);
    cursor = data.nextCursor;
    if (cursor === null) return { data: [...records.values()], generatedAt };
    if (seen.has(cursor)) throw new HttpError(502, 'GuardianCheck devolvió un cursor repetido.');
    seen.add(cursor);
  }
  throw new HttpError(502, 'La consulta superó el límite de páginas. Acorta el periodo; no se mostrarán resultados parciales.');
}
