import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { ErrorText, I, fmtDate, soles } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { User } from "../types";

interface Payment {
  id: string;
  concept: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const { toast, party } = useToast();
  const nav = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [name, setName] = useState(user?.name || "");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<Payment[]>("/billing/payments").then(setPayments).catch(() => {});
  }, [user?.plan]);

  if (!user) return null;
  const isStudent = user.role === "STUDENT";
  const maxTok = user.university?.monthlyCredits || 4;

  const saveName = async () => {
    try {
      setUser(await api.patch<User>("/me", { name }));
      toast("Nombre actualizado");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const changePw = async () => {
    setErr("");
    try {
      await api.patch("/me/password", { current: cur, next });
      setCur("");
      setNext("");
      toast("Contraseña actualizada");
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const premium = async () => {
    try {
      setUser(await api.post<User>("/billing/premium"));
      party("💜 ¡Premium activado!");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const cancel = async () => {
    if (!confirm("¿Seguro que quieres cancelar tu suscripción Premium?")) return;
    setUser(await api.post<User>("/billing/cancel"));
    toast("Suscripción cancelada");
  };

  return (
    <>
      <h2>Mi cuenta</h2>
      <div className="card">
        <b>{user.name}</b> {user.role !== "STUDENT" && <span className="pill-role">{({ MENTOR: "Mentor", UNI_ADMIN: "Universidad", ADMIN: "Administrador" } as Record<string, string>)[user.role]}</span>}
        <div className="meta">
          {user.email}
          {user.university && (
            <>
              <br />
              {user.university.name}
            </>
          )}
          {user.career && (
            <>
              <br />
              {user.career}
              {user.cycle ? ` · ciclo ${user.cycle}` : ""}
            </>
          )}
        </div>
      </div>

      {isStudent && user.plan === "UNIVERSITY" && (
        <div className="ban">
          <b>
            <I n="graduation-cap" /> Universidad aliada: {user.university?.name}
          </b>
          <div className="tok">
            {"●".repeat(Math.max(0, user.credits))}
            {"○".repeat(Math.max(0, maxTok - user.credits))}
          </div>
          <span>{user.credits} créditos este mes · cubierto por tu universidad</span>
        </div>
      )}
      {isStudent && user.plan === "PREMIUM" && (
        <div className="card">
          <b>
            <I n="heart" /> Plan Premium · S/ 15/mes
          </b>
          {user.premiumRenewAt && <p className="meta">Renueva el {fmtDate(user.premiumRenewAt)}</p>}
          <button className="gh" onClick={cancel}>
            Cancelar suscripción
          </button>
        </div>
      )}
      {isStudent && user.plan === "FREE" && (
        <>
          <div className="card">
            <b>Plan Gratis · 3 consultas IA al día · sin mentor humano</b>
          </div>
          <div className="grid">
            <div className="card">
              <b>
                <I n="heart" /> Premium · S/ 15/mes
              </b>
              <p className="meta">IA sin límite y mentores con tu precio.</p>
              <button onClick={premium}>Activar Premium</button>
            </div>
            <div className="card help">
              <b>
                <I n="graduation-cap" /> Universidad aliada
              </b>
              <p className="meta">¿Tu universidad aún no está? Avísale.</p>
              <button onClick={() => nav("/universidad")}>Avisar a mi universidad</button>
            </div>
          </div>
        </>
      )}

      {payments.length > 0 && (
        <div className="card">
          <b>Historial de pagos</b>
          <div className="tw">
            <table className="t">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td>
                      {p.concept}
                      {p.status === "DEMO" && <span className="meta"> · demostración</span>}
                    </td>
                    <td>{soles(p.amount)} ✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <b>Tus datos</b>
        <div className="row mt8">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Tu nombre" />
          <button className="sm" onClick={saveName}>
            Guardar
          </button>
        </div>
        <h3>Cambiar contraseña</h3>
        <div className="stack">
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Contraseña actual" aria-label="Contraseña actual" autoComplete="current-password" />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva contraseña (mínimo 6)" aria-label="Nueva contraseña" autoComplete="new-password" />
        </div>
        <ErrorText msg={err} />
        <button className="sm" onClick={changePw} disabled={!cur || next.length < 6}>
          Actualizar contraseña
        </button>
      </div>

      {isStudent && (
        <div className="row" style={{ margin: "6px 0" }}>
          <button className="alt sm" onClick={() => nav("/planes")}>
            Ver planes
          </button>
          <button
            className="ic sm"
            onClick={async () => {
              setUser(await api.post<User>("/me/onboarding/reset"));
              nav("/bienvenida");
            }}
          >
            Repetir bienvenida
          </button>
        </div>
      )}
      <button className="gh" onClick={logout}>
        Cerrar sesión
      </button>
    </>
  );
}
