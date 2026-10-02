export async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  let body; try { body = await response.json(); } catch { throw new Error('El servidor no devolvió una respuesta válida. Usa Netlify Dev para probar las funciones.'); }
  if (!response.ok) {
    const error = new Error(body.error?.message || 'No se pudo completar la solicitud.');
    error.status = response.status; error.retryAfter = Number(response.headers.get('Retry-After')) || 0; throw error;
  }
  return body;
}
