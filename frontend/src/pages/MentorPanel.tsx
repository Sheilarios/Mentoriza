import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { I, Loading, fmtDate } from "../components/ui";
import { useToast } from "../state";
import type { Message } from "../types";

interface Session {
  id: string;
  topic: string;
  urgency: string;
  minutes: number;
  status: string;
  createdAt: string;
  student: { name: string; university: { shortName: string } | null };
  course: { name: string; emoji: string } | null;
  messages: Message[];
}

export default function MentorPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<{ mentor: { name: string; rating: number } | null; sessions: Session[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");

  const load = useCallback(() => api.get<typeof data>("/mentor-panel/sessions").then(setData).catch((e) => toast(e.message)), [toast]);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return <Loading />;
  if (!data.mentor) return <div className="card">Tu cuenta aún no está vinculada a un perfil de mentor. Pide al administrador que lo active.</div>;

  const send = async (id: string) => {
    if (!text.trim()) return;
    try {
      await api.post(`/mentorings/${id}/messages`, { text });
      setText("");
      load();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const active = data.sessions.filter((s) => s.status !== "DONE");
  const done = data.sessions.filter((s) => s.status === "DONE");

  return (
    <>
      <h2>Mis sesiones de mentoría</h2>
      <p className="meta">
        {data.mentor.name} · ★ {data.mentor.rating}
      </p>
      {active.length === 0 && <div className="card meta">No tienes sesiones activas. Te avisaremos aquí cuando un estudiante te elija.</div>}
      {active.map((s) => (
        <div key={s.id} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>
              {s.course?.emoji} {s.course?.name} · {s.student.name}
              {s.student.university ? ` (${s.student.university.shortName})` : ""}
            </b>
            <span className={`chip ${s.status === "IN_ROOM" ? "" : "p"}`}>{s.status === "IN_ROOM" ? "En sala" : "Esperando al estudiante"}</span>
          </div>
          <p className="meta">
            {s.minutes} min · {s.urgency} · “{s.topic}”
          </p>
          <button className="sm" onClick={() => setOpen(open === s.id ? null : s.id)}>
            <I n="comments" /> {open === s.id ? "Ocultar chat" : "Abrir chat"}
          </button>
          {open === s.id && (
            <div className="mt12">
              <div className="msgs">
                {s.messages.map((m) => (
                  <div key={m.id} className={`m ${m.from === "mentor" ? "me" : "mt"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              {s.status === "IN_ROOM" ? (
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(s.id);
                  }}
                >
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe al estudiante" aria-label="Mensaje" />
                  <button>Enviar</button>
                </form>
              ) : (
                <p className="meta">El estudiante aún no entra a la sala.</p>
              )}
            </div>
          )}
        </div>
      ))}
      {done.length > 0 && (
        <>
          <h3>Historial</h3>
          {done.map((s) => (
            <div key={s.id} className="card" style={{ padding: 12 }}>
              <b>{s.course?.name}</b> con {s.student.name} <span className="meta">· {s.minutes} min · {fmtDate(s.createdAt)}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
