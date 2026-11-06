import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { I, Loading, Mascot } from "../components/ui";
import { useToast } from "../state";
import type { Course } from "../types";

export default function CourseContext() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editSyl, setEditSyl] = useState("");

  useEffect(() => {
    api
      .get<Course[]>("/courses")
      .then((l) => {
        const c = l.find((x) => x.id === id) || null;
        setCourse(c);
        setEditSyl(c?.syllabus.join("\n") || "");
      })
      .catch((e) => toast(e.message));
  }, [id, toast]);

  const send = async (body: FormData) => {
    setBusy(true);
    setMsg({ ok: false, text: "Leyendo tu documento…" });
    try {
      const r = await api.post<{ course: Course; found: { rubric: number; syllabus: number } }>(`/courses/${id}/document`, body);
      setCourse(r.course);
      setEditSyl(r.course.syllabus.join("\n"));
      const parts = [r.found.rubric ? `${r.found.rubric} criterios` : "", r.found.syllabus ? `${r.found.syllabus} temas` : ""].filter(Boolean).join(" y ");
      setMsg({ ok: true, text: `¡Listo! Ya leí tu ${r.found.rubric ? "rúbrica" : "sílabo"}. Encontré ${parts}.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const readText = () => {
    if (!text.trim()) return;
    const f = new FormData();
    f.append("text", text);
    send(f);
  };
  const readFile = (file?: File) => {
    if (!file) return;
    const f = new FormData();
    f.append("file", file);
    send(f);
  };
  const example = async () => {
    const c = await api.post<Course>(`/courses/${id}/example-rubric`);
    setCourse(c);
    setMsg({ ok: true, text: `¡Listo! Cargué una rúbrica de ejemplo con ${c.rubric.length} criterios.` });
  };
  const saveSyllabus = async () => {
    const c = await api.patch<Course>(`/courses/${id}`, { syllabus: editSyl });
    setCourse(c);
    toast("Sílabo guardado");
  };
  const remove = async () => {
    if (!confirm(`¿Eliminar el curso ${course?.name}? Se borrarán sus consultas.`)) return;
    await api.del(`/courses/${id}`);
    toast("Curso eliminado");
    nav("/");
  };

  if (!course) return <Loading />;

  return (
    <>
      <Link className="gh" to="/" style={{ display: "inline-block", padding: "8px 0" }}>
        ‹ Volver al inicio
      </Link>
      <div className="card">
        <div className="hero">
          <h2 style={{ fontSize: 21 }}>Para darte una mejor respuesta, ¿tienes la rúbrica o el sílabo de {course.name}?</h2>
          <Mascot />
        </div>
        {course.rubric.length > 0 && (
          <p>
            <span className="badge-ok">
              <I n="circle-check" /> Rúbrica cargada · {course.rubric.length} criterios
            </span>
          </p>
        )}
        <label className="drop" htmlFor="fl">
          <I n="paperclip" /> Subir PDF, foto o archivo de texto
          <input id="fl" type="file" accept="image/*,.txt,.md,.pdf" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="…o pega aquí los criterios de la rúbrica o los temas del sílabo" aria-label="Texto de la rúbrica o sílabo" />
        <div className="row" style={{ marginTop: 10 }}>
          <button disabled={busy} onClick={readText}>
            Leer lo que pegué
          </button>
          <button className="alt" disabled={busy} onClick={example}>
            Probar con una rúbrica de ejemplo
          </button>
          <button className="gh" onClick={() => nav(`/estudiar?curso=${id}`)}>
            Seguir sin rúbrica
          </button>
        </div>
        {msg && (
          <div style={{ marginTop: 12 }}>
            {msg.ok ? (
              <>
                <div className="rub">
                  <span className="badge-ok" style={{ background: "#FAFAF8" }}>
                    <I n="circle-check" /> Confirmado
                  </span>{" "}
                  <b className="ok">{msg.text}</b>
                </div>
                <button style={{ marginTop: 10 }} onClick={() => nav(`/estudiar?curso=${id}`)}>
                  Ahora sí, dime tu duda
                </button>
              </>
            ) : (
              <p>{msg.text}</p>
            )}
          </div>
        )}
      </div>

      {course.rubric.length > 0 && (
        <div className="card">
          <b>Criterios de la rúbrica</b>
          <ul>
            {course.rubric.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <b>Temas del sílabo</b>
        <p className="meta">Uno por línea. Los usamos para medir tu avance.</p>
        <textarea className="edit-ta" value={editSyl} onChange={(e) => setEditSyl(e.target.value)} aria-label="Temas del sílabo" />
        <div className="row mt8">
          <button className="sm" onClick={saveSyllabus}>
            Guardar sílabo
          </button>
          <button className="gh sm" onClick={remove}>
            Eliminar curso
          </button>
        </div>
      </div>
    </>
  );
}
