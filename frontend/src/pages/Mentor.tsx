import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { ErrorText, I, Loading, Mascot, initials } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { Course, MentorInfo, Mentoring } from "../types";

const sug = (d: number) => Math.round((40 * d) / 60);
const tokn = (d: number) => Math.ceil(d / 15);
const ACTIVE = ["SEARCHING", "MATCHED", "IN_ROOM"];

function Tokens({ n, max }: { n: number; max: number }) {
  return (
    <div className="tok" role="img" aria-label={`${n} créditos disponibles`}>
      {"●".repeat(Math.max(0, n))}
      {"○".repeat(Math.max(0, max - n))}
    </div>
  );
}

export default function Mentor() {
  const { user, refresh } = useAuth();
  const { party, toast } = useToast();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [mentors, setMentors] = useState<MentorInfo[]>([]);
  const [history, setHistory] = useState<Mentoring[]>([]);
  const [m, setM] = useState<Mentoring | null>(null);
  const [courseId, setCourseId] = useState(sp.get("curso") || "");
  const [topic, setTopic] = useState(sp.get("tema") || "");
  const [urg, setUrg] = useState("Ahora");
  const [dur, setDur] = useState(30);
  const [price, setPrice] = useState(sug(30));
  const [err, setErr] = useState("");
  const [shown, setShown] = useState(0);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [left, setLeft] = useState(0);
  const [stars, setStars] = useState(0);
  const msgsRef = useRef<HTMLDivElement>(null);

  const uni = user?.plan === "UNIVERSITY";

  useEffect(() => {
    if (!user || user.plan === "FREE") return;
    Promise.all([api.get<Course[]>("/courses"), api.get<MentorInfo[]>("/mentors"), api.get<Mentoring[]>("/mentorings")]).then(([c, ms, h]) => {
      setCourses(c);
      setMentors(ms);
      setHistory(h.filter((x) => x.status === "DONE"));
      if (!courseId && c[0]) setCourseId(c[0].id);
      const active = h.find((x) => ACTIVE.includes(x.status));
      if (active) api.get<Mentoring>(`/mentorings/${active.id}`).then(setM);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.plan]);

  // Ofertas que van llegando
  useEffect(() => {
    if (m?.status !== "SEARCHING") return;
    setShown(0);
    const ts = m.offers.map((_, i) => window.setTimeout(() => setShown(i + 1), 1500 + i * 1700));
    return () => ts.forEach(clearTimeout);
  }, [m?.id, m?.status, m?.offerPrice, m?.offers.length]);

  // El mentor se conecta
  useEffect(() => {
    if (m?.status !== "MATCHED") return;
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, [m?.id, m?.status]);

  // Sala: tiempo y mensajes nuevos
  const poll = useCallback(async () => {
    if (!m) return;
    const x = await api.get<Mentoring>(`/mentorings/${m.id}`);
    setM(x);
  }, [m]);
  useEffect(() => {
    if (m?.status !== "IN_ROOM") return;
    setLeft(m.minutes * 60);
    const tick = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const p = window.setInterval(poll, 4000);
    return () => {
      clearInterval(tick);
      clearInterval(p);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, m?.status]);
  useEffect(() => {
    msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight);
  }, [m?.messages?.length]);

  const act = async (fn: () => Promise<Mentoring>) => {
    setErr("");
    try {
      const r = await fn();
      setM(r);
      return r;
    } catch (e) {
      setErr((e as Error).message);
      toast((e as Error).message);
    }
  };

  if (!user) return <Loading />;

  if (user.plan === "FREE")
    return (
      <>
        <h2>Mentores</h2>
        <p className="meta">Pide un mentor cuando la IA no alcance.</p>
        <div className="card blur" style={{ marginTop: 14 }} aria-hidden="true">
          <p>
            <b>Valeria Q.</b> · Ciclo 10 · Ing. de Sistemas
          </p>
          <p>
            <b>Camila R.</b> · Magíster en Matemática
          </p>
          <p>
            <b>Lucía T.</b> · Asistente de cátedra
          </p>
        </div>
        <div className="card help">
          <b>Los mentores humanos se desbloquean con tu universidad aliada o con Premium</b>
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={() => nav("/universidad")}>
              <I n="graduation-cap" /> Ver si mi universidad es aliada
            </button>
            <button onClick={() => nav("/planes")}>
              <I n="heart" /> Suscribirme · S/ 15 al mes
            </button>
          </div>
        </div>
      </>
    );

  if (!courses) return <Loading />;
  const maxTok = user.university?.monthlyCredits || 4;

  // ---------- Formulario ----------
  if (!m || m.status === "CANCELLED") {
    const ok = !uni || tokn(dur) <= user.credits;
    return (
      <>
        <h2>Contactar mentor</h2>
        {uni ? (
          <div className="ban">
            <b>
              <I n="graduation-cap" /> Tu universidad aliada cubre tus mentorías
            </b>
            <Tokens n={user.credits} max={maxTok} />
            <span>Te quedan {user.credits} créditos este mes · 1 crédito = 15 min</span>
          </div>
        ) : (
          <div className="card" style={{ background: "var(--pe2)" }}>
            <b>
              <I n="heart" /> Tú propones el precio
            </b>
            <p className="meta">Los mentores te responden con su oferta y tú eliges.</p>
          </div>
        )}
        <div className="card">
          <label className="meta" htmlFor="mc">
            Curso
          </label>
          <select id="mc" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.name}
              </option>
            ))}
          </select>
          <label className="meta" htmlFor="mt" style={{ display: "block", marginTop: 10 }}>
            ¿En qué necesitas ayuda?
          </label>
          <textarea id="mt" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ejemplo: no entiendo cómo aplicar integración por partes" />
          <p className="meta" style={{ margin: "10px 0 0" }}>
            ¿Cuándo?
          </p>
          <div className="seg">
            {["Ahora", "En 1 hora", "Esta noche"].map((u) => (
              <button key={u} className={urg === u ? "on" : ""} onClick={() => setUrg(u)}>
                {u}
              </button>
            ))}
          </div>
          <p className="meta" style={{ margin: 0 }}>
            ¿Cuánto tiempo?
          </p>
          <div className="seg">
            {[15, 30, 60].map((d) => (
              <button
                key={d}
                className={dur === d ? "on" : ""}
                disabled={uni && tokn(d) > user.credits}
                onClick={() => {
                  setDur(d);
                  setPrice(sug(d));
                }}
              >
                {d} min{uni ? ` · ${tokn(d)} 🎟️` : ""}
              </button>
            ))}
          </div>
          {!uni && (
            <>
              <div className="row" style={{ justifyContent: "center" }}>
                <button className="ic" onClick={() => setPrice((p) => Math.max(1, p - 1))} aria-label="Bajar precio">
                  −
                </button>
                <span className="price">S/ {price}</span>
                <button className="ic" onClick={() => setPrice((p) => p + 1)} aria-label="Subir precio">
                  +
                </button>
              </div>
              <p className="meta center">Sugerido: S/ {sug(dur)} · mercado: S/ 30 a 50 por hora</p>
            </>
          )}
          <ErrorText msg={err} />
          <button
            style={{ width: "100%", marginTop: 10, fontSize: 18 }}
            disabled={!ok}
            onClick={async () => {
              const r = await act(() => api.post("/mentorings", { courseId, topic, urgency: urg, minutes: dur, price: uni ? undefined : price }));
              if (r) {
                setStars(0);
                refresh();
              }
            }}
          >
            {uni ? `Pedir mentor · usa ${tokn(dur)} 🎟️` : `Buscar mentor por S/ ${price}`}
          </button>
          {!ok && <p className="meta">Tus créditos no alcanzan para esa duración.</p>}
        </div>
        <h3>Mentores disponibles</h3>
        {mentors.map((x) => (
          <div key={x.id} className="card offer" style={{ padding: 12 }}>
            <div className="av">{initials(x.name)}</div>
            <div>
              <b>{x.name}</b> <span className="meta">★ {x.rating}</span>
              <div className="meta">
                {x.headline}
                {x.courses.length ? ` · ${x.courses.join(", ")}` : ""}
              </div>
            </div>
          </div>
        ))}
        {history.length > 0 && (
          <>
            <h3>Mis mentorías</h3>
            {history.map((h) => (
              <div key={h.id} className="card" style={{ padding: 12 }}>
                <b>{h.course?.name}</b> con {h.mentor?.name}{" "}
                <span className="meta">
                  · {h.minutes} min · {h.creditsUsed ? `${h.creditsUsed} 🎟️` : `S/ ${h.finalPrice}`}
                </span>
              </div>
            ))}
          </>
        )}
      </>
    );
  }

  const mentor = m.mentor;

  // ---------- Buscando ----------
  if (m.status === "SEARCHING")
    return (
      <>
        <h2>Buscando mentor…</h2>
        <div className="radar">
          <i />
          <i />
          <i />
          <Mascot />
        </div>
        <p className="meta center">
          {m.course?.name} · {m.minutes} min · {m.urgency} · tu oferta S/ {m.offerPrice}
        </p>
        <div style={{ marginTop: 12 }}>
          {m.offers.slice(0, shown).map((o, i) => (
            <div key={i} className="card offer">
              <div className="av">{initials(o.mentor?.name || "M")}</div>
              <div>
                <b>{o.mentor?.name}</b> <span className="meta">★ {o.mentor?.rating}</span>
                <div className="meta">
                  {o.mentor?.headline} · llega en {o.eta} min
                </div>
                {o.price <= m.offerPrice ? <span className="chip">Acepta tu precio</span> : <span className="chip p">Contraoferta</span>}
              </div>
              <div className="price">S/ {o.price}</div>
              <button onClick={() => act(() => api.post(`/mentorings/${m.id}/accept`, { index: i }))}>Aceptar</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button
            className="gh"
            onClick={async () => {
              await api.post(`/mentorings/${m.id}/cancel`);
              setM(null);
            }}
          >
            Cancelar
          </button>
          <button className="alt" onClick={() => act(() => api.post(`/mentorings/${m.id}/raise`))}>
            Subir mi oferta +S/ 2
          </button>
        </div>
      </>
    );

  // ---------- Mentor asignado ----------
  if (m.status === "MATCHED" && mentor)
    return (
      <>
        <h2>{ready ? "¡Tu mentor está listo!" : "Tu mentor viene en camino"}</h2>
        <div className="card">
          <div className="offer">
            <div className="av">{initials(mentor.name)}</div>
            <div>
              <b>{mentor.name}</b> <span className="meta">★ {mentor.rating}</span>
              <div className="meta">{mentor.headline}</div>
            </div>
          </div>
          <div className="pb" style={{ margin: "14px 0" }}>
            <i className={ready ? "" : "grow"} style={ready ? { width: "100%", transition: "none" } : undefined} />
          </div>
          <p className="meta">{ready ? "Ya puedes entrar a la sala." : "Se está conectando…"}</p>
          <span className="chip">{m.creditsUsed ? `Cubierto por tu universidad · −${m.creditsUsed} 🎟️` : `S/ ${m.finalPrice} · se paga al terminar`}</span>
        </div>
        <div className="row">
          <button disabled={!ready} onClick={() => act(() => api.post(`/mentorings/${m.id}/enter`))}>
            Entrar a la sala
          </button>
          <button
            className="gh"
            onClick={async () => {
              await api.post(`/mentorings/${m.id}/cancel`);
              setM(null);
              refresh();
              toast(m.creditsUsed ? "Mentoría cancelada · te devolvimos tus créditos" : "Mentoría cancelada");
            }}
          >
            Cancelar
          </button>
        </div>
      </>
    );

  // ---------- Sala ----------
  if (m.status === "IN_ROOM" && mentor)
    return (
      <>
        <div className="card">
          <div className="offer">
            <div className="av">{initials(mentor.name)}</div>
            <div>
              <b>{mentor.name}</b>
              <div className="meta">Sala de mentoría · {m.course?.name}</div>
            </div>
            <span className="pill">
              <I n="stopwatch" /> {Math.ceil(left / 60)} min
            </span>
          </div>
        </div>
        {!mentor.userId && <p className="room-note">Este mentor de demostración responde con ayuda de la IA de Mentoriza.</p>}
        <div className="card">
          <div className="msgs" ref={msgsRef} aria-live="polite">
            {m.messages?.map((x) => (
              <div key={x.id} className={`m ${x.from === "student" ? "me" : "mt"}`}>
                {x.text}
              </div>
            ))}
          </div>
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!msg.trim()) return;
              const t = msg;
              setMsg("");
              await act(() => api.post(`/mentorings/${m.id}/messages`, { text: t }));
            }}
          >
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Escribe a tu mentor" aria-label="Mensaje" />
            <button>Enviar</button>
          </form>
        </div>
        <button
          className="alt"
          onClick={async () => {
            const r = await act(() => api.post(`/mentorings/${m.id}/end`));
            if (r) {
              party(r.streak ? `¡Sesión terminada! Racha de ${r.streak} días` : "¡Sesión terminada!");
              refresh();
            }
          }}
        >
          Terminar sesión
        </button>
      </>
    );

  // ---------- Terminada ----------
  return (
    <>
      <div className="hero">
        <h2>Sesión terminada 🎉</h2>
        <Mascot cls="yay" />
      </div>
      <div className="card">
        <p>{m.creditsUsed ? `Usaste ${m.creditsUsed} 🎟️. Te quedan ${user.credits} créditos.` : `Total de la sesión: S/ ${m.finalPrice}.`}</p>
        <b>¿Cómo te fue con {mentor?.name}?</b>
        <div className="stars" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} className={i <= stars ? "on" : ""} aria-label={`${i} estrellas`} onClick={() => setStars(i)}>
              ★
            </button>
          ))}
        </div>
        <div className="row mt8">
          <button
            disabled={stars < 1}
            onClick={async () => {
              await api.post(`/mentorings/${m.id}/rate`, { stars });
              toast("¡Gracias por tu calificación!");
              setHistory((h) => [m, ...h]);
              setM(null);
            }}
          >
            Enviar calificación
          </button>
          <button className="gh" onClick={() => setM(null)}>
            Pedir otro mentor
          </button>
        </div>
      </div>
    </>
  );
}
