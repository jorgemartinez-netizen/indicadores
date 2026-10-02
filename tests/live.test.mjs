import test from "node:test";
import assert from "node:assert/strict";
import { compute, serviceCoverage, dayKey } from "../src/metrics.mjs";
import { currentRange } from "../netlify/functions/lib/snapshot.mjs";
import { validateCoverage } from "../netlify/functions/lib/coverage.mjs";
const now = Date.parse("2026-10-02T16:00:00Z");
const sites = [
  { id: "s", name: "Sitio", active: true },
  { id: "other", name: "Otro", active: true },
];
const target = {
  siteId: "s",
  requiredGuards: 3,
  validUntil: "2026-10-03T06:00:00Z",
};
const shift = (id, guardId, extra = {}) => ({
  id,
  guardId,
  siteId: "s",
  startTime: "2026-10-02T12:00:00Z",
  endTime: null,
  status: "active",
  accountActive: true,
  flags: [],
  ...extra,
});
test("Cobertura: puestos requeridos menos personas válidas, sin duplicar entradas", () => {
  const rows = serviceCoverage(
    sites,
    [shift("a", "g"), shift("b", "g"), shift("c", "h")],
    [target],
    now,
  );
  const s = rows.find((r) => r.site.id === "s");
  assert.equal(s.guards, 2);
  assert.equal(s.validGuards, 2);
  assert.equal(s.turns, 3);
  assert.equal(s.missing, 1);
  assert.equal(s.status, "Puestos sin entrada válida");
});
test("Cuenta desactivada, entrada futura o abierta con salida no acredita cobertura", () => {
  const s = serviceCoverage(
    [sites[0]],
    [
      shift("a", "g", { accountActive: false }),
      shift("b", "h", { startTime: "2026-10-02T18:00:00Z" }),
      shift("c", "i", { endTime: "2026-10-02T15:00:00Z" }),
    ],
    [target],
    now,
  )[0];
  assert.equal(s.validGuards, 0);
  assert.equal(s.guards, 3);
  assert.equal(s.review, 3);
  assert.equal(s.missing, 3);
});
test("Un mismo guardia con un registro válido y otro inconsistente cuenta una vez y requiere revisión", () => {
  const s = serviceCoverage(
    [sites[0]],
    [shift("a", "g"), shift("b", "g", { flags: ["open_with_end"] })],
    [{ ...target, requiredGuards: 1 }],
    now,
  )[0];
  assert.equal(s.missing, 0);
  assert.equal(s.validGuards, 1);
  assert.equal(s.review, 1);
  assert.equal(s.status, "Registros por verificar");
});
test("Sin dotación no se inventa un número de faltantes ni una ausencia", () => {
  const s = serviceCoverage([sites[0]], [], [], now)[0];
  assert.equal(s.required, null);
  assert.equal(s.missing, null);
  assert.equal(s.status, "Sin turnos abiertos");
});
test("Dotación vencida deja de definir faltantes; servicio inactivo no requiere cobertura", () => {
  const s = serviceCoverage(
    [sites[0]],
    [],
    [{ ...target, validUntil: "2026-10-02T16:00:00Z" }],
    now,
  )[0];
  assert.equal(s.missing, null);
  assert.equal(s.status, "Dotación vencida");
  const inactive = serviceCoverage(
    [{ ...sites[0], active: false }],
    [],
    [target],
    now,
  )[0];
  assert.equal(inactive.required, null);
  assert.equal(inactive.status, "Inactivo");
});
test("Una dotación explícita de cero es válida y se distingue de configuración ausente", () => {
  const s = serviceCoverage(
    [sites[0]],
    [],
    [{ ...target, requiredGuards: 0 }],
    now,
  )[0];
  assert.equal(s.missing, 0);
  assert.equal(s.status, "Sin cobertura requerida");
});
test("Vista actual evita cálculos históricos y filtra cobertura por servicio", () => {
  const base = {
    sites,
    guards: [],
    onDuty: [shift("a", "g")],
    shifts: [],
    schedules: [],
    coverage: [target],
    range: { from: "2026-09-03", to: "2026-10-02" },
  };
  const live = compute(base, "s", now, { historical: false });
  assert.equal(live.missingPosts, 2);
  assert.equal(live.configuredSites, 1);
  assert.equal(live.emptySites, 0);
  assert.equal(live.timeline, undefined);
  assert.equal(live.median, undefined);
  const other = compute(base, "other", now, { historical: false });
  assert.equal(other.missingPosts, 0);
  assert.equal(other.configuredSites, 0);
  assert.equal(other.emptySites, 1);
});
test("Estado actual cruza turnos cerrados recientes aunque el historial seleccionado sea antiguo", () => {
  const p = {
    id: "p",
    guardId: "g",
    siteId: "s",
    startAt: "2026-10-02T15:00:00Z",
    toleranceMinutes: 5,
    events: [],
  };
  const base = {
    sites,
    guards: [],
    onDuty: [],
    shifts: [],
    schedules: [p],
    recentShifts: [
      {
        ...shift("a", "g"),
        startTime: "2026-10-02T15:00:00Z",
        endTime: "2026-10-02T15:30:00Z",
        status: "completed",
      },
    ],
    range: { from: "2026-09-01", to: "2026-09-30" },
  };
  const m = compute(base, "", now, { historical: false });
  assert.equal(m.matched.get("p").id, "a");
  assert.equal(m.pending.length, 0);
});
test("Consulta actual cubre ayer y hoy en México, incluso en la madrugada UTC", () => {
  assert.deepEqual(currentRange(Date.parse("2026-10-02T02:00:00Z")), {
    from: "2026-09-30",
    to: "2026-10-01",
  });
  assert.equal(dayKey(null), null);
  assert.equal(dayKey("bad"), null);
});
test("Dotación: validación rechaza valores vacíos, fraccionarios, vencidos o fuera de alcance", () => {
  assert.equal(validateCoverage({ ...target }, sites, now).requiredGuards, 3);
  for (const extra of [
    { siteId: "not-allowed" },
    { requiredGuards: "3" },
    { requiredGuards: 1.5 },
    { requiredGuards: -1 },
    { requiredGuards: 501 },
    { validUntil: "invalid" },
    { validUntil: "2026-10-02T15:00:00Z" },
    { validUntil: "2026-11-01T12:00:00Z" },
  ])
    assert.throws(
      () => validateCoverage({ ...target, ...extra }, sites, now),
      (e) => e.status === 400,
    );
});

test("Programación actual no etiqueta turnos antiguos como entradas ausentes y conserva futuros", () => {
  const base = {
    sites,
    guards: [],
    onDuty: [],
    shifts: [],
    range: { from: "2026-10-01", to: "2026-10-02" },
    schedules: [
      {
        id: "old",
        siteId: "s",
        guardId: "g",
        startAt: "2026-09-01T12:00:00Z",
        events: [],
        toleranceMinutes: 0,
      },
      {
        id: "future",
        siteId: "s",
        guardId: "g",
        startAt: "2026-10-10T12:00:00Z",
        events: [],
        toleranceMinutes: 0,
      },
    ],
  };
  const live = compute(base, "", now, { historical: false });
  assert.deepEqual(
    live.plans.map((p) => p.id),
    ["future"],
  );
  assert.equal(live.pending.length, 0);
});
test("Perfil de cuenta desconocido no se presenta como entrada válida para cobertura", () => {
  const row = serviceCoverage(
    [sites[0]],
    [shift("x", "g", { accountActive: null })],
    [target],
    now,
  )[0];
  assert.equal(row.validGuards, 0);
  assert.equal(row.review, 1);
  assert.equal(row.missing, 3);
});
