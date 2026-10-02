import { readVersioned } from "./store.mjs";
import { HttpError } from "./http.mjs";
export function validateCoverage(body, sites, now = Date.now()) {
  if (!body || !sites.some((s) => s.id === body.siteId && s.active))
    throw new HttpError(400, "Selecciona un servicio activo autorizado.");
  if (
    !Number.isInteger(body.requiredGuards) ||
    body.requiredGuards < 0 ||
    body.requiredGuards > 500
  )
    throw new HttpError(400, "Indica entre 0 y 500 guardias requeridos.");
  const until = Date.parse(body.validUntil);
  if (
    typeof body.validUntil !== "string" ||
    !/Z$|[+-]\d{2}:\d{2}$/.test(body.validUntil) ||
    !Number.isFinite(until) ||
    until <= now ||
    until > now + 7 * 86400000
  )
    throw new HttpError(400, "La dotación debe vencer en los próximos 7 días.");
  return {
    siteId: body.siteId,
    requiredGuards: body.requiredGuards,
    validUntil: new Date(until).toISOString(),
  };
}
export async function coverageRows(db, sites) {
  const rows = [];
  // Acotar concurrencia y leer exclusivamente servicios del alcance actual.
  for (let i = 0; i < sites.length; i += 12) {
    const values = await Promise.all(
      sites.slice(i, i + 12).map(async (site) => {
        const value = await readVersioned(
          db,
          `site/${encodeURIComponent(site.id)}`,
        );
        return value?.data ? { ...value.data, etag: value.etag } : null;
      }),
    );
    rows.push(...values.filter(Boolean));
  }
  return rows;
}
