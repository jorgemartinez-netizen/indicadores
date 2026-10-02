import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Clock3,
  UsersRound,
  ChartNoAxesCombined,
  Building2,
  History,
  Settings,
  Bell,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  CircleAlert,
  Check,
  Plus,
  X,
  Phone,
  ChevronRight,
  LockKeyhole,
  CalendarClock,
  Download,
  Info,
  CheckCheck,
} from "lucide-react";
const TurnTrend = lazy(() =>
  import("./Charts.jsx").then((module) => ({ default: module.TurnTrend })),
);
const ServiceChart = lazy(() =>
  import("./Charts.jsx").then((module) => ({ default: module.ServiceChart })),
);
import { api } from "./api.mjs";
import {
  compute,
  dateDefaults,
  dayKey,
  planState,
  latest,
  localDateTime,
  mexicoInput,
} from "./metrics.mjs";
const tabs = [
  { id: "summary", label: "Resumen", icon: LayoutDashboard },
  { id: "anticipation", label: "Anticipación", icon: Clock3 },
  { id: "operation", label: "Operación diaria", icon: UsersRound },
  { id: "indicators", label: "Indicadores", icon: ChartNoAxesCombined },
  { id: "sites", label: "Servicios", icon: Building2 },
  { id: "history", label: "Historial", icon: History },
  { id: "settings", label: "Configuración", icon: Settings },
];
const flagLabels = {
  invalid_start: "Entrada inválida",
  invalid_end: "Salida inválida",
  end_before_start: "Salida anterior a entrada",
  future_start: "Entrada futura",
  missing_end: "Sin salida válida",
  open_with_end: "Abierto con salida",
  long_open_shift: "Más de 26 horas",
  missing_guard_profile: "Sin perfil de guardia",
  multiple_open_shifts: "Múltiples turnos abiertos",
};
const numbers = [0, 1].map(
  (digits) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: digits }),
);
const fmt = (value, digits = 0) =>
  value === null || value === undefined ? "—" : numbers[digits].format(value);
const percent = (v) => (v === null || v === undefined ? "—" : `${fmt(v, 1)}%`);
const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const date = (v) =>
  v && Number.isFinite(new Date(v).getTime())
    ? dateFormatter.format(new Date(v))
    : "—";
const time = (v) =>
  v && Number.isFinite(new Date(v).getTime())
    ? timeFormatter.format(new Date(v))
    : "—";
