import { Mascot } from "../components/ui";
import { useFocus } from "../state";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Focus() {
  const f = useFocus();
  return (
    <>
      <h2>Modo enfoque</h2>
      <p className="meta">Estudiemos juntos. Yo leo contigo 📖</p>
      <div className="timer">
        <svg className="rg" viewBox="0 0 240 240" aria-hidden="true">
          <circle cx="120" cy="120" r="110" fill="none" stroke="var(--line)" strokeWidth="12" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="var(--mint)" strokeWidth="12" strokeLinecap="round" strokeDasharray="691" strokeDashoffset={691 * (1 - f.left / f.total)} transform="rotate(-90 120 120)" />
        </svg>
        <Mascot cls={`big ${f.running ? "rd" : f.finished ? "yay" : ""}`} />
        <div className="t">{fmt(f.left)}</div>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <button onClick={f.toggle}>{f.running ? "Pausar" : f.finished ? "Otra vez" : f.left < f.total ? "Continuar" : "Empezar a estudiar"}</button>
        <button className="alt" onClick={f.reset}>
          Reiniciar
        </button>
        <select style={{ width: "auto" }} aria-label="Duración" value={f.total} onChange={(e) => f.setDuration(+e.target.value)}>
          <option value={1500}>25 min</option>
          <option value={900}>15 min</option>
          <option value={2700}>45 min</option>
          <option value={60}>1 min (prueba)</option>
        </select>
      </div>
      {f.finished && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Resumen de tu sesión</h3>
          <p>
            Estudiaste {Math.max(1, Math.round(f.total / 60))} min. Consultas: {f.result?.questions ?? "…"}.
          </p>
          {f.result?.topics.length ? f.result.topics.map((t) => <span key={t} className="chip">{t}</span>) : <p className="meta">No hiciste consultas esta vez, pero enfocarte también cuenta.</p>}
        </div>
      )}
      <p className="meta center mt16">El temporizador sigue corriendo aunque cambies de sección.</p>
    </>
  );
}
