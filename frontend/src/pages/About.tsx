import { useEffect, useState } from "react";
import { api } from "../api";
import { Loading, fmtDate } from "../components/ui";

export interface Validation {
  interviews: { id: string; number: number; date: string; sprint: string; alias: string; organization: string; finding: string; quote: string; confirms: boolean; mentionedPay: boolean; decision: string }[];
  summary: { interviews: number; confirms: number; mentionedPay: number; hypothesesFailed: number; prototypeCompleted: string; prototypeAvgMinutes: number };
  hypotheses: { number: number; text: string; expected: string; priority: string; result: string }[];
  market: { level: string; quantity: number; method: string; source: string }[];
  tests: { number: number; user: string; completed: boolean; friction: string; quote: string; minutes: number }[];
  changes: { number: number; change: string; evidence: string; priority: string }[];
  team: { name: string; venture: string; program: string; members: { name: string; role: string }[] } | null;
  versions: { v: string; title: string; desc: string; source: string }[];
  canvas: Record<string, string> | null;
  protection: { asset: string; figure: string; next: string }[];
}

export interface Business {
  unit: string;
  price: number;
  unitsPerMonth: number;
  fixed: { label: string; amount: number; note: string }[];
  variable: { label: string; amount: number; note: string }[];
  result: { totalFixed: number; variablePerUnit: number; fixedPerUnit: number; unitCost: number; unitMargin: number; marginPct: number; breakEvenUnits: number; monthlyRevenue: number; monthlyResult: number };
  pricing: { q: string; a: string }[];
}

const CANVAS: [string, string][] = [
  ["segments", "Segmentos de clientes"],
  ["value", "Propuesta de valor"],
  ["channels", "Canales"],
  ["relationship", "Relación con clientes"],
  ["revenue", "Fuentes de ingreso"],
  ["resources", "Recursos clave"],
  ["activities", "Actividades clave"],
  ["partners", "Aliados clave"],
  ["costs", "Estructura de costos"],
];

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t);

