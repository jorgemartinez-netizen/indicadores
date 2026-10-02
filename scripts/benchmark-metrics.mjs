// Benchmark sintético, no consulta ni representa datos reales.
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { compute } from "../src/metrics.mjs";
const count = Number(process.argv[2] || 1000);
if (!Number.isInteger(count) || count < 1 || count > 100000)
  throw new Error("Usa entre 1 y 100000 turnos.");
const data = {
  sites: [{ id: "synthetic", active: true }],
  guards: [],
  onDuty: [],
  schedules: [],
  range: { from: "2026-09-03", to: "2026-10-02" },
  shifts: Array.from({ length: count }, (_, i) => ({
    id: String(i),
    siteId: "synthetic",
    startTime: new Date(
      Date.parse("2026-09-03T12:00Z") + (i % 30) * 86400000,
    ).toISOString(),
    status: "completed",
    workedHours: 8,
    flags: [],
  })),
};
const start = performance.now();
const result = compute(data);
const ms = performance.now() - start;
assert.equal(result.hours, count * 8);
assert.equal(
  result.timeline.reduce((sum, row) => sum + row.turns, 0),
  count,
);
console.log(
  JSON.stringify({
    classification: "synthetic-benchmark",
    records: count,
    days: 30,
    milliseconds: Math.round(ms * 100) / 100,
    hours: result.hours,
  }),
);
