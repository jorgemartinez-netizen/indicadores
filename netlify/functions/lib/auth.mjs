import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { HttpError, sameOrigin } from './http.mjs';
export function password(env = process.env) {
  const value = env.PANEL_ACCESS_PASSWORD;
  if (!value || value.length < 16) throw new HttpError(503, 'Falta configurar una contraseña del panel de al menos 16 caracteres.');
  return value;
}
function sign(value, key) { return createHmac('sha256', key).update(value).digest('base64url'); }
function equal(a, b) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function checkPassword(value, env = process.env) {
  // Comparar hashes de longitud fija, incluso si las contraseñas difieren en longitud.
  return typeof value === 'string' && equal(sign(value, 'password-comparison'), sign(password(env), 'password-comparison'));
}
export function createSession(env = process.env, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + 8 * 3600000, nonce: randomBytes(18).toString('base64url') })).toString('base64url');
  return `${payload}.${sign(payload, password(env))}`;
}
export async function authenticate(request, env = process.env, now = Date.now()) {
  sameOrigin(request);
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'Origen no permitido.');
  const key = password(env);
  const token = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('gc_session='))?.slice(11) || '';
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !equal(signature, sign(payload, key))) throw new HttpError(401, 'Inicia sesión para consultar el panel.');
  let data; try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new HttpError(401, 'La sesión no es válida.'); }
  if (!Number.isFinite(data.exp) || data.exp <= now) throw new HttpError(401, 'La sesión venció. Vuelve a iniciar sesión.');
  return { uid: 'supervision' };
}
export function sessionCookie(token, request, maxAge = 28800) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `gc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}
