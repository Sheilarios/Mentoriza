import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { ErrorText, I } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { User } from "../types";

const EXAMPLE = "Planteamiento correcto del problema (30%)\nProcedimiento paso a paso (50%)\nInterpretación del resultado (20%)";

export default function Onboarding() {
  const { user, setUser, logout } = useAuth();
  const { party } = useToast();
  const nav = useNavigate();
  const [st, setSt] = useState(1);
  const [career, setCareer] = useState(user?.career || "");
  const [cycle, setCycle] = useState(user?.cycle || 1);
  const [courses, setCourses] = useState(["", "", ""]);
  const [useSamples, setUseSamples] = useState(false);
  const [rubric, setRubric] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (rub: string) => {
    setBusy(true);
    try {
      const u = await api.post<User>("/me/onboarding", { career, cycle, courses: useSamples ? [] : courses.map((c) => c.trim()).filter(Boolean), rubric: rub });
      setUser(u);
      party("¡Todo listo! Ya puedes resolver tus dudas");
      nav("/");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const firstCourse = useSamples ? "Desarrollo Web" : courses.find((c) => c.trim()) || "tu primer curso";

  return (
    <>
      <h2>Bienvenido a Mentoriza 👋</h2>
      <p className="meta">Paso {st} de 3</p>
      <div className="dots">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= st ? "on" : ""} />
        ))}
      </div>
      <div className="card">
        {st === 1 && (
          <>
            <h3>1. Cuéntanos de ti</h3>
            <div className="stack">
              <input value={user?.university?.name || ""} placeholder="Universidad (cuenta personal)" aria-label="Universidad" disabled />
              <input value={career} onChange={(e) => setCareer(e.target.value)} placeholder="Carrera" aria-label="Carrera" />
              <select value={cycle} onChange={(e) => setCycle(+e.target.value)} aria-label="Ciclo actual">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Ciclo {n}
                  </option>
                ))}
              </select>
            </div>
            <button className="mt12" onClick={() => setSt(2)}>
              Siguiente →
            </button>
          </>
        )}
        {st === 2 && (
          <>
            <h3>2. Agrega de 1 a 3 cursos</h3>
            <div className="stack">
              {courses.map((c, i) => (
                <input
                  key={i}
                  value={c}
                  onChange={(e) => {
                    const n = [...courses];
                    n[i] = e.target.value;
                    setCourses(n);
                    setUseSamples(false);
                  }}
                  placeholder={i === 0 ? "Curso 1 (ej. Cálculo II)" : `Curso ${i + 1} (opcional)`}
                  aria-label={`Curso ${i + 1}`}
                />
              ))}
            </div>
            <ErrorText msg={err} />
            <div className="row">
              <button
                onClick={() => {
                  if (!courses.some((c) => c.trim())) return setErr("Escribe al menos un curso.");
                  setErr("");
                  setSt(3);
                }}
              >
                Siguiente →
              </button>
              <button
                className="gh"
                onClick={() => {
                  setUseSamples(true);
                  setSt(3);
                }}
              >
                Usar cursos de ejemplo
              </button>
            </div>
          </>
        )}
        {st === 3 && (
          <>
            <h3>3. Sube la rúbrica de {firstCourse}</h3>
            <label className="drop" htmlFor="of">
              <I n="paperclip" /> Subir archivo de texto
              <input id="of" type="file" accept=".txt,.md" hidden onChange={async (e) => e.target.files?.[0] && setRubric(await e.target.files[0].text())} />
            </label>
            <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="…o pega aquí los criterios" aria-label="Criterios de la rúbrica" />
            <ErrorText msg={err} />
            <div className="row mt8">
              <button disabled={busy || !rubric.trim()} onClick={() => finish(rubric)}>
                Terminar
              </button>
              <button className="alt" disabled={busy} onClick={() => finish(EXAMPLE)}>
                Usar rúbrica de ejemplo
              </button>
              <button className="gh" disabled={busy} onClick={() => finish("")}>
                Lo haré después
              </button>
            </div>
          </>
        )}
      </div>
      <button className="gh" onClick={logout}>
        Salir
      </button>
    </>
  );
}
