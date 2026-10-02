import { randomUUID, createHash } from "node:crypto";
import { authenticate } from "./lib/auth.mjs";
import { settings } from "./lib/guardian.mjs";
import { catalogs } from "./lib/snapshot.mjs";
import { store, allSchedules, readVersioned, withLease } from "./lib/store.mjs";
import { validatePlan, validateEvent } from "./lib/planning.mjs";
import { json, fail, HttpError } from "./lib/http.mjs";
export default async function handler(request) {
  try {
    const actor = await authenticate(request);
    settings();
    if (!["POST", "PATCH", "DELETE"].includes(request.method))
      throw new HttpError(405, "Método no permitido.");
    const text = await request.text();
    if (text.length > 8192)
      throw new HttpError(400, "Solicitud demasiado grande.");
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Solicitud inválida.");
    }
    const data = await catalogs();
    const db = store("schedules");
    if (request.method === "POST") {
      const plan = validatePlan(body, data.sites, data.guards);
      return await withLease(
        db,
        `creation/${createHash("sha256").update(plan.guardId).digest("hex")}`,
        async () => {
          const existing = await allSchedules(db);
          // No adivinar qué entrada pertenece a qué programación si se solapan.
          if (
            existing.some(
              (s) =>
                s.guardId === plan.guardId &&
                Math.abs(Date.parse(s.startAt) - Date.parse(plan.startAt)) <
                  4 * 3600000,
            )
          )
            throw new HttpError(
              409,
              "Ya existe una entrada programada cercana para ese guardia. Revisa el calendario.",
            );
          const record = {
            ...plan,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            createdBy: actor.uid,
            events: [],
          };
          await db.setJSON(`shift/${record.id}`, record, { onlyIfNew: true });
          return json({ data: record }, 201);
        },
      );
    }
    if (!/^[0-9a-f-]{36}$/.test(body.id || "") || typeof body.etag !== "string")
      throw new HttpError(400, "Identificador o versión inválidos.");
    const key = `shift/${body.id}`;
    const existing = await readVersioned(db, key);
    if (
      !existing?.data ||
      existing.data.deleted ||
      !data.sites.some((s) => s.id === existing.data.siteId)
    )
      throw new HttpError(404, "Programación inexistente o fuera del alcance.");
    if (existing.etag !== body.etag)
      throw new HttpError(
        409,
        "Otro supervisor actualizó el registro. Actualiza antes de guardar.",
      );
    let value = existing.data;
    if (request.method === "DELETE")
      value = {
        ...value,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: actor.uid,
      };
    else {
      if (value.events.length >= 200)
        throw new HttpError(
          400,
          "El registro alcanzó el límite de seguimientos.",
        );
      const event = {
        ...validateEvent(body, value, data.guards),
        id: randomUUID(),
        recordedBy: actor.uid,
      };
      value = { ...value, events: [...value.events, event] };
    }
    const result = await db.setJSON(key, value, { onlyIfMatch: body.etag });
    if (!result.modified)
      throw new HttpError(
        409,
        "El registro cambió mientras guardabas. Actualiza e intenta otra vez.",
      );
    return json({ data: { ...value, etag: result.etag } });
  } catch (error) {
    return fail(error);
  }
}