function Empty({
  children = "No hay registros para esta selección.",
  icon: Icon = CalendarClock,
}) {
  return (
    <div className="empty">
      <Icon size={29} />
      <p>{children}</p>
    </div>
  );
}
function Badge({ tone = "muted", children }) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Card({ title, value, detail, icon: Icon, tone = "amber", ring }) {
  return (
    <div className={`metric ${tone}`}>
      <div
        className={ring ? "ring" : "metric-icon"}
        style={
          ring
            ? {
                "--progress": `${Number.isFinite(parseFloat(value)) ? Math.min(100, Math.max(0, parseFloat(value))) * 3.6 : 0}deg`,
              }
            : undefined
        }
      >
        {ring ? <span>{value}</span> : <Icon size={23} />}
      </div>
      <div className="metric-text">
        <span>{title}</span>
        {!ring && <strong>{value}</strong>}
        <small>{detail}</small>
      </div>
    </div>
  );
}
function Panel({
  title,
  icon: Icon = LayoutDashboard,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-title">
        <h2>
          <Icon size={21} />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
function Login({ onLogin }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("session", {
        method: "POST",
        body: JSON.stringify({ password: value }),
      });
      setValue("");
      onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-copy">
        <div className="brand">
          <ShieldCheck />
          <span>
            Guardian<b>Check</b>
          </span>
        </div>
        <span className="eyebrow">CONTROL DE OPERACIÓN</span>
        <h1>
          Anticipa.
          <br />
          Coordina.
          <br />
          <em>Asegura el relevo.</em>
        </h1>
        <p>
          Asistencia y seguimiento para actuar a tiempo, con los datos de tu
          operación.
        </p>
        <div className="login-features">
          <span>
            <Clock3 />
            Anticipación
          </span>
          <span>
            <UsersRound />
            Operación diaria
          </span>
          <span>
            <ChartNoAxesCombined />
            Indicadores
          </span>
        </div>
      </div>
      <div className="login-box">
        <LockKeyhole size={32} />
        <h2>Acceso al panel</h2>
        <p>Ingresa la contraseña de supervisión.</p>
        <form onSubmit={submit}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={1024}
            placeholder="Tu contraseña de acceso"
          />
          {error && (
            <div className="notice red" role="alert">
              {error}
            </div>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Verificando…" : "Entrar al panel"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <small>
          La credencial de GuardianCheck se configura en el servidor y nunca se
          solicita en esta pantalla.
        </small>
      </div>
    </main>
  );
}
export default function App() {
  const [session, setSession] = useState("checking");
  const [tab, setTab] = useState("summary");
  const [range, setRange] = useState(dateDefaults());
  const [site, setSite] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const loading = useRef(false);
  const retryAt = useRef(0);
  const generation = useRef(0);
  const historyMode = tab === "indicators" || tab === "history";
  const query = historyMode
    ? new URLSearchParams({ mode: "history", ...range }).toString()
    : "mode=live";
  const requestQuery = useRef(query);
  requestQuery.current = query;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    api("session")
      .then(() => setSession("ok"))
      .catch(() => setSession("login"));
  }, []);
  async function load() {
    if (loading.current || Date.now() < retryAt.current) return;
    loading.current = true;
    setBusy(true);
    const g = ++generation.current;
    try {
      const result = await api(`dashboard?${requestQuery.current}`);
      if (g === generation.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (g === generation.current) {
        if (e.status === 401) {
          setSession("login");
          setData(null);
        }
        setError(e.message);
        retryAt.current = Date.now() + Math.max(10, e.retryAfter) * 1000;
      }
    } finally {
      loading.current = false;
      setBusy(false);
      if (g !== generation.current && sessionRef.current === "ok")
        queueMicrotask(load);
    }
  }
  useEffect(() => {
    if (session !== "ok") return;
    generation.current++;
    setData(null);
    setError("");
    retryAt.current = 0;
    load();
    const t = setInterval(
      () => {
        if (!document.hidden) load();
      },
      historyMode ? 300000 : 60000,
    );
    const visibility = () => {
      if (!document.hidden) {
        setNow(Date.now());
        load();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", visibility);
      generation.current++;
    };
  }, [session, query]);
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setPage(0);
  }, [site, search, historyStatus, tab, range]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const liveMetrics = useMemo(
    () => (data ? compute(data, site, now, { historical: false }) : null),
    [data, site, now],
  );
  const historicalMetrics = useMemo(
    () => (data && historyMode ? compute(data, site, Date.now()) : null),
    [data, site, historyMode],
  );
  const m = useMemo(
    () => (liveMetrics ? { ...historicalMetrics, ...liveMetrics } : null),
    [liveMetrics, historicalMetrics],
  );
  const guards = useMemo(
    () => new Map((data?.guards || []).map((g) => [g.id, g])),
    [data],
  );
  const sites = useMemo(
    () => new Map((data?.sites || []).map((s) => [s.id, s])),
    [data],
  );
  const serviceChartData = useMemo(() => {
    if (!historicalMetrics) return [];
    const counts = new Map();
    for (const t of historicalMetrics.shifts)
      counts.set(t.siteId, (counts.get(t.siteId) || 0) + 1);
    return historicalMetrics.sites.map((s) => ({
      name: s.name || s.id,
      turns: counts.get(s.id) || 0,
    }));
  }, [historicalMetrics]);
  const siteName = (id) => sites.get(id)?.name || "Servicio sin nombre";
  const guardName = (id) => guards.get(id)?.name || "Guardia sin perfil";
  const planName = (p) => guardName(p.guardId);
  async function logout() {
    try {
      await api("session", { method: "DELETE" });
      setData(null);
      setSession("login");
    } catch (e) {
      setToast(e.message);
    }
  }
  function afterSave() {
    setModal(null);
    setToast("Cambios guardados.");
    retryAt.current = 0;
    load();
  }
  const freshness =
    data?.sourceTimes
      ?.filter((v) => Number.isFinite(Date.parse(v)))
      .map((v) => Date.parse(v)) || [];
  const oldest = freshness.length ? Math.min(...freshness) : null;
  const stale =
    !!data &&
    (!!error ||
      oldest === null ||
      now - oldest > (historyMode ? 600000 : 180000));
  const upcoming = m
    ? [...m.next, ...m.pending].sort(
        (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt),
      )
    : [];
  const events = useMemo(
    () =>
      m
        ? m.plans
            .flatMap((p) => (p.events || []).map((e) => ({ ...e, plan: p })))
            .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        : [],
    [data, site],
  );
  const filteredHistory = useMemo(
    () =>
      tab === "history"
        ? (m?.shifts || [])
            .filter(
              (s) =>
                (historyStatus === "all" ||
                  (historyStatus === "flagged"
                    ? s.flags?.length
                    : s.status === historyStatus)) &&
                (!search ||
                  `${s.guardName || ""} ${s.siteName || ""} ${s.id}`
                    .toLowerCase()
                    .includes(search.toLowerCase())),
            )
            .sort(
              (a, b) =>
                Date.parse(b.startTime || 0) - Date.parse(a.startTime || 0),
            )
        : [],
    [data, site, historyStatus, search, tab],
  );
  if (session === "checking")
    return (
      <div className="boot">
        <ShieldCheck />
        <span>GuardianCheck</span>
        <small>Comprobando acceso…</small>
      </div>
    );
  if (session === "login") return <Login onLogin={() => setSession("ok")} />;
  const topCards = (
    <div className="metrics live-metrics">
      <Card
        title="Guardias con turno abierto"
        value={m ? fmt(m.guardCount) : "—"}
        detail="Personas distintas · registro actual"
        icon={UsersRound}
        tone="green"
      />
      <Card
        title="Puestos sin entrada válida"
        value={m?.configuredSites ? fmt(m.missingPosts) : "—"}
        detail={
          m?.configuredSites
            ? `${m.deficientSites} servicios con faltantes · dotación definida`
            : "Define la dotación de cada servicio"
        }
        icon={ShieldCheck}
        tone="red"
      />
      <Card
        title="Servicios sin turnos abiertos"
        value={m ? fmt(m.emptySites) : "—"}
        detail="Servicios activos para verificar"
        icon={Building2}
      />
      <Card
        title="Turnos por revisar"
        value={m ? fmt(m.reviewCount) : "—"}
        detail={
          m
            ? `${m.longOpen} de más de 26 horas`
            : "Registros con avisos o inconsistencias"
        }
        icon={CircleAlert}
        tone="red"
      />
    </div>
  );
  const anticipationCards = (
    <div className="metrics">
      <Card
        title="Preparación del próximo turno"
        value={percent(m?.readiness)}
        detail={
          m?.next.length
            ? `${m.ready} de ${m.next.length} puestos asegurados`
            : "Sin entradas programadas · próximos 60 min"
        }
        icon={CheckCheck}
        ring
      />
      <Card
        title="Próximos puestos por asegurar"
        value={m?.next.length ? fmt(m.unsecured) : "—"}
        detail="Entradas en los próximos 60 minutos"
        icon={ShieldCheck}
      />
      <Card
        title="Entradas pendientes de verificar"
        value={m ? fmt(m.pending.length) : "—"}
        detail="Programadas en las últimas 12 horas"
        icon={Clock3}
        tone="red"
      />
      <Card
        title="Próximas entradas"
        value={m ? fmt(m.next.length) : "—"}
        detail="Programación de los próximos 60 minutos"
        icon={CalendarClock}
      />
    </div>
  );
  function coveragePanel(compact = false) {
    const rows = m?.coverage.filter((r) => r.site.active) || [];
    const visible = compact
      ? rows.slice(0, 4)
      : rows.slice(page * 20, (page + 1) * 20);
    return (
      <Panel
        title="Cobertura por servicio · ahora"
        icon={Building2}
        action={
          compact ? (
            <button className="text-button" onClick={() => setTab("sites")}>
              Ver todos
              <ChevronRight size={15} />
            </button>
          ) : (
            <span className="scope">{rows.length} servicios activos</span>
          )
        }
      >
        <p className="coverage-explanation">
          Compara la dotación de este turno con las entradas abiertas válidas.
          Confirma en sitio si hay un faltante.
        </p>
        {visible.length ? (
          <div className="coverage-list">
            {visible.map((row) => (
              <article
                className={`coverage-item ${row.tone}`}
                key={row.site.id}
              >
                <div className="coverage-heading">
                  <strong>{row.site.name || row.site.id}</strong>
                  <Badge tone={row.tone}>{row.status}</Badge>
                </div>
                <div className="coverage-values">
                  <span>
                    <b>{row.validGuards}</b> con entrada válida
                  </span>
                  <span>
                    <b>{row.required === null ? "—" : row.required}</b>{" "}
                    requeridos
                  </span>
                  <span className={row.missing > 0 ? "red-text" : ""}>
                    <b>{row.missing === null ? "—" : row.missing}</b> pendientes
                  </span>
                </div>
                <div className="coverage-actions">
                  <small>
                    {row.review
                      ? `${row.review} registros por verificar · `
                      : ""}
                    {row.target
                      ? `${row.expired ? "Dotación venció" : "Vigente hasta"} ${date(row.target.validUntil)}`
                      : "Define cuántos guardias requiere este turno."}
                  </small>
                  <div>
                    <button
                      className="text-button"
                      aria-label={`Ver turnos de ${row.site.name || row.site.id}`}
                      onClick={() => {
                        setSite(row.site.id);
                        setTab("operation");
                      }}
                    >
                      Ver turnos
                      <ChevronRight size={14} />
                    </button>
                    <button
                      className="outline compact"
                      disabled={!data || stale}
                      aria-label={`Definir dotación de ${row.site.name || row.site.id}`}
                      onClick={() => setModal({ type: "coverage", row })}
                    >
                      Definir dotación
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty>
            No hay servicios activos disponibles para esta selección.
          </Empty>
        )}
        {!compact && rows.length > 20 && (
          <div className="pagination">
            <span>
              Página {page + 1} de {Math.ceil(rows.length / 20)}
            </span>
            <div>
              <button
                className="outline compact"
                disabled={!page}
                onClick={() => setPage((v) => v - 1)}
              >
                Anterior
              </button>
              <button
                className="outline compact"
                disabled={(page + 1) * 20 >= rows.length}
                onClick={() => setPage((v) => v + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
        {compact && rows.length > 4 && (
          <button className="text-button" onClick={() => setTab("sites")}>
            Ver los {rows.length} servicios
          </button>
        )}
      </Panel>
    );
  }
  function plansTable(plans) {
    return plans.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Servicio / guardia</th>
              <th>Entrada</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Seguimiento</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const status = planState(p, m.matched.get(p.id), now);
              const answer = latest(p, ["late"]);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{siteName(p.siteId)}</strong>
                    <small>{planName(p)}</small>
                  </td>
                  <td>{date(p.startAt)}</td>
                  <td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {status.label === "Retraso anunciado" && (
                      <small>Estimada: {time(answer?.eta)}</small>
                    )}
                  </td>
                  <td>{p.responsible}</td>
                  <td>
                    <button
                      className="outline compact"
                      disabled={stale}
                      onClick={() => setModal({ type: "follow", plan: p })}
                    >
                      <Phone size={14} />
                      Registrar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty>
        Sin entradas programadas para esta vista. Añade la programación para
        anticipar faltas y retardos.
      </Empty>
    );
  }
  const analytics = (
    <Panel
      title="Indicadores de anticipación"
      icon={ChartNoAxesCombined}
      action={<span className="scope">Periodo seleccionado</span>}
    >
      <div className="mini-metrics">
        <div>
          <small>Incidencias sin aviso oportuno</small>
          <strong className="red-text">{percent(m?.noticeRate)}</strong>
          <span>
            {m
              ? `${m.withoutNotice} de ${m.incidents} incidencias verificadas`
              : "Sin datos"}
          </span>
        </div>
        <div>
          <small>Anticipación mediana del aviso</small>
          <strong className="blue-text">
            {m?.median != null ? `${fmt(m.median)} min` : "—"}
          </strong>
          <span>
            {m ? `${m.leadCount} avisos anteriores a la entrada` : "Sin datos"}
          </span>
        </div>
        <div>
          <small>Riesgos resueltos antes de la entrada</small>
          <strong className="green-text">{percent(m?.resolvedRate)}</strong>
          <span>
            {m
              ? `${m.resolved} de ${m.riskCount} puestos en riesgo`
              : "Sin datos"}
          </span>
        </div>
      </div>
      {!m?.historicalCount && (
        <div className="notice muted">
          <Info size={17} />
          Estos indicadores requieren programación y seguimientos registrados.
          No se infieren ausencias de la falta de una entrada.
        </div>
      )}
      <details className="definitions">
        <summary>Cómo se calculan</summary>
        <p>
          Incidencias: entrada posterior a la tolerancia o ausencia verificada
          manualmente. Aviso oportuno: retraso o ausencia comunicado y
          registrado al menos 30 minutos antes. La mediana usa el primer aviso
          de cada turno. Riesgo: puesto sin asegurar 30 minutos antes;
          resolución: entrada o relevo confirmado antes del inicio. Las
          coincidencias de entrada usan guardia, servicio y proximidad horaria
          (−4 a +12 h), una entrada por programación; revisa situaciones
          ambiguas.
        </p>
        <p>
          Solo se mide la programación registrada aquí. Para el indicador de
          resolución se incluyen entradas programadas al menos 30 minutos antes.
          La hora del aviso es la hora de registro en el panel, no la de un
          mensaje externo. La preparación incluye llegadas confirmadas, llegadas
          estimadas dentro de tolerancia y relevos confirmados.
        </p>
      </details>
    </Panel>
  );
  function turnTable(rows) {
    return rows.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Guardia / servicio</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Horas</th>
              <th>Estado / revisión</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.guardName || guardName(s.guardId)}</strong>
                  <small>{s.siteName || siteName(s.siteId)}</small>
                </td>
                <td>{date(s.startTime)}</td>
                <td>{date(s.endTime)}</td>
                <td>
                  {fmt(s.elapsedHours ?? s.workedHours, 1)}
                  {s.elapsedHours != null && <small>transcurridas</small>}
                </td>
                <td>
                  <Badge
                    tone={
                      s.flags?.length
                        ? "red"
                        : s.status === "active"
                          ? "green"
                          : "muted"
                    }
                  >
                    {s.status === "active"
                      ? "Abierto"
                      : s.status === "completed"
                        ? "Cerrado"
                        : s.status || "Sin estado"}
                  </Badge>
                  {s.flags?.length > 0 && (
                    <small className="red-text">
                      {s.flags.map((f) => flagLabels[f] || f).join(" · ")}
                    </small>
                  )}
                  {s.accountActive === false && (
                    <small className="red-text">Cuenta desactivada</small>
                  )}
                  {s.isDouble && (
                    <small>
                      Doblete ·{" "}
                      {s.doubleAuthStatus || "Sin estado de autorización"}
                    </small>
                  )}
                  {s.closedByAdmin && <small>Cierre administrativo</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty />
    );
  }
  function trend() {
    return (
      <Panel title="Turnos registrados por día" icon={ChartNoAxesCombined}>
        <p className="footnote">
          Cohortes por fecha de entrada, hora de Ciudad de México. Registros con
          inicio inválido no se ubican en la gráfica.
        </p>
        {m?.shifts.length ? (
          <Suspense fallback={<Empty>Cargando gráfica…</Empty>}>
            <TurnTrend data={m.timeline} />
          </Suspense>
        ) : (
          <Empty>
            No hay registros históricos para graficar en este periodo.
          </Empty>
        )}
      </Panel>
    );
  }
  function exportCSV() {
    const rows = [
      [
        "id",
        "guardia",
        "servicio",
        "entrada_utc",
        "salida_utc",
        "estado",
        "horas_registradas",
        "flags",
      ],
      ...filteredHistory.map((s) => [
        s.id,
        s.guardName,
        s.siteName,
        s.startTime,
        s.endTime,
        s.status,
        s.workedHours,
        s.flags?.join("|"),
      ]),
    ];
    const cell = (v) => {
      let text = String(v ?? "");
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const a = document.createElement("a");
    const u = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    a.href = u;
    a.download = `guardiancheck-${range.from}-${range.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck />
          <span>
            Guardian<b>Check</b>
            <small>Control de operación</small>
          </span>
        </div>
        <nav aria-label="Navegación principal">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <ShieldCheck size={18} />
            <span>
              Datos de tu operación<small>Lectura de GuardianCheck</small>
            </span>
          </div>
          <button onClick={logout}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <i className={`status-dot ${data && !stale ? "green" : "amber"}`} />
            {busy
              ? "Actualizando…"
              : data
                ? stale
                  ? "Datos pendientes de actualizar"
                  : "API conectada"
                : "Pendiente de conexión"}
          </span>
          <div>
            <span className="timezone">Ciudad de México · UTC−6</span>
            <button
              className="icon-button"
              aria-label="Ver seguimiento"
              onClick={() => setTab("anticipation")}
            >
              <Bell size={19} />
              {m?.unsecured > 0 && <i />}
            </button>
            <div className="avatar">SU</div>
            <span className="user-label">
              Supervisión<small>Acceso autorizado</small>
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">GUARDIANCHECK</span>
              <h1>
                {tab === "summary"
                  ? "Control de operación"
                  : tabs.find((t) => t.id === tab)?.label}
              </h1>
              <p>
                {tab === "summary"
                  ? "Anticipación, asistencia y seguimiento en un solo lugar."
                  : tab === "anticipation"
                    ? "Confirma la llegada y prepara el relevo antes de la entrada."
                    : tab === "operation"
                      ? "Consulta los turnos abiertos y los registros que requieren revisión."
                      : tab === "indicators"
                        ? "Evalúa la asistencia registrada y la oportunidad de los avisos."
                        : tab === "history"
                          ? "Entradas y salidas dentro del periodo seleccionado."
                          : tab === "sites"
                            ? "Presencia registrada por servicio autorizado."
                            : "Conexión, permisos y definiciones del panel."}
              </p>
            </div>
            <button
              className="outline"
              onClick={() => {
                retryAt.current = 0;
                load();
              }}
              disabled={busy || Date.now() < retryAt.current}
            >
              <RefreshCw size={16} className={busy ? "spin" : ""} />
              {busy ? "Actualizando" : "Actualizar"}
            </button>
          </div>
          {tab !== "settings" && (
            <div className="filters">
              <label>
                Servicio
                <select
                  aria-label="Servicio"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                >
                  <option value="">Todos los autorizados</option>
                  {data?.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.id}
                      {s.active ? "" : " · inactivo"}
                    </option>
                  ))}
                </select>
              </label>
              {historyMode && (
                <>
                  <label>
                    Desde
                    <input
                      aria-label="Desde"
                      type="date"
                      value={range.from}
                      max={range.to}
                      disabled={busy}
                      onChange={(e) =>
                        setRange((r) => ({ ...r, from: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      aria-label="Hasta"
                      type="date"
                      value={range.to}
                      min={range.from}
                      max={dayKey(now)}
                      disabled={busy}
                      onChange={(e) =>
                        setRange((r) => ({ ...r, to: e.target.value }))
                      }
                    />
                  </label>
                </>
              )}
              {!historyMode && (
                <div className="live-label">
                  <i className="status-dot green" />
                  <span>
                    Estado actual<small>{date(now)} · Ciudad de México</small>
                  </span>
                </div>
              )}
              <span className="filter-note">
                {oldest ? `Datos desde ${date(oldest)}` : "Sin datos cargados"}
                <small>
                  {historyMode
                    ? "Historial · refresco cada 5 min"
                    : "Refresco cada 60 s con el panel abierto"}
                </small>
              </span>
            </div>
          )}
          {error && (
            <div className="notice red" role="alert">
              <CircleAlert size={18} />
              <span>
                {error}
                {data && (
                  <small>
                    Se conservan los últimos datos recibidos; no representan el
                    estado actual.
                  </small>
                )}
              </span>
              <button
                className="text-button"
                onClick={() => setTab("settings")}
              >
                Ver configuración
              </button>
            </div>
          )}
          {!data && !busy && !error && (
            <div className="notice muted">
              <Info size={18} />
              Esperando una consulta completa a GuardianCheck.
            </div>
          )}
          {stale && !error && (
            <div className="notice amber">
              <Clock3 size={17} />
              Los datos tienen más de {historyMode ? "10" : "3"} minutos o no
              incluyen fecha de generación. Actualiza antes de tomar decisiones.
            </div>
          )}
          {(tab === "summary" || tab === "sites") && topCards}
          {tab === "anticipation" && anticipationCards}
          {tab === "summary" && (
            <>
              {coveragePanel(true)}
              <div className="main-grid">
                <Panel
                  title="Anticipación · próximos 60 minutos"
                  icon={Clock3}
                  action={
                    <button
                      className="text-button"
                      onClick={() => setTab("anticipation")}
                    >
                      Ver programación
                      <ChevronRight size={15} />
                    </button>
                  }
                >
                  {plansTable(upcoming.slice(0, 5))}
                </Panel>
                <Panel title="Atención ahora" icon={CircleAlert}>
                  <div className="live-alerts">
                    <button onClick={() => setTab("sites")}>
                      <ShieldCheck />
                      <span>
                        <strong>
                          {m ? fmt(m.deficientSites) : "—"} servicios con
                          puestos pendientes
                        </strong>
                        <small>Según la dotación vigente definida.</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setTab("operation")}>
                      <Clock3 />
                      <span>
                        <strong>
                          {m ? fmt(m.longOpen) : "—"} turnos de más de 26 horas
                        </strong>
                        <small>Verifica salida o necesidad de relevo.</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setTab("anticipation")}>
                      <Phone />
                      <span>
                        <strong>
                          {m ? fmt(m.pending.length) : "—"} entradas pendientes
                          de verificar
                        </strong>
                        <small>Confirma llegada o registra seguimiento.</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <p className="footnote">
                    Los registros abiertos no prueban presencia física. Los
                    avisos externos todavía no están activados.
                  </p>
                </Panel>
              </div>
              <Panel title="Seguimiento reciente" icon={History}>
                {events.slice(0, 4).map((e) => (
                  <button
                    className="event"
                    key={e.id}
                    disabled={stale}
                    onClick={() => setModal({ type: "follow", plan: e.plan })}
                  >
                    <span>{time(e.at)}</span>
                    <div>
                      <strong>
                        {eventLabel(e.kind)} · {siteName(e.plan.siteId)}
                      </strong>
                      <small>
                        {guardName(e.plan.guardId)}
                        {e.note ? ` · ${e.note}` : ""}
                      </small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {!events.length && (
                  <Empty>No hay seguimientos registrados.</Empty>
                )}
              </Panel>
            </>
          )}
          {tab === "anticipation" && (
            <>
              <Panel
                title="Programación y seguimiento"
                icon={CalendarClock}
                action={
                  <button
                    className="primary compact"
                    disabled={!data || stale}
                    onClick={() => setModal({ type: "plan" })}
                  >
                    <Plus size={16} />
                    Programar entrada
                  </button>
                }
              >
                <div className="notice muted">
                  <Info size={17} />
                  Registra aquí los turnos esperados y los avisos recibidos.
                  “Contactar” registra seguimiento; no envía mensajes
                  automáticamente.
                </div>
                {plansTable(upcoming.slice(0, 50))}
                {upcoming.length > 50 && (
                  <p className="footnote">
                    Se muestran las primeras 50 entradas próximas o pendientes.
                  </p>
                )}
                <details className="definitions">
                  <summary>
                    Ver programación reciente ({m?.plans.length || 0})
                  </summary>
                  {plansTable(
                    (m?.plans || [])
                      .slice()
                      .sort(
                        (a, b) => Date.parse(b.startAt) - Date.parse(a.startAt),
                      )
                      .slice(0, 100),
                  )}
                  {(m?.plans.length || 0) > 100 && (
                    <p className="footnote">
                      Se muestran las 100 entradas más recientes. Selecciona un
                      servicio para acotar la vista.
                    </p>
                  )}
                </details>
              </Panel>
              <button className="outline" onClick={() => setTab("indicators")}>
                Ver indicadores históricos
                <ChartNoAxesCombined size={16} />
              </button>
            </>
          )}
          {tab === "operation" && (
            <>
              <div className="metrics">
                <Card
                  title="Guardias con turno abierto"
                  value={m ? fmt(m.guardCount) : "—"}
                  detail="IDs distintos, sin sumar duplicados"
                  icon={UsersRound}
                  tone="green"
                />
                <Card
                  title="Turnos abiertos"
                  value={m ? fmt(m.onDuty.length) : "—"}
                  detail="Incluye registros duplicados"
                  icon={Clock3}
                />
                <Card
                  title="Turnos >26 horas"
                  value={m ? fmt(m.longOpen) : "—"}
                  detail="Con aviso long_open_shift"
                  icon={CircleAlert}
                  tone="red"
                />
                <Card
                  title="Cuentas desactivadas en turno"
                  value={
                    m
                      ? fmt(
                          m.onDuty.filter((s) => s.accountActive === false)
                            .length,
                        )
                      : "—"
                  }
                  detail="Registros abiertos para revisar"
                  icon={ShieldCheck}
                  tone="red"
                />
              </div>
              <Panel title="Turnos abiertos" icon={UsersRound}>
                <p className="footnote">
                  Esta vista refleja el estado consultado ahora; no está
                  limitada por el filtro histórico de fechas.
                </p>
                {turnTable((m?.onDuty || []).slice(page * 25, (page + 1) * 25))}
                <div className="pagination">
                  <span>
                    {m?.onDuty.length || 0} registros · página {page + 1}
                  </span>
                  <div>
                    <button
                      className="outline compact"
                      disabled={!page}
                      onClick={() => setPage((v) => v - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      className="outline compact"
                      disabled={(page + 1) * 25 >= (m?.onDuty.length || 0)}
                      onClick={() => setPage((v) => v + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </Panel>
              {m?.unknownGuards > 0 && (
                <div className="notice amber">
                  {m.unknownGuards} registros no tienen identificación de
                  guardia y no se cuentan como personas distintas.
                </div>
              )}
            </>
          )}
          {tab === "indicators" && (
            <>
              <div className="metrics">
                <Card
                  title="Horas registradas"
                  value={m ? fmt(m.hours, 1) : "—"}
                  detail={`${m?.hoursCount || 0} turnos cerrados con fechas válidas`}
                  icon={Clock3}
                  tone="green"
                />
                <Card
                  title="Turnos con inconsistencias"
                  value={percent(m?.flagRate)}
                  detail={
                    m
                      ? `${m.flagged} de ${m.shifts.length} registros`
                      : "Sin datos"
                  }
                  icon={CircleAlert}
                  tone="red"
                />
                <Card
                  title="Dobletes registrados"
                  value={m ? fmt(m.doubles) : "—"}
                  detail="No implica autorización de pago"
                  icon={UsersRound}
                />
                <Card
                  title="Cierres administrativos"
                  value={m ? fmt(m.adminClosed) : "—"}
                  detail="Dentro del periodo seleccionado"
                  icon={ShieldCheck}
                />
              </div>
              <div className="notice muted">
                <Info size={17} />
                Las horas se agrupan por la fecha de entrada del turno. No son
                horas aprobadas de nómina ni horas recortadas al intervalo
                seleccionado.
              </div>
              {analytics}
              {trend()}
              <Panel title="Turnos por servicio" icon={Building2}>
                {m?.shifts.length ? (
                  <Suspense fallback={<Empty>Cargando gráfica…</Empty>}>
                    <ServiceChart data={serviceChartData} />
                  </Suspense>
                ) : (
                  <Empty />
                )}
              </Panel>
            </>
          )}
          {tab === "sites" && coveragePanel()}
          {tab === "history" && (
            <Panel
              title="Historial de turnos"
              icon={History}
              action={
                <button
                  className="outline compact"
                  disabled={!data || !filteredHistory.length}
                  onClick={exportCSV}
                >
                  <Download size={15} />
                  Exportar selección
                </button>
              }
            >
              <div className="table-controls">
                <input
                  aria-label="Buscar turno"
                  placeholder="Buscar guardia, servicio o ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Estado del turno"
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Abiertos</option>
                  <option value="completed">Cerrados</option>
                  <option value="flagged">Con inconsistencias</option>
                </select>
              </div>
              {turnTable(filteredHistory.slice(page * 25, (page + 1) * 25))}
              <div className="pagination">
                <span>
                  {filteredHistory.length} registros · página {page + 1} de{" "}
                  {Math.max(1, Math.ceil(filteredHistory.length / 25))}
                </span>
                <div>
                  <button
                    className="outline compact"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="outline compact"
                    disabled={(page + 1) * 25 >= filteredHistory.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </Panel>
          )}
          {tab === "settings" && (
            <>
              <Panel title="Estado de la conexión" icon={Settings}>
                <div className="config-lines">
                  <div>
                    <span>GuardianCheck</span>
                    <Badge tone={data && !error ? "green" : "amber"}>
                      {data && !error
                        ? "Datos recibidos"
                        : "Pendiente de conexión"}
                    </Badge>
                  </div>
                  <div>
                    <span>Credencial de servidor</span>
                    <strong>Protegida · nunca se muestra aquí</strong>
                  </div>
                  <div>
                    <span>Alcance</span>
                    <strong>Servicios autorizados para esta integración</strong>
                  </div>
                  <div>
                    <span>Actualización</span>
                    <strong>
                      Estado actual cada 60 s · historial cada 5 min
                    </strong>
                  </div>
                  <div>
                    <span>Programación y seguimientos</span>
                    <strong>Netlify Blobs · almacenamiento persistente</strong>
                  </div>
                </div>
                <div className="notice muted">
                  <Info size={17} />
                  En Netlify configura GUARDIAN_API_KEY y PANEL_ACCESS_PASSWORD
                  (mínimo 16 caracteres) con alcance Functions, y vuelve a
                  desplegar. La contraseña del panel es distinta de la
                  credencial de GuardianCheck.
                </div>
                <p className="footnote">
                  Todas las personas con esta contraseña comparten el mismo
                  alcance. Para permisos individuales y auditoría por
                  supervisor, se necesita una siguiente versión con cuentas
                  personales. El panel no verifica presencia física, no modifica
                  GuardianCheck y no envía avisos automáticos fuera de esta
                  pantalla.
                </p>
              </Panel>

              <Panel title="Fuentes y límites" icon={Info}>
                <ul className="source-list">
                  <li>
                    <code>/v1/guards</code> · perfiles, cuentas y asignaciones
                    actuales.
                  </li>
                  <li>
                    <code>/v1/sites</code> · catálogo de servicios autorizados.
                  </li>
                  <li>
                    <code>/v1/on-duty</code> · registros abiertos en la consulta
                    actual.
                  </li>
                  <li>
                    <code>/v1/shifts</code> · historial por entrada; máximo 93
                    días por consulta.
                  </li>
                  <li>
                    Programación y seguimientos · capturados por supervisión en
                    este panel.
                  </li>
                </ul>
                <p className="footnote">
                  No se deduce ausentismo del catálogo de cuentas activas. La
                  puntualidad se compara contra la programación registrada, no
                  contra el horario actual del perfil. La API conserva horas del
                  dispositivo; las páginas no forman una instantánea
                  transaccional.
                </p>
              </Panel>
            </>
          )}
          <footer>
            <ShieldCheck size={15} />
            GuardianCheck · Lectura operativa
            <span>
              Sincronización completa por ID · Horas de Ciudad de México
            </span>
          </footer>
        </main>
      </div>
      {modal?.type === "coverage" && (
        <CoverageModal
          row={modal.row}
          stale={stale}
          onClose={() => setModal(null)}
          onSave={afterSave}
        />
      )}
      {modal && modal.type !== "coverage" && (
        <PlanModal
          modal={modal}
          data={data}
          stale={stale}
          onClose={() => setModal(null)}
          onSave={afterSave}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function eventLabel(kind) {
  return (
    {
      confirmed: "Llegada confirmada",
      late: "Retraso anunciado",
      absent: "Ausencia anunciada",
      contact: "Contacto registrado",
      covered: "Relevo confirmado",
      verified_absent: "Ausencia verificada",
    }[kind] || kind
  );
}
function PlanModal({ modal, data, stale, onClose, onSave }) {
  const p = modal.plan;
  const dialog = useRef(null);
  const previousFocus = useRef(document.activeElement);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("confirmed");
  const [form, setForm] = useState({
    siteId: data.sites.find((s) => s.active)?.id || "",
    guardId: "",
    startAt: localDateTime(Date.now() + 3600000).slice(0, 16),
    toleranceMinutes: 0,
    responsible: "",
    note: "",
    eta: "",
    replacementGuardId: "",
  });
  useEffect(() => {
    dialog.current?.showModal();
    return () => previousFocus.current?.focus?.();
  }, []);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = p
        ? {
            id: p.id,
            etag: p.etag,
            kind,
            note: form.note,
            eta: kind === "late" ? mexicoInput(form.eta) : null,
            replacementGuardId: form.replacementGuardId,
          }
        : {
            ...form,
            startAt: mexicoInput(form.startAt),
            toleranceMinutes: Number(form.toleranceMinutes),
          };
      await api("planning", {
        method: p ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        "¿Retirar esta entrada programada? Dejará de contar en los indicadores; se conserva el registro archivado.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("planning", {
        method: "DELETE",
        body: JSON.stringify({ id: p.id, etag: p.etag }),
      });
      onSave();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="modal-inner">
        <header>
          <div>
            <span className="eyebrow">
              {p ? "SEGUIMIENTO" : "PROGRAMACIÓN"}
            </span>
            <h2>{p ? "Registrar aviso o relevo" : "Programar una entrada"}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </header>
        {p && (
          <div className="plan-detail">
            <strong>{data.sites.find((s) => s.id === p.siteId)?.name}</strong>
            <span>
              {data.guards.find((g) => g.id === p.guardId)?.name ||
                "Guardia sin perfil"}{" "}
              · {date(p.startAt)}
            </span>
            <small>Responsable: {p.responsible}</small>
          </div>
        )}
        <form onSubmit={save}>
          {!p ? (
            <>
              <label>
                Servicio
                <select
                  value={form.siteId}
                  onChange={(e) => set("siteId", e.target.value)}
                  required
                >
                  {data.sites
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.id}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Guardia
                <select
                  aria-label="Guardia"
                  value={form.guardId}
                  onChange={(e) => set("guardId", e.target.value)}
                  required
                >
                  <option value="">Selecciona un guardia</option>
                  {data.guards
                    .filter((g) => g.accountActive)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name || g.id}
                        {g.external ? " · externo" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Entrada · Ciudad de México
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => set("startAt", e.target.value)}
                    required
                  />
                </label>
                <label>
                  Tolerancia en minutos
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={form.toleranceMinutes}
                    onChange={(e) => set("toleranceMinutes", e.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                Responsable de seguimiento
                <input
                  value={form.responsible}
                  onChange={(e) => set("responsible", e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Nombre del supervisor"
                />
              </label>
              <p className="footnote">
                Registra una entrada por puesto esperado. Esta programación no
                modifica los turnos de GuardianCheck.
              </p>
            </>
          ) : (
            <>
              <label>
                Tipo de seguimiento
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {[
                    "confirmed",
                    "late",
                    "absent",
                    "contact",
                    "covered",
                    "verified_absent",
                  ].map((k) => (
                    <option key={k} value={k}>
                      {eventLabel(k)}
                    </option>
                  ))}
                </select>
              </label>
              {kind === "late" && (
                <label>
                  Llegada estimada · Ciudad de México
                  <input
                    type="datetime-local"
                    value={form.eta}
                    onChange={(e) => set("eta", e.target.value)}
                    required
                  />
                </label>
              )}
              {kind === "covered" && (
                <label>
                  Guardia que confirmó el relevo
                  <select
                    value={form.replacementGuardId}
                    onChange={(e) => set("replacementGuardId", e.target.value)}
                    required
                  >
                    <option value="">Selecciona el relevo</option>
                    {data.guards
                      .filter((g) => g.accountActive)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name || g.id}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                Nota de seguimiento
                <textarea
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  maxLength={500}
                  rows={3}
                  required={["contact", "verified_absent"].includes(kind)}
                  placeholder="Registra el aviso recibido o la acción realizada. Evita datos sensibles."
                />
              </label>
              <p className="footnote">
                La hora del aviso será la hora de este registro. No se enviará
                ningún mensaje al guardia.
              </p>
              {p.events.length > 0 && (
                <details className="definitions">
                  <summary>Seguimientos anteriores ({p.events.length})</summary>
                  {p.events
                    .slice()
                    .reverse()
                    .map((e) => (
                      <div className="audit-event" key={e.id}>
                        <strong>{eventLabel(e.kind)}</strong>
                        <small>
                          {date(e.at)}
                          {e.note ? ` · ${e.note}` : ""}
                        </small>
                      </div>
                    ))}
                </details>
              )}
            </>
          )}
          {error && (
            <div className="notice red" role="alert">
              {error}
            </div>
          )}
          {stale && (
            <div className="notice amber">
              Actualiza los datos antes de registrar seguimiento.
            </div>
          )}
          <div className="modal-actions">
            {p && (
              <button
                className="text-button red-text"
                type="button"
                disabled={busy || stale}
                onClick={remove}
              >
                Retirar programación
              </button>
            )}
            <button className="primary" disabled={busy || stale}>
              {busy ? "Guardando…" : "Guardar"}
              <Check size={17} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function CoverageModal({ row, stale, onClose, onSave }) {
  const dialog = useRef(null),
    previousFocus = useRef(document.activeElement);
  const [count, setCount] = useState(
    row.required ?? row.target?.requiredGuards ?? "",
  );
  const [until, setUntil] = useState(
    localDateTime(
      row.target && !row.expired
        ? row.target.validUntil
        : Date.now() + 12 * 3600000,
    ).slice(0, 16),
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    return () => previousFocus.current?.focus?.();
  }, []);
  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("coverage", {
        method: "PUT",
        body: JSON.stringify({
          siteId: row.site.id,
          requiredGuards: Number(count),
          validUntil: mexicoInput(until),
          etag: row.target?.etag,
        }),
      });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="modal-inner">
        <header>
          <div>
            <span className="eyebrow">COBERTURA ACTUAL</span>
            <h2>Dotación de este turno</h2>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <div className="plan-detail">
          <strong>{row.site.name || row.site.id}</strong>
          <span>{row.validGuards} guardias con entrada abierta válida</span>
        </div>
        <form onSubmit={save}>
          <label>
            Guardias requeridos
            <input
              aria-label="Guardias requeridos"
              type="number"
              min="0"
              max="500"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
            />
          </label>
          <label>
            Vigente hasta · Ciudad de México
            <input
              aria-label="Vigente hasta"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              required
            />
          </label>
          <p className="footnote">
            Indica cuántos guardias deben estar simultáneamente en este servicio
            durante este turno. Al vencer, el panel pedirá revisar la dotación.
            Esta configuración no modifica GuardianCheck.
          </p>
          {error && (
            <div className="notice red" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button className="primary" disabled={busy || stale}>
              {busy ? "Guardando…" : "Guardar dotación"}
              <Check size={17} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
