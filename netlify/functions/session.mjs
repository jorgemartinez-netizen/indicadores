import { createHash } from 'node:crypto';
import { authenticate, checkPassword, createSession, sessionCookie, password } from './lib/auth.mjs';
import { json, fail, HttpError, sameOrigin } from './lib/http.mjs';
import { store, consumeLoginAttempt } from './lib/store.mjs';
export default async function handler(request, context) {
  try {
    sameOrigin(request);
    if (request.method === 'GET') { await authenticate(request); return json({ authenticated: true }); }
    if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'Origen no permitido.');
    if (request.method === 'DELETE') return json({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie('', request, 0) });
    if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
    password();
    const text = await request.text();
    if (text.length > 2048) throw new HttpError(400, 'Solicitud demasiado grande.');
    let body; try { body = JSON.parse(text); } catch { throw new HttpError(400, 'Solicitud inválida.'); }
    const ip = context.ip || 'unknown';
    await consumeLoginAttempt(store('login'), createHash('sha256').update(ip).digest('hex'));
    if (!checkPassword(body.password)) throw new HttpError(401, 'La contraseña no es correcta.');
    return json({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(createSession(), request) });
  } catch (error) { return fail(error); }
}
