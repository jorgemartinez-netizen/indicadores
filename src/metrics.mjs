export const ZONE = 'America/Mexico_City';
export function dayKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function dateDefaults(now = Date.now()) {
  const to = dayKey(now); return { to, from: new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10) };
}
export function localDateTime(value) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
}
// México central tiene UTC-6 para las fechas actuales (programación nueva, desde 2026).
export function mexicoInput(value) { return value ? new Date(`${value}:00-06:00`).toISOString() : null; }
export const latest = (plan, kinds, until = Infinity) => (plan.events || []).filter(e => kinds.includes(e.kind) && Date.parse(e.at) <= until).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
export function matchPlans(plans, shifts) {
  const candidates = [];
  for (const p of plans) for (const s of shifts) {
    if (p.guardId !== s.guardId || p.siteId !== s.siteId || !s.startTime || (s.flags || []).some(f => ['invalid_start', 'future_start'].includes(f))) continue;
    const diff = Date.parse(s.startTime) - Date.parse(p.startAt);
    if (diff >= -4 * 3600000 && diff <= 12 * 3600000) candidates.push({ p: p.id, s, distance: Math.abs(diff) });
  }
  candidates.sort((a,b) => a.distance - b.distance);
  const result = new Map(); const used = new Set();
  for (const c of candidates) if (!result.has(c.p) && !used.has(c.s.id)) { result.set(c.p, c.s); used.add(c.s.id); }
  return result;
}
export function planState(plan, match, now) {
  const start = Date.parse(plan.startAt);
  const covered = latest(plan, ['covered']);
  if (covered) return { label: 'Relevo confirmado', tone: 'green', ready: true };
  if (match) return { label: 'Entrada registrada', tone: 'green', ready: true };
  const answer = latest(plan, ['confirmed', 'late', 'absent', 'verified_absent']);
  if (answer?.kind === 'verified_absent') return { label: 'Ausencia verificada', tone: 'red', ready: false };
  if (answer?.kind === 'absent') return { label: 'Ausencia anunciada', tone: 'red', ready: false };
  if (now > start + plan.toleranceMinutes * 60000) return { label: 'Sin entrada · verificar', tone: 'red', ready: false };
  if (answer?.kind === 'late') return { label: 'Retraso anunciado', tone: 'amber', ready: Date.parse(answer.eta) <= start + plan.toleranceMinutes * 60000 };
  if (answer?.kind === 'confirmed') return { label: 'Llegada confirmada', tone: 'green', ready: true };
  return { label: 'Sin confirmar', tone: start - now <= 30 * 60000 ? 'red' : 'amber', ready: false };
}
export function compute(data, siteId = '', now = Date.now()) {
  const sites = data.sites.filter(s => !siteId || s.id === siteId);
  const onDuty = data.onDuty.filter(s => !siteId || s.siteId === siteId);
  const shifts = data.shifts.filter(s => !siteId || s.siteId === siteId);
  const plans = data.schedules.filter(s => !siteId || s.siteId === siteId);
  // /on-duty aporta entradas que el filtro histórico podría no incluir aún.
  const allShifts = [...new Map([...shifts, ...onDuty].map(s => [s.id, s])).values()];
  const matched = matchPlans(plans, allShifts);
  const next = plans.filter(p => Date.parse(p.startAt) >= now && Date.parse(p.startAt) <= now + 60 * 60000).sort((a,b) => Date.parse(a.startAt)-Date.parse(b.startAt));
  const pending = plans.filter(p => Date.parse(p.startAt) < now && Date.parse(p.startAt) >= now - 12 * 3600000 && !planState(p,matched.get(p.id),now).ready);
  const ready = next.filter(p => planState(p,matched.get(p.id),now).ready).length;
  const flagged = shifts.filter(s => s.flags?.length).length;
  const hoursRows = shifts.filter(s => s.status === 'completed' && typeof s.workedHours === 'number' && Number.isFinite(s.workedHours) && s.workedHours >= 0 && !(s.flags || []).some(f => ['invalid_start','invalid_end','end_before_start','future_start'].includes(f)));
  const timeline = [];
  for (let d = Date.parse(`${data.range.from}T12:00:00Z`); d <= Date.parse(`${data.range.to}T12:00:00Z`); d += 86400000) {
    const day = new Date(d).toISOString().slice(0,10); const rows = shifts.filter(s => dayKey(s.startTime) === day);
    timeline.push({ day, label: new Intl.DateTimeFormat('es-MX', { timeZone: ZONE, day:'numeric',month:'short' }).format(new Date(d)), turns: rows.length, flagged: rows.filter(s => s.flags?.length).length, hours: hoursRows.filter(s => dayKey(s.startTime)===day).reduce((sum,s)=>sum+s.workedHours,0) });
  }
  const historical = plans.filter(p => dayKey(p.startAt) >= data.range.from && dayKey(p.startAt) <= data.range.to && Date.parse(p.startAt) + (p.toleranceMinutes + 30) * 60000 < now);
  let incidents = 0, withoutNotice = 0, riskCount = 0, resolved = 0; const leadTimes = [];
  for (const p of historical) {
    const start = Date.parse(p.startAt); const shift = matched.get(p.id);
    const absent = latest(p,['verified_absent']);
    const tardy = shift && Date.parse(shift.startTime) > start + p.toleranceMinutes * 60000;
    const notice = (p.events || []).filter(e => ['late','absent'].includes(e.kind) && Date.parse(e.at) <= start - 30 * 60000).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))[0];
    if (tardy || absent) { incidents++; if (!notice) withoutNotice++; }
    const announcements = (p.events || []).filter(e => ['late','absent'].includes(e.kind) && Date.parse(e.at) < start).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    if (announcements[0]) leadTimes.push((start - Date.parse(announcements[0].at))/60000);
    // Evaluar exclusivamente eventos existentes en el corte de -30 min.
    const prior = { ...p, events:p.events.filter(e=>Date.parse(e.at)<=start-30*60000) };
    const risk = !planState(prior,shift && Date.parse(shift.startTime)<=start-30*60000 ? shift:null,start-30*60000).ready;
    if (risk && Date.parse(p.createdAt) <= start-30*60000) {
      riskCount++;
      if (latest(p,['covered'],start) || (shift && Date.parse(shift.startTime)<=start)) resolved++;
    }
  }
  leadTimes.sort((a,b)=>a-b);
  const median = leadTimes.length ? (leadTimes[Math.floor((leadTimes.length-1)/2)]+leadTimes[Math.ceil((leadTimes.length-1)/2)])/2:null;
  return { sites,onDuty,shifts,plans,matched,next,pending,ready,unsecured:next.length-ready,readiness:next.length?ready/next.length*100:null,guardCount:new Set(onDuty.map(s=>s.guardId).filter(Boolean)).size,unknownGuards:onDuty.filter(s=>!s.guardId).length,longOpen:onDuty.filter(s=>s.flags?.includes('long_open_shift')).length,flagged,flagRate:shifts.length?flagged/shifts.length*100:null,hours:hoursRows.reduce((sum,s)=>sum+s.workedHours,0),hoursCount:hoursRows.length,doubles:shifts.filter(s=>s.isDouble).length,adminClosed:shifts.filter(s=>s.closedByAdmin).length,timeline,incidents,withoutNotice,noticeRate:incidents?withoutNotice/incidents*100:null,riskCount,resolved,resolvedRate:riskCount?resolved/riskCount*100:null,median,leadCount:leadTimes.length,historicalCount:historical.length };
}
