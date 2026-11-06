import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { I } from "../components/ui";
import type { Business, Validation } from "./About";

function Pitch({ onClose }: { onClose: () => void }) {
  const [k, setK] = useState<"inv" | "cli">("inv");
  const [v, setV] = useState<Validation | null>(null);
  const [b, setB] = useState<Business | null>(null);
  useEffect(() => {
    api.get<Validation>("/validation").then(setV);
    api.get<Business>("/validation/business").then(setB);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const tam = v?.market.find((m) => m.level === "TAM")?.quantity ?? 0;
  const sam = v?.market.find((m) => m.level === "SAM")?.quantity ?? 0;
  const som = v?.market.find((m) => m.level === "SOM")?.quantity ?? 0;
  const r = b?.result;
  const inv: [string, string][] = [
    ["Problema", "Un universitario pierde de 1.5 a 3 horas trabado en una sola duda; la IA genérica se desvía sin el contexto del curso."],
    ["Solución", "Mentoriza: IA que lee tu rúbrica y sílabo, te enseña el método paso a paso y te conecta con un mentor par si sigues trabado."],
    ["Evidencia de demanda", `${v?.summary.interviews ?? 15} entrevistas: ${v?.summary.confirms ?? 15} confirman el problema; los pares son la primera fuente de ayuda y la IA falla sin contexto. Solo ${v?.summary.mentionedPay ?? 2} mencionaron pagar → modelo B2B2C.`],
    ["Mercado", `TAM ${tam.toLocaleString("es-PE")} · SAM ${sam.toLocaleString("es-PE")} (Lima) · SOM ${som} el año 1 (MINEDU).`],
    ["Modelo", "B2B2C: la universidad aliada paga el acceso de sus alumnos; freemium 3 consultas/día; Premium individual; comisión por mentorías."],
    ["Precio", r ? `S/ ${b!.price}/mes · costo unitario S/ ${r.unitCost.toFixed(2)} · margen S/ ${r.unitMargin.toFixed(2)} (${(r.marginPct * 100).toFixed(1)} %) · equilibrio en ${r.breakEvenUnits} suscripciones.` : "…"],
    ["Prototipo", `${v?.summary.prototypeCompleted ?? "4 de 5"} usuarios completaron la tarea sin ayuda en ${v?.summary.prototypeAvgMinutes ?? 3.9} min en promedio.`],
    ["Equipo", "NovaDevs — estudiantes de la Universidad Científica del Sur (validación, producto, negocio y comunicación)."],
    ["Pedido", "Alianzas institucionales con 2 universidades piloto y S/ 12,000 para infraestructura y pruebas piloto en los primeros 12 meses."],
  ];
  return (
    <div className="mdl" role="dialog" aria-modal="true" aria-label="Presentación Mentoriza" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bx">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>
            <I n="microphone" /> Presentación Mentoriza
          </h2>
          <button className="ic" onClick={onClose} aria-label="Cerrar">
            <I n="xmark" />
          </button>
        </div>
        <div className="seg">
          <button className={k === "inv" ? "on" : ""} onClick={() => setK("inv")}>
            Inversionista (F.2)
          </button>
          <button className={k === "cli" ? "on" : ""} onClick={() => setK("cli")}>
            Cliente (F.4)
          </button>
        </div>
        {k === "inv" ? (
          inv.map(([a, t]) => (
            <div key={a} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <b>{a}</b>
              <p className="meta">{t}</p>
            </div>
          ))
        ) : (
          <>
            <div className="ban" style={{ fontSize: 18 }}>
              <b>“Me lleva una hora, hora y media hasta dos… en un solo ejercicio.”</b>
              <br />
              <span style={{ fontSize: 14 }}>— José, USIL (entrevista #10)</span>
              <div className="tok" style={{ letterSpacing: 0 }}>
                S/ 15/mes
              </div>
              <span style={{ fontSize: 14 }}>frente a ~S/ 40 por una hora de tutor particular</span>
            </div>
            <div className="card">
              <b>Cómo se usa</b>
              <ol className="meta">
                <li>Sube la rúbrica o el sílabo de tu curso.</li>
                <li>Escribe tu duda: Mentoriza te la divide en pasos.</li>
                <li>Si sigues trabado, pide un mentor par en minutos.</li>
              </ol>
            </div>
            <div className="card help">
              <b>Esta semana: 50 cuentas beta gratuitas</b>
              <p className="meta">Sin tarjeta ni costo. Tu universidad puede sumarse al convenio.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function More() {
  const [pitch, setPitch] = useState(false);
  return (
    <>
      <h2>Más</h2>
      <div className="grid">
        <Link className="cc" to="/planes">
          <span className="em">
            <I n="credit-card" />
          </span>
          <b>Planes</b>
          <span className="meta">Gratis, Premium y Universidad</span>
        </Link>
        <Link className="cc" to="/universidad">
          <span className="em">
            <I n="building-columns" />
          </span>
          <b>Soy universidad</b>
          <span className="meta">Convenio y resultados</span>
        </Link>
        <Link className="cc" to="/acerca">
          <span className="em">
            <I n="scroll" />
          </span>
          <b>Acerca de</b>
          <span className="meta">Versiones y nuestra validación</span>
        </Link>
        <button className="cc" onClick={() => setPitch(true)}>
          <span className="em">
            <I n="microphone" />
          </span>
          <b>Ver presentación</b>
          <span className="meta">Inversionista y cliente</span>
        </button>
      </div>
      {pitch && <Pitch onClose={() => setPitch(false)} />}
    </>
  );
}
