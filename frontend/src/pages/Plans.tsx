import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { I } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { User } from "../types";

interface PlansResp {
  paymentsMode: string;
  plans: { id: string; name: string; price: number | null; features: string[] }[];
  economics: { unitCost: number; unitMargin: number; breakEvenUnits: number; marginPct: number };
}

export default function Plans() {
  const { user, setUser } = useAuth();
  const { party, toast } = useToast();
  const nav = useNavigate();
  const [d, setD] = useState<PlansResp | null>(null);
  useEffect(() => {
    api.get<PlansResp>("/plans").then(setD);
  }, []);
  const a = user?.plan;
  const premium = async () => {
    try {
      setUser(await api.post<User>("/billing/premium"));
      party("💜 ¡Premium activado!");
      nav("/cuenta");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const get = (id: string) => d?.plans.find((p) => p.id === id);
  const e = d?.economics;
  return (
    <>
      <h2>Planes</h2>
      <p className="meta">Elige cómo estudiar con Mentoriza.</p>
      <p>
        <span className="tag-free">
          <I n="credit-card" /> Prueba sin tarjeta ni costo · fase beta
        </span>
      </p>
      <div className="pl" style={{ marginTop: 12 }}>
        <div className="card">
          <b>
            <I n="seedling" /> Gratis
          </b>
          <div className="pr">S/ 0</div>
          <ul>{get("FREE")?.features.map((f) => <li key={f}>{f}</li>)}</ul>
          {a === "FREE" && <span className="chip">Tu plan actual</span>}
        </div>
        <div className="card hi">
          <b>
            <I n="heart" /> Premium
          </b>
          <div className="pr">
            S/ 15<small style={{ fontSize: 14 }}>/mes</small>
          </div>
          <ul>{get("PREMIUM")?.features.map((f) => <li key={f}>{f}</li>)}</ul>
          <p className="meta">
            Referencia: un tutor particular cuesta S/ 30–50 por hora. <b>Mentoriza, S/ 15 al mes.</b>
          </p>
          {e && (
            <p className="meta" style={{ background: "var(--pe2)", borderRadius: 12, padding: 8 }}>
              Costo S/ {e.unitCost.toFixed(2)} · Margen S/ {e.unitMargin.toFixed(2)} · Punto de equilibrio: {e.breakEvenUnits} suscripciones
            </p>
          )}
          {a === "PREMIUM" ? <span className="chip">Tu plan actual</span> : user?.role === "STUDENT" && <button onClick={premium}>Suscribirme S/ 15/mes</button>}
          {d?.paymentsMode === "demo" && <p className="meta">Durante la beta no se realizan cobros reales.</p>}
        </div>
        <div className="card">
          <b>
            <I n="graduation-cap" /> Universidad aliada
          </b>
          <div className="pr" style={{ fontSize: 22 }}>
            Consultar
          </div>
          <ul>{get("UNIVERSITY")?.features.map((f) => <li key={f}>{f}</li>)}</ul>
          {a === "UNIVERSITY" && <span className="chip">Tu plan actual</span>}
          <button className="alt" onClick={() => nav("/universidad")}>
            Soy universidad
          </button>
        </div>
      </div>
    </>
  );
}
