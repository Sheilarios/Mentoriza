import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ErrorText, I } from "../components/ui";
import { useAuth } from "../state";

export default function University() {
  const { user } = useAuth();
  const [un, setUn] = useState("");
  const [ue, setUe] = useState("");
  const [uc, setUc] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setErr("");
    setBusy(true);
    try {
      await api.post("/leads", { university: un, email: ue, position: uc });
      setOk(true);
      setUn("");
      setUe("");
      setUc("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link className="gh" to="/planes" style={{ display: "inline-block", padding: "8px 0" }}>
        ‹ Planes
      </Link>
      <h2>Soy universidad</h2>
      <div className="card">
        <b>Lo que recibe tu universidad</b>
        <ul className="meta">
          <li>Acceso gratuito para todos tus estudiantes con su correo institucional.</li>
          <li>Créditos mensuales de mentoría con mentores validados.</li>
          <li>Panel de resultados: alumnos activos, dudas resueltas y cursos con más bloqueos.</li>
          <li>Licencia anual por volumen de alumnos, con soporte y capacitación docente.</li>
        </ul>
      </div>
      <div className="card">
        <b>Solicita el convenio</b>
        <div className="stack mt8">
          <input value={un} onChange={(e) => setUn(e.target.value)} placeholder="Nombre de la universidad" aria-label="Nombre de la universidad" />
          <input type="email" value={ue} onChange={(e) => setUe(e.target.value)} placeholder="Correo del contacto" aria-label="Correo del contacto" />
          <input value={uc} onChange={(e) => setUc(e.target.value)} placeholder="Cargo (ej. Director académico)" aria-label="Cargo" />
        </div>
        <ErrorText msg={err} />
        <button onClick={send} disabled={busy}>
          {busy ? "Enviando…" : "Enviar solicitud"}
        </button>
        {ok && (
          <div className="rub" style={{ marginTop: 8 }}>
            <b>¡Gracias!</b> Recibimos tu solicitud. El equipo de Mentoriza te escribirá pronto.
          </div>
        )}
      </div>
      {user && (user.role === "UNI_ADMIN" || user.role === "ADMIN") && (
        <Link to="/panel-universidad">
          <I n="chart-column" /> Ir al panel de resultados
        </Link>
      )}
    </>
  );
}
