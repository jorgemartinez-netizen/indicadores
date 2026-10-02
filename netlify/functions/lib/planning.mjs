import { HttpError } from './http.mjs';
export const eventKinds = ['confirmed', 'late', 'absent', 'contact', 'covered', 'verified_absent'];
export function validatePlan(body, sites, guards, now = Date.now()) {
  if (!sites.some(s => s.id === body.siteId && s.active)) throw new HttpError(400, 'Selecciona un servicio activo autorizado.');
  if (!guards.some(g => g.id === body.guardId && g.accountActive)) throw new HttpError(400, 'Selecciona un guardia activo autorizado.');
  const start = Date.parse(body.startAt);
  if (!Number.isFinite(start) || !/Z$|[+-]\d{2}:\d{2}$/.test(body.startAt || '') || start < now - 86400000 || start > now + 93 * 86400000) throw new HttpError(400, 'La entrada debe estar entre ayer y los próximos 93 días.');
  const tolerance = Number(body.toleranceMinutes);
  if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 120) throw new HttpError(400, 'La tolerancia debe ser de 0 a 120 minutos.');
  const responsible = String(body.responsible || '').trim();
  if (!responsible || responsible.length > 100) throw new HttpError(400, 'Indica un responsable de hasta 100 caracteres.');
  return { siteId: body.siteId, guardId: body.guardId, startAt: new Date(start).toISOString(), toleranceMinutes: tolerance, responsible };
}
export function validateEvent(body, plan, guards, now = Date.now()) {
  if (!eventKinds.includes(body.kind)) throw new HttpError(400, 'Tipo de seguimiento no válido.');
  const note = String(body.note || '').trim();
  if (note.length > 500) throw new HttpError(400, 'La nota admite hasta 500 caracteres.');
  if (['contact', 'verified_absent'].includes(body.kind) && !note) throw new HttpError(400, 'Describe el contacto o la verificación de ausencia.');
  if (body.kind === 'verified_absent' && now < Date.parse(plan.startAt) + plan.toleranceMinutes * 60000) throw new HttpError(400, 'La ausencia se verifica después de la entrada y tolerancia.');
  let eta = null; let replacementGuardId = null;
  if (body.kind === 'late') {
    const t = Date.parse(body.eta);
    if (!Number.isFinite(t) || t < now || t > Date.parse(plan.startAt) + 24 * 3600000) throw new HttpError(400, 'Indica una hora estimada de llegada válida.');
    eta = new Date(t).toISOString();
  }
  if (body.kind === 'covered') {
    if (!guards.some(g => g.id === body.replacementGuardId && g.accountActive)) throw new HttpError(400, 'Selecciona el guardia que confirmó el relevo.');
    replacementGuardId = body.replacementGuardId;
  }
  return { kind: body.kind, note, eta, replacementGuardId, at: new Date(now).toISOString() };
}
