export const ZONE = "America/Mexico_City";
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const labelFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
});
const inputFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function dayKey(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dayFormatter.format(date) : null;
}
export function dateDefaults(now = Date.now()) {
  const to = dayKey(now);
  return {
    to,
    from: new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 86400000)
      .toISOString()
      .slice(0, 10),
  };
}
export function localDateTime(value) {
  return inputFormatter.format(new Date(value)).replace(" ", "T");
}
// Solo programación nueva, después de 2026: México central usa UTC-6.
export function mexicoInput(value) {
  return value ? new Date(`${value}:00-06:00`).toISOString() : null;
}
export function latest(plan, kinds, until = Infinity) {
  let found;
  for (const e of plan.events || [])
    if (
      kinds.includes(e.kind) &&
      Date.parse(e.at) <= until &&
      (!found || Date.parse(e.at) >= Date.parse(found.at))
    )
      found = e;
  return found;
}
function lowerBound(rows, time) {
  let low = 0,
    high = rows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}
export function matchPlans(plans, shifts) {
  const index = new Map();
  for (const s of shifts) {
    if (
      !s.guardId ||
      !s.siteId ||
      !s.startTime ||
      (s.flags || []).some((f) => ["invalid_start", "future_start"].includes(f))
    )
      continue;
    const time = Date.parse(s.startTime);
    if (!Number.isFinite(time)) continue;
    const key = JSON.stringify([s.guardId, s.siteId]);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ s, time });
  }
  for (const rows of index.values()) rows.sort((a, b) => a.time - b.time);
  const candidates = [];
  for (const p of plans) {
    const rows = index.get(JSON.stringify([p.guardId, p.siteId]));
    if (!rows) continue;
    const start = Date.parse(p.startAt);
    for (
      let i = lowerBound(rows, start - 4 * 3600000);
      i < rows.length && rows[i].time <= start + 12 * 3600000;
      i++
    )
      candidates.push({
        p: p.id,
        s: rows[i].s,
        distance: Math.abs(rows[i].time - start),
      });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const result = new Map(),
    used = new Set();
  for (const c of candidates)
    if (!result.has(c.p) && !used.has(c.s.id)) {
      result.set(c.p, c.s);
      used.add(c.s.id);
    }
  return result;
}
export function planState(plan, match, now) {
  const start = Date.parse(plan.startAt);
  if (latest(plan, ["covered"], now))
    return { label: "Relevo confirmado", tone: "green", ready: true };
  if (match && Date.parse(match.startTime) <= now)
    return { label: "Entrada registrada", tone: "green", ready: true };
  const answer = latest(
    plan,
    ["confirmed", "late", "absent", "verified_absent"],
    now,
  );
  if (answer?.kind === "verified_absent")
    return { label: "Ausencia verificada", tone: "red", ready: false };
  if (answer?.kind === "absent")
    return { label: "Ausencia anunciada", tone: "red", ready: false };
  if (now > start + plan.toleranceMinutes * 60000)
    return { label: "Sin entrada · verificar", tone: "red", ready: false };
  if (answer?.kind === "late")
    return {
      label: "Retraso anunciado",
      tone: "amber",
      ready: Date.parse(answer.eta) <= start + plan.toleranceMinutes * 60000,
    };
  if (answer?.kind === "confirmed")
    return { label: "Llegada confirmada", tone: "green", ready: true };
  return {
    label: "Sin confirmar",
    tone: start - now <= 30 * 60000 ? "red" : "amber",
    ready: false,
  };
}
export function serviceCoverage(
  sites,
  onDuty,
  requirements = [],
  now = Date.now(),
) {
  const bySite = new Map(),
    targets = new Map(requirements.map((r) => [r.siteId, r]));
  for (const shift of onDuty) {
    if (!bySite.has(shift.siteId))
      bySite.set(shift.siteId, {
        guards: new Set(),
        valid: new Set(),
        turns: 0,
        review: 0,
      });
    const row = bySite.get(shift.siteId);
    row.turns++;
    if (shift.guardId) row.guards.add(shift.guardId);
    const invalid =
      !shift.guardId ||
      shift.accountActive !== true ||
      !shift.startTime ||
      !Number.isFinite(Date.parse(shift.startTime)) ||
      Date.parse(shift.startTime) > now ||
      !!shift.endTime ||
      (shift.flags || []).some((f) =>
        [
          "invalid_start",
          "future_start",
          "open_with_end",
          "missing_guard_profile",
        ].includes(f),
      );
    if (!invalid) row.valid.add(shift.guardId);
    if (invalid || shift.flags?.length) row.review++;
  }
  return sites
    .map((site) => {
      const row = bySite.get(site.id) || {
        guards: new Set(),
        valid: new Set(),
        turns: 0,
        review: 0,
      };
      const target = targets.get(site.id);
      const expired = !!target && Date.parse(target.validUntil) <= now;
      const required =
        site.active &&
        target &&
        !expired &&
        Number.isInteger(target.requiredGuards)
          ? target.requiredGuards
          : null;
      const missing =
        required === null ? null : Math.max(0, required - row.valid.size);
      const status = !site.active
        ? "Inactivo"
        : missing > 0
          ? "Puestos sin entrada válida"
          : expired
            ? "Dotación vencida"
            : required === null
              ? row.turns
                ? "Dotación sin definir"
                : "Sin turnos abiertos"
              : row.review
                ? "Registros por verificar"
                : required === 0
                  ? "Sin cobertura requerida"
                  : "Dotación registrada";
      const tone = !site.active
        ? "muted"
        : missing > 0
          ? "red"
          : expired || required === null || row.review
            ? "amber"
            : "green";
      return {
        site,
        target,
        expired,
        required,
        missing,
        guards: row.guards.size,
        validGuards: row.valid.size,
        turns: row.turns,
        review: row.review,
        status,
        tone,
      };
    })
    .sort(
      (a, b) =>
        (b.missing || 0) - (a.missing || 0) ||
        Number(b.site.active && b.turns === 0) -
          Number(a.site.active && a.turns === 0) ||
        b.review - a.review ||
        (a.site.name || "").localeCompare(b.site.name || "", "es"),
    );
}
export function compute(
  data,
  siteId = "",
  now = Date.now(),
  { historical = true } = {},
) {
  const sites = data.sites.filter((s) => !siteId || s.id === siteId);
  const onDuty = data.onDuty.filter((s) => !siteId || s.siteId === siteId);
  const shifts = data.shifts.filter((s) => !siteId || s.siteId === siteId);
  const plans = data.schedules.filter((s) => !siteId || s.siteId === siteId);
  const recent = (data.recentShifts || []).filter(
    (s) => !siteId || s.siteId === siteId,
  );
  const allShifts = [
    ...new Map(
      [...shifts, ...recent, ...onDuty].map((s) => [s.id, s]),
    ).values(),
  ];
  const relevantPlans = historical
    ? plans
    : plans.filter(
        (p) =>
          Date.parse(p.startAt) >= now - 12 * 3600000 &&
          Date.parse(p.startAt) <= now + 60 * 60000,
      );
  const matched = matchPlans(relevantPlans, allShifts);
  const next = relevantPlans
    .filter(
      (p) =>
        Date.parse(p.startAt) >= now &&
        Date.parse(p.startAt) <= now + 60 * 60000,
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const pending = relevantPlans.filter(
    (p) =>
      Date.parse(p.startAt) < now &&
      Date.parse(p.startAt) >= now - 12 * 3600000 &&
      !planState(p, matched.get(p.id), now).ready,
  );
  const ready = next.filter(
    (p) => planState(p, matched.get(p.id), now).ready,
  ).length;
  const coverage = serviceCoverage(sites, onDuty, data.coverage, now);
  const live = {
    sites,
    onDuty,
    shifts,
    plans: historical
      ? plans
      : plans.filter((p) => Date.parse(p.startAt) >= now - 12 * 3600000),
    matched,
    next,
    pending,
    ready,
    unsecured: next.length - ready,
    readiness: next.length ? (ready / next.length) * 100 : null,
    guardCount: new Set(onDuty.map((s) => s.guardId).filter(Boolean)).size,
    unknownGuards: onDuty.filter((s) => !s.guardId).length,
    longOpen: onDuty.filter((s) => s.flags?.includes("long_open_shift")).length,
    coverage,
    missingPosts: coverage.reduce((sum, r) => sum + (r.missing || 0), 0),
    configuredSites: coverage.filter((r) => r.required !== null).length,
    deficientSites: coverage.filter((r) => r.missing > 0).length,
    emptySites: coverage.filter((r) => r.site.active && !r.turns).length,
    reviewCount: coverage.reduce((sum, r) => sum + r.review, 0),
  };
  if (!historical) return live;
  const flagged = shifts.filter((s) => s.flags?.length).length;
  const hoursRows = shifts.filter(
    (s) =>
      s.status === "completed" &&
      typeof s.workedHours === "number" &&
      Number.isFinite(s.workedHours) &&
      s.workedHours >= 0 &&
      !(s.flags || []).some((f) =>
        [
          "invalid_start",
          "invalid_end",
          "end_before_start",
          "future_start",
        ].includes(f),
      ),
  );
  const hoursIds = new Set(hoursRows.map((s) => s.id)),
    daily = new Map();
  for (const s of shifts) {
    const day = dayKey(s.startTime);
    if (!day) continue;
    if (!daily.has(day)) daily.set(day, { turns: 0, flagged: 0, hours: 0 });
    const row = daily.get(day);
    row.turns++;
    if (s.flags?.length) row.flagged++;
    if (hoursIds.has(s.id)) row.hours += s.workedHours;
  }
  const timeline = [];
  for (
    let d = Date.parse(`${data.range.from}T12:00:00Z`);
    d <= Date.parse(`${data.range.to}T12:00:00Z`);
    d += 86400000
  ) {
    const day = new Date(d).toISOString().slice(0, 10);
    timeline.push({
      day,
      label: labelFormatter.format(new Date(d)),
      ...(daily.get(day) || { turns: 0, flagged: 0, hours: 0 }),
    });
  }
  const history = plans.filter(
    (p) =>
      dayKey(p.startAt) >= data.range.from &&
      dayKey(p.startAt) <= data.range.to &&
      Date.parse(p.startAt) + (p.toleranceMinutes + 30) * 60000 < now,
  );
  let incidents = 0,
    withoutNotice = 0,
    riskCount = 0,
    resolved = 0;
  const leadTimes = [];
  for (const p of history) {
    const start = Date.parse(p.startAt),
      shift = matched.get(p.id),
      absent = latest(p, ["verified_absent"]);
    const tardy =
      shift && Date.parse(shift.startTime) > start + p.toleranceMinutes * 60000;
    const announcements = (p.events || [])
      .filter((e) => ["late", "absent"].includes(e.kind))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const notice = announcements.find(
      (e) => Date.parse(e.at) <= start - 30 * 60000,
    );
    if (tardy || absent) {
      incidents++;
      if (!notice) withoutNotice++;
    }
    const early = announcements.find((e) => Date.parse(e.at) < start);
    if (early) leadTimes.push((start - Date.parse(early.at)) / 60000);
    const risk = !planState(
      p,
      shift && Date.parse(shift.startTime) <= start - 30 * 60000 ? shift : null,
      start - 30 * 60000,
    ).ready;
    if (risk && Date.parse(p.createdAt) <= start - 30 * 60000) {
      riskCount++;
      if (
        latest(p, ["covered"], start) ||
        (shift && Date.parse(shift.startTime) <= start)
      )
        resolved++;
    }
  }
  leadTimes.sort((a, b) => a - b);
  const median = leadTimes.length
    ? (leadTimes[Math.floor((leadTimes.length - 1) / 2)] +
        leadTimes[Math.ceil((leadTimes.length - 1) / 2)]) /
      2
    : null;
  return {
    ...live,
    flagged,
    flagRate: shifts.length ? (flagged / shifts.length) * 100 : null,
    hours: hoursRows.reduce((sum, s) => sum + s.workedHours, 0),
    hoursCount: hoursRows.length,
    doubles: shifts.filter((s) => s.isDouble).length,
    adminClosed: shifts.filter((s) => s.closedByAdmin).length,
    timeline,
    incidents,
    withoutNotice,
    noticeRate: incidents ? (withoutNotice / incidents) * 100 : null,
    riskCount,
    resolved,
    resolvedRate: riskCount ? (resolved / riskCount) * 100 : null,
    median,
    leadCount: leadTimes.length,
    historicalCount: history.length,
  };
}
