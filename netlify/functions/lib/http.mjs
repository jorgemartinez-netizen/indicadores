export class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
}
export function fail(error) {
  const status = error instanceof HttpError ? error.status : 500;
  // No registrar excepciones completas: pueden contener respuestas o identificadores privados.
  if (status === 500) console.error('panel_request_failed');
  return json({ error: { message: status === 500 ? 'No se pudo completar la consulta. Intenta más tarde.' : error.message } }, status, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
}
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Origen no permitido.');
}
