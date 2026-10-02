import { authenticate } from "./lib/auth.mjs";
import { settings, dateRange } from "./lib/guardian.mjs";
import { snapshot, currentRange } from "./lib/snapshot.mjs";
import { store, allSchedules } from "./lib/store.mjs";
import { coverageRows } from "./lib/coverage.mjs";
import { json, fail, HttpError } from "./lib/http.mjs";
export default async function handler(request) {
  try {
    if (request.method !== "GET")
      throw new HttpError(405, "Método no permitido.");
    await authenticate(request);
    settings();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "live";
    if (!["live", "history"].includes(mode))
      throw new HttpError(400, "Vista no válida.");
    const range = mode === "live" ? currentRange() : dateRange(url);
    const data = await snapshot(range, process.env, { mode });
    const sites = new Set(data.sites.map((s) => s.id));
    const schedules = (await allSchedules(store("schedules"))).filter((s) =>
      sites.has(s.siteId),
    );
    const coverage = await coverageRows(store("coverage"), data.sites);
    return json({ ...data, schedules, coverage });
  } catch (error) {
    return fail(error);
  }
}
