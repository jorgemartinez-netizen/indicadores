import { authenticate } from './lib/auth.mjs';
import { settings, dateRange } from './lib/guardian.mjs';
import { snapshot } from './lib/snapshot.mjs';
import { store, allSchedules } from './lib/store.mjs';
import { json, fail, HttpError } from './lib/http.mjs';
export default async function handler(request) {
  try {
    if (request.method !== 'GET') throw new HttpError(405, 'Método no permitido.');
    await authenticate(request); settings();
    const range = dateRange(new URL(request.url));
    const data = await snapshot(range);
    const sites = new Set(data.sites.map(s => s.id));
    const schedules = (await allSchedules(store('schedules'))).filter(s => sites.has(s.siteId));
    return json({ ...data, schedules });
  } catch (error) { return fail(error); }
}