export default function About() {
  const [v, setV] = useState<Validation | null>(null);
  const [b, setB] = useState<Business | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    api.get<Validation>("/validation").then(setV);
    api.get<Business>("/validation/business").then(setB);
  }, []);
  if (!v || !b) return <Loading />;
  const ok = v.hypotheses.filter((h) => h.result === "Se confirmó");
  const ko = v.hypotheses.filter((h) => h.result === "Se cayó");
  const list = all ? v.interviews : v.interviews.slice(0, 5);
  const r = b.result;

  return (
    <>
      <h2>Acerca de Mentoriza</h2>
      <div className="card">
        <b>Mentoriza® — marca en trámite ante Indecopi</b>
        <p className="meta">Software protegido por derechos de autor. Sílabos y rúbricas usados con autorización de universidades aliadas. Desarrollado por {v.team?.name || "NovaDevs"}.</p>
        <p className="meta" style={{ marginTop: 6 }}>
          Paleta: azul cobalto #1E5AA8 (confianza), verde menta #3DDC97 (logro) y naranja ámbar #FF9F43 (acción).
        </p>
      </div>

      {v.team && (
        <>
          <h3>Equipo {v.team.name}</h3>
          <div className="card">
            <p className="meta" style={{ marginTop: 0 }}>
              {v.team.program}
            </p>
            {v.team.members.map((m) => (
              <div key={m.name} className="list-row">
                <span>{m.name}</span>
                <span className="chip">{m.role}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>Versiones</h3>
      <div className="tl">
        {v.versions.map((x, i) => (
          <div key={i} className="it">
            <span className="chip">{x.v}</span>
            <b>{x.title}</b>
            <p className="meta">{x.desc}</p>
            <span className="meta">Fuente: {x.source}</span>
          </div>
        ))}
      </div>

      <h3>Nuestra validación</h3>
      <div className="kpi">
        <div>
          <b>{v.summary.interviews}</b>entrevistas
        </div>
        <div>
          <b>{v.summary.confirms}</b>confirman el problema
        </div>
        <div>
          <b>{v.summary.mentionedPay}</b>mencionaron pagar
        </div>
        <div>
          <b>{v.summary.prototypeCompleted}</b>completaron la prueba
        </div>
      </div>
      <div className="card mt12">
        <b>Base de entrevistas</b>
        <div className="tw">
          <table className="t" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>N°</th>
                <th>Estudiante</th>
                <th>Hallazgo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{e.number}</td>
                  <td>
                    <b>{e.alias}</b>
                    <div className="meta">
                      {e.organization} · {e.sprint} · {fmtDate(e.date)}
                    </div>
                  </td>
                  <td>
                    {clip(e.finding, 220)}
                    {e.quote && <div className="ivq">“{clip(e.quote.replace(/^["“]|["”]$/g, ""), 200)}”</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {v.interviews.length > 5 && (
          <button className="gh sm" onClick={() => setAll(!all)}>
            {all ? "Ver menos" : `Ver las ${v.interviews.length} entrevistas`}
          </button>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <b>✅ Hipótesis confirmadas</b>
          <ul>
            {ok.map((h) => (
              <li key={h.number} style={{ fontSize: 14 }}>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>❌ Hipótesis caídas</b>
          <ul>
            {ko.map((h) => (
              <li key={h.number} style={{ fontSize: 14 }}>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Mercado</h3>
      <div className="kpi">
        {v.market.map((m) => (
          <div key={m.level}>
            <b>{m.quantity.toLocaleString("es-PE")}</b>
            {m.level}
          </div>
        ))}
      </div>
      {v.market.map((m) => (
        <p key={m.level} className="meta">
          <b>{m.level}:</b> {m.method} Fuente: {m.source}
        </p>
      ))}

      <h3>Costos, precio y punto de equilibrio</h3>
      <div className="card">
        <p className="meta" style={{ marginTop: 0 }}>
          Unidad: {b.unit} · {b.unitsPerMonth} al mes estimadas
        </p>
        <div className="kv">
          <span>Costos fijos al mes</span>
          <b>S/ {r.totalFixed.toFixed(2)}</b>
          <span>Costo variable por unidad</span>
          <b>S/ {r.variablePerUnit.toFixed(2)}</b>
          <span>Costo total por unidad</span>
          <b>S/ {r.unitCost.toFixed(2)}</b>
          <span>Precio</span>
          <b>S/ {b.price.toFixed(2)}</b>
          <span>Margen por unidad</span>
          <b>
            S/ {r.unitMargin.toFixed(2)} ({(r.marginPct * 100).toFixed(1)} %)
          </b>
          <span>Punto de equilibrio</span>
          <b>{r.breakEvenUnits} suscripciones/mes</b>
          <span>Resultado mensual estimado</span>
          <b>S/ {r.monthlyResult.toFixed(2)}</b>
        </div>
      </div>
      {b.pricing.map((p) => (
        <div key={p.q} className="card" style={{ padding: 12 }}>
          <b>{p.q}</b>
          <p className="meta">{p.a}</p>
        </div>
      ))}

      <h3>Prueba del prototipo</h3>
      <div className="card">
        <p className="meta" style={{ marginTop: 0 }}>
          {v.summary.prototypeCompleted} completaron sin ayuda · {v.summary.prototypeAvgMinutes} min en promedio
        </p>
        {v.tests.map((t) => (
          <div key={t.number} className="list-row" style={{ display: "block" }}>
            <b>{t.user}</b> <span className={`chip ${t.completed ? "" : "p"}`}>{t.completed ? "Completó" : "No completó"}</span> <span className="meta">{t.minutes} min</span>
            <div className="qt">“{t.quote}”</div>
          </div>
        ))}
      </div>
      <div className="card">
        <b>Qué cambiamos por esto</b>
        {v.changes.map((c) => (
          <div key={c.number} className="list-row" style={{ display: "block" }}>
            {c.change}
            <div className="meta">Evidencia: {c.evidence}</div>
          </div>
        ))}
      </div>

      {v.canvas && (
        <>
          <h3>Modelo de negocio</h3>
          <div className="canvas">
            {CANVAS.map(([k, t]) => (
              <div key={k} className="card">
                <b>{t}</b>
                <p>{v.canvas![k]}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {v.protection.length > 0 && (
        <>
          <h3>Ruta de protección</h3>
          <div className="card">
            {v.protection.map((p) => (
              <div key={p.asset} className="list-row" style={{ display: "block" }}>
                <b>{p.asset}</b>
                <div className="meta">
                  {p.figure} · Siguiente paso: {p.next}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
