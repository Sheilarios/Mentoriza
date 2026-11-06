import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { ErrorText, Loading, fmtDate, soles } from "../components/ui";
import { useToast } from "../state";

interface Stats {
  byPlan: Record<string, number>;
  questions: number;
  mentorings: number;
  leads: number;
  paymentsTotal: number;
}
interface Uni {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  monthlyCredits: number;
  active: boolean;
  _count: { users: number };
}
interface Lead {
  id: string;
  university: string;
  email: string;
  position: string;
  createdAt: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [unis, setUnis] = useState<Uni[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [f, setF] = useState({ name: "", shortName: "", domain: "", accessCode: "", monthlyCredits: 4 });
  const [mf, setMf] = useState({ name: "", headline: "", courses: "" });
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api.get<Stats>("/admin/stats").then(setStats);
    api.get<Uni[]>("/admin/universities").then(setUnis);
    api.get<Lead[]>("/admin/leads").then(setLeads);
  }, []);
  useEffect(load, [load]);

  const addUni = async () => {
    setErr("");
    try {
      await api.post("/admin/universities", f);
      setF({ name: "", shortName: "", domain: "", accessCode: "", monthlyCredits: 4 });
      toast("Universidad aliada agregada");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const toggle = async (u: Uni) => {
    await api.patch(`/admin/universities/${u.id}`, { active: !u.active });
    load();
  };
  const addMentor = async () => {
    try {
      await api.post("/admin/mentors", { name: mf.name, headline: mf.headline, courses: mf.courses.split(",").map((s) => s.trim()).filter(Boolean) });
      setMf({ name: "", headline: "", courses: "" });
      toast("Mentor agregado");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  if (!stats) return <Loading />;
  return (
    <>
      <h2>Administración</h2>
      <div className="kpi">
        <div>
          <b>{stats.byPlan.FREE || 0}</b>plan Gratis
        </div>
        <div>
          <b>{stats.byPlan.PREMIUM || 0}</b>Premium
        </div>
        <div>
          <b>{stats.byPlan.UNIVERSITY || 0}</b>por convenio
        </div>
        <div>
          <b>{stats.questions}</b>consultas
        </div>
        <div>
          <b>{stats.mentorings}</b>mentorías
        </div>
        <div>
          <b>{soles(stats.paymentsTotal)}</b>pagos registrados
        </div>
      </div>

      <h3>Universidades aliadas</h3>
      <div className="card">
        {unis.map((u) => (
          <div key={u.id} className="list-row">
            <span>
              <b>{u.name}</b>
              <div className="meta">
                @{u.domain} · {u._count.users} usuarios · {u.monthlyCredits} créditos/mes
              </div>
            </span>
            <button className={`sm ${u.active ? "alt" : ""}`} onClick={() => toggle(u)}>
              {u.active ? "Activa" : "Inactiva"}
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <b>Agregar universidad aliada</b>
        <div className="stack mt8">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nombre (ej. Universidad de Lima)" aria-label="Nombre" />
          <input value={f.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} placeholder="Sigla (ej. ULIMA)" aria-label="Sigla" />
          <input value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} placeholder="Dominio de correo (ej. ulima.edu.pe)" aria-label="Dominio" />
          <input value={f.accessCode} onChange={(e) => setF({ ...f, accessCode: e.target.value })} placeholder="Contraseña inicial para sus alumnos" aria-label="Código de acceso" />
          <label className="meta" htmlFor="mcred">
            Créditos de mentoría por alumno al mes (1 crédito = 15 min)
          </label>
          <input id="mcred" type="number" min={0} max={100} value={f.monthlyCredits} onChange={(e) => setF({ ...f, monthlyCredits: +e.target.value })} />
        </div>
        <ErrorText msg={err} />
        <button onClick={addUni}>Agregar</button>
      </div>

      <h3>Mentores</h3>
      <div className="card">
        <div className="stack">
          <input value={mf.name} onChange={(e) => setMf({ ...mf, name: e.target.value })} placeholder="Nombre (ej. Carla M.)" aria-label="Nombre del mentor" />
          <input value={mf.headline} onChange={(e) => setMf({ ...mf, headline: e.target.value })} placeholder="Perfil (ej. Ciclo 9 · Ing. Civil)" aria-label="Perfil" />
          <input value={mf.courses} onChange={(e) => setMf({ ...mf, courses: e.target.value })} placeholder="Cursos separados por coma" aria-label="Cursos" />
        </div>
        <button className="mt8" onClick={addMentor} disabled={!mf.name || !mf.headline}>
          Agregar mentor
        </button>
      </div>

      <h3>Solicitudes de convenio ({leads.length})</h3>
      <div className="card tw">
        {leads.length === 0 ? (
          <p className="meta">Aún no hay solicitudes.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Universidad</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.createdAt)}</td>
                  <td>{l.university}</td>
                  <td>
                    <a href={`mailto:${l.email}`}>{l.email}</a>
                    <div className="meta">{l.position}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
