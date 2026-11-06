import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Loading } from "../components/ui";
import { useAuth } from "../state";

interface Dash {
  university: { name: string; shortName: string; domain: string; monthlyCredits: number };
  students: number;
  active30d: number;
  questions: number;
  solvedRate: number;
  creditsUsed: number;
  mentoringsDone: number;
  topCourses: { name: string; count: number }[];
}

export default function UniDashboard() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const [unis, setUnis] = useState<{ id: string; name: string }[]>([]);
  const uid = sp.get("u") || "";

  useEffect(() => {
    if (user?.role === "ADMIN") api.get<{ id: string; name: string }[]>("/admin/universities").then((l) => {
      setUnis(l);
      if (!uid && l[0]) setSp({ u: l[0].id });
    });
  }, [user?.role, uid, setSp]);

  useEffect(() => {
    if (user?.role === "ADMIN" && !uid) return;
    setD(null);
    api
      .get<Dash>(`/uni-admin/dashboard${uid ? `?universityId=${uid}` : ""}`)
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [uid, user?.role]);

  if (err) return <div className="card">{err}</div>;
  if (!d) return <Loading />;
  const mx = Math.max(1, ...d.topCourses.map((c) => c.count));

  return (
    <>
      <h2>Panel para universidades</h2>
      {unis.length > 0 && (
        <select value={uid} onChange={(e) => setSp({ u: e.target.value })} aria-label="Universidad" style={{ marginBottom: 10 }}>
          {unis.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
      <p className="meta">
        {d.university.name} · @{d.university.domain} · {d.university.monthlyCredits} créditos por alumno al mes
      </p>
      <div className="kpi" style={{ marginTop: 8 }}>
        <div>
          <b>{d.students}</b>alumnos registrados
        </div>
        <div>
          <b>{d.active30d}</b>activos en 30 días
        </div>
        <div>
          <b>{d.questions}</b>dudas trabajadas
        </div>
        <div>
          <b>{d.solvedRate}%</b>dudas completadas paso a paso
        </div>
        <div>
          <b>{d.creditsUsed}</b>créditos de mentoría usados
        </div>
        <div>
          <b>{d.mentoringsDone}</b>mentorías realizadas
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <b>Cursos con más bloqueos</b>
        {d.topCourses.length === 0 && <p className="meta">Aún no hay consultas de tus estudiantes.</p>}
        {d.topCourses.map((c) => (
          <div key={c.name} className="hb">
            <span>{c.name}</span>
            <i style={{ width: `${Math.round((70 * c.count) / mx)}%` }} />
            {c.count}
          </div>
        ))}
      </div>
      <p className="meta">Datos reales de la plataforma, sin información personal de los estudiantes.</p>
    </>
  );
}
