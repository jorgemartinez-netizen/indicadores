import { authenticate } from "./lib/auth.mjs";
import { settings } from "./lib/guardian.mjs";
import { catalogs } from "./lib/snapshot.mjs";
import { store, readVersioned } from "./lib/store.mjs";
import { validateCoverage } from "./lib/coverage.mjs";
import { json, fail, HttpError } from "./lib/http.mjs";
export default async function handler(request) {
  try {
    const actor = await authenticate(request);
    settings();
    if (request.method !== "PUT")
      throw new HttpError(405, "Método no permitido.");
    const text = await request.text();
    if (text.length > 2048)
      throw new HttpError(400, "Solicitud demasiado grande.");
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Solicitud inválida.");
    }
    const data = await catalogs();
    const target = validateCoverage(body, data.sites);
    const db = store("coverage"),
      key = `site/${encodeURIComponent(target.siteId)}`,
      existing = await readVersioned(db, key);
    if ((existing && body.etag !== existing.etag) || (!existing && body.etag))
      throw new HttpError(
        409,
        "Otro supervisor cambió la dotación. Actualiza antes de guardar.",
      );
    const value = {
      ...target,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.uid,
    };
    const result = await db.setJSON(
      key,
      value,
      existing ? { onlyIfMatch: existing.etag } : { onlyIfNew: true },
    );
    if (!result.modified)
      throw new HttpError(
        409,
        "La dotación cambió mientras guardabas. Actualiza e intenta otra vez.",
      );
    return json({ data: { ...value, etag: result.etag } });
  } catch (error) {
    return fail(error);
  }
}
