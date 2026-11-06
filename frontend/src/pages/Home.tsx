import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { I, Loading, Mascot } from "../components/ui";
import { planLabel, useAuth, useToast } from "../state";
import type { Course } from "../types";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [nc, setNc] = useState("");

  useEffect(() => {
    api.get<Course[]>("/courses").then(setCourses).catch((e) => toast(e.message));
  }, [toast]);

  const add = async () => {
    if (!nc.trim()) return;
    try {
      const c = await api.post<Course>("/courses", { name: nc.trim() });
      setCourses((p) => [...(p || []), c]);
      setNc("");
      toast("Curso agregado");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  if (!courses || !user) return <Loading />;
  const prog = (c: Course) => (c.syllabus.length ? Math.round((100 * c.covered.length) / c.syllabus.length) : 0);
  const open = (c: Course) => nav(c.rubric.length ? `/estudiar?curso=${c.id}` : `/curso/${c.id}/contexto`);

  return (
    <>
      <div className="hero">
        <div>
          <h2>Hola, {user.name} 👋</h2>
          <p>¿Qué curso toca estudiar hoy?</p>
          <span className={`chip ${user.plan === "FREE" ? "p" : ""}`} style={{ marginTop: 6 }}>
            <I n={user.plan === "UNIVERSITY" ? "graduation-cap" : user.plan === "PREMIUM" ? "heart" : "seedling"} /> {planLabel(user)}
          </span>
        </div>
        <Mascot />
      </div>

      <h3>Mis cursos</h3>
      <div className="grid">
        {courses.map((c) => (
          <button key={c.id} className="cc" onClick={() => open(c)}>
            <span className="em">{c.emoji}</span>
            <b>{c.name}</b>
            <span className={`chip ${c.rubric.length ? "" : "p"}`}>{c.rubric.length ? "Rúbrica lista ✓" : "Sin rúbrica aún"}</span>
            <div className="bar">
              <i style={{ width: `${prog(c)}%` }} />
            </div>
            <span className="meta">{c.syllabus.length ? `${c.covered.length} de ${c.syllabus.length} temas repasados` : "Sube tu sílabo para ver tu avance"}</span>
          </button>
        ))}
      </div>
      <div className="card row" style={{ marginTop: 14 }}>
        <input value={nc} onChange={(e) => setNc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Agregar otro curso" aria-label="Nombre del curso" />
        <button className="alt" onClick={add}>
          Agregar
        </button>
      </div>

      <div className="sto">
        <div className="av">A</div>
        <div>
          <b>Alonso perdió 1.5 horas en un error de código.</b>
          <br />
          Con una mentoría de 15 minutos lo habría resuelto antes.
          <div style={{ fontStyle: "italic", opacity: 0.85, fontSize: 14 }}>Basado en la entrevista #8 del programa (TECSUP).</div>
        </div>
      </div>

      {courses.length > 0 && (
        <Link to={`/estudiar?curso=${courses[0].id}`} className="fab" style={{ textDecoration: "none" }}>
          <I n="hand" /> Tengo una duda
        </Link>
      )}
    </>
  );
}
