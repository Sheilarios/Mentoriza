import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { I, Loading, Mascot } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { Course, Question } from "../types";

function QuestionCard({ q, course, onChange }: { q: Question; course: Course; onChange: (q: Question) => void }) {
  const { party, toast } = useToast();
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [why, setWhy] = useState<Record<number, string>>({});
  const [answer, setAnswer] = useState("");
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [guide, setGuide] = useState("");

  const ok = async (j: number) => {
    if (q.done[j]) return;
    try {
      const r = await api.post<{ question: Question; completed: boolean; covered: string | null; streak: number | null }>(`/study/questions/${q.id}/steps/${j}/understood`);
      onChange(r.question);
      if (r.completed) {
        party("¡Bien hecho! Completaste el método 🎉");
        if (r.streak) setTimeout(() => party(`🔥 ¡Racha de ${r.streak} ${r.streak! > 1 ? "días" : "día"} estudiando!`), 1400);
        refresh();
      } else party("¡Buen avance! ✨");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const explain = async (j: number) => {
    setWhy((w) => ({ ...w, [j]: "Déjame explicarlo con una analogía…" }));
    try {
      const r = await api.post<{ explanation: string; question: Question }>(`/study/questions/${q.id}/steps/${j}/explain`);
      setWhy((w) => ({ ...w, [j]: r.explanation }));
      onChange(r.question);
    } catch (e) {
      setWhy((w) => ({ ...w, [j]: (e as Error).message }));
    }
  };
  const check = async () => {
    if (!answer.trim()) return setFb({ ok: false, text: "Escribe primero tu respuesta." });
    setFb({ ok: false, text: "Revisando…" });
    try {
      const r = await api.post<{ ok: boolean; feedback: string; streak: number | null }>(`/study/questions/${q.id}/check`, { answer });
      setFb({ ok: r.ok, text: r.feedback });
      if (r.ok) {
        party("¡Respuesta correcta! 🌟");
        refresh();
      }
    } catch (e) {
      setFb({ ok: false, text: (e as Error).message });
    }
  };
  const showGuide = async () => setGuide((await api.get<{ answer: string }>(`/study/questions/${q.id}/guide`)).answer);

  return (
    <>
      <div className="card" style={{ padding: 14 }}>
        <span className="q">{q.text}</span>
        <span className="chip" style={{ marginLeft: 6 }}>
          {q.topic}
        </span>
        {q.source === "local" && <div className="meta mt8">Guía básica (IA sin configurar)</div>}
      </div>
      {q.steps.map((p, j) => (
        <div key={j} className={`card step ${q.done[j] ? "dn" : ""}`}>
          <div className="sn">Paso {j + 1}</div>
          <p>{p}</p>
          <div className="row">
            <button className="sm" onClick={() => ok(j)}>
              {q.done[j] ? "Entendido ✓" : "¡Entendido!"}
            </button>
            <button className="gh sm" onClick={() => explain(j)}>
              No entendí este paso
            </button>
          </div>
          <div className={`an ${why[j] ? "on" : ""}`}>{why[j]}</div>
        </div>
      ))}
      <div className="card rub">
        <b>Así te evaluarán</b>
        <br />
        {q.rubricHint}
      </div>
      <div className="card">
        <b>¿Entendiste? {q.checkQ}</b>
        <div className="row" style={{ marginTop: 8 }}>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tu respuesta" aria-label="Tu respuesta" />
          <button className="sm" onClick={check}>
            Comprobar
          </button>
          <button className="alt sm" onClick={showGuide}>
            Ver respuesta guía
          </button>
        </div>
        {fb && (
          <p className="meta" style={{ marginTop: 8 }}>
            {fb.ok ? <b className="ok">¡Bien!</b> : fb.text !== "Revisando…" ? <b>Casi.</b> : null} {fb.text}
          </p>
        )}
        {guide && <p className="meta">Respuesta guía: {guide}</p>}
      </div>
      {q.needMentor && (
        <div className="card help">
          <b>¿Necesitas un mentor?</b>
          <p className="meta" style={{ margin: "4px 0 10px" }}>
            Ya intentamos varias veces. Un mentor puede explicártelo en vivo{user?.plan === "UNIVERSITY" ? " y tu universidad lo cubre con tus créditos" : ""}.
          </p>
          <button onClick={() => nav(`/mentores?curso=${course.id}&tema=${encodeURIComponent(q.text)}`)}>Contactar mentor</button>
        </div>
      )}
    </>
  );
}

export default function Study() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [hist, setHist] = useState<Question[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState(false);

  const cid = sp.get("curso") || courses?.[0]?.id || "";
  const course = courses?.find((c) => c.id === cid) || courses?.[0];

  useEffect(() => {
    api.get<Course[]>("/courses").then(setCourses).catch((e) => toast(e.message));
  }, [toast]);

  const loadHist = useCallback(() => {
    if (!course) return;
    api.get<Question[]>(`/study/history?courseId=${course.id}`).then((h) => setHist(h.slice(0, 4)));
  }, [course]);
  useEffect(loadHist, [loadHist]);

  const ask = async (q = text) => {
    if (!course || !q.trim()) return;
    setBusy(true);
    setQuota(false);
    try {
      const r = await api.post<{ question: Question; left: number | null }>("/study/ask", { courseId: course.id, question: q.trim() });
      setHist((h) => [r.question, ...h].slice(0, 4));
      setText("");
      refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "QUOTA_EXCEEDED") setQuota(true);
      else toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!courses || !user) return <Loading />;
  if (!course)
    return (
      <div className="card">
        Primero agrega un curso en <Link to="/">Inicio</Link>.
      </div>
    );

  return (
    <>
      <div className="hero">
        <Link className="gh" to="/" style={{ padding: "8px 0" }}>
          ‹ Inicio
        </Link>
        <Mascot />
      </div>
      <div className="card">
        <select value={course.id} onChange={(e) => setSp({ curso: e.target.value })} aria-label="Curso">
          {courses.map((x) => (
            <option key={x.id} value={x.id}>
              {x.emoji} {x.name}
            </option>
          ))}
        </select>
        <div style={{ margin: "8px 0" }}>
          {course.rubric.length ? (
            <span className="chip">Ya leí tu rúbrica ✓</span>
          ) : (
            <Link to={`/curso/${course.id}/contexto`} className="chip p" style={{ textDecoration: "none" }}>
              Sin rúbrica: respondo en general · Subir rúbrica
            </Link>
          )}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cuéntame tu duda con tus palabras" aria-label="Tu duda" />
        <div style={{ marginTop: 8 }}>
          {course.syllabus.slice(0, 3).map((t) => (
            <button key={t} className="alt sm" style={{ margin: "0 6px 6px 0" }} onClick={() => ask(`Explícame: ${t}`)} disabled={busy}>
              Explícame: {t}
            </button>
          ))}
        </div>
        <button onClick={() => ask()} disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Pensando…" : "Resolvamos paso a paso"}
        </button>
        {user.questionsLeft !== null && (
          <p className="meta" style={{ marginTop: 6 }}>
            Consultas gratis hoy: <b>{user.questionsLeft} de 3</b>
          </p>
        )}
      </div>

      {busy && (
        <div className="card">
          <p className="meta">Revisando el sílabo y la rúbrica de {course.name}…</p>
        </div>
      )}

      {quota && (
        <div className="card help">
          <b>Llegaste a tus 3 consultas de hoy</b>
          <p className="meta">Elige cómo seguir:</p>
          <div className="row">
            <button onClick={() => nav("/universidad")}>
              <I n="graduation-cap" /> Ver si mi universidad es aliada
            </button>
            <button onClick={() => nav("/planes")}>
              <I n="heart" /> Suscribirme S/ 15/mes
            </button>
          </div>
        </div>
      )}

      {hist.length ? (
        hist.map((q) => <QuestionCard key={q.id} q={q} course={course} onChange={(nq) => setHist((h) => h.map((x) => (x.id === nq.id ? nq : x)))} />)
      ) : (
        <p className="meta center" style={{ padding: 20 }}>
          Escribe tu duda. Te la divido en pasos pequeños 🙂
        </p>
      )}
    </>
  );
}
