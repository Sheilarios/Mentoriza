import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api";
import { ErrorText, I, Logo } from "../components/ui";
import { useAuth, useToast } from "../state";
import type { University, User } from "../types";

type Tab = "conv" | "free";
type DemoInfo = { enabled: boolean; password: string | null; accounts: { key: string; email: string; label: string; description: string; icon: string }[] };

function PasswordInput({ id, value, onChange, placeholder, autoComplete }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="fi">
      <I n="lock" className="ic2" />
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete={autoComplete} />
      <button type="button" className="ey" onClick={() => setShow(!show)} aria-label="Mostrar u ocultar contraseña">
        <I n={show ? "eye-slash" : "eye"} />
      </button>
    </div>
  );
}

export default function Login() {
  const { setSession } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("conv");
  const [unis, setUnis] = useState<University[]>([]);
  const [uni, setUni] = useState<University | null>(null);
  const [step, setStep] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "reg">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [demo, setDemo] = useState<DemoInfo | null>(null);

  useEffect(() => {
    api.get<University[]>("/auth/universities").then(setUnis).catch(() => setUnis([]));
    api.get<DemoInfo>("/auth/demo-accounts").then(setDemo).catch(() => setDemo(null));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast("Copiado"),
      () => undefined,
    );
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return unis.filter((u) => !s || `${u.name} ${u.shortName} ${u.domain}`.toLowerCase().includes(s));
  }, [q, unis]);

  const hint = useMemo(() => {
    const v = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) return "";
    const d = v.split("@")[1];
    if (unis.some((u) => u.domain === d)) return "Tu universidad es aliada: ingresa por convenio.";
    if (/\.edu(\.|$)/.test(d)) return "Tu universidad aún no tiene convenio: entrarás con el plan Gratis.";
    return "Entrarás con el plan Gratis; puedes pasar a Premium cuando quieras.";
  }, [email, unis]);

  const done = (r: { token: string; user: User }) => {
    setSession(r.token, r.user);
    toast(`¡Hola, ${r.user.name}!`);
  };

  const run = async (fn: () => Promise<{ token: string; user: User }>) => {
    setErr("");
    setBusy(true);
    try {
      done(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitConv = (e: FormEvent) => {
    e.preventDefault();
    if (!uni) return;
    run(() => api.post("/auth/institutional", { universityId: uni.id, email, password: pw }));
  };
  const submitFree = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "reg") run(() => api.post("/auth/register", { name, email, password: pw }));
    else run(() => api.post("/auth/login", { email, password: pw }));
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setErr("");
    setPw("");
  };

  return (
    <>
      <div className="wv">
        <i />
        <i />
        <i />
        Plataforma de Aprendizaje
      </div>
      <div className="lgl">
        <Logo className="lgb" />
        <span className="wm">Mentoriza</span>
      </div>
      <p className="meta center" style={{ margin: "0 0 14px" }}>
        La IA te da respuestas. <b>Mentoriza te enseña el método.</b>
      </p>

      <div className="card">
        <div className="tg" role="tablist">
          <i className="tgi" style={{ transform: `translateX(${tab === "conv" ? 0 : 100}%)` }} />
          <button className={tab === "conv" ? "on" : ""} role="tab" aria-selected={tab === "conv"} onClick={() => switchTab("conv")}>
            <I n="graduation-cap" /> Por convenio
          </button>
          <button className={tab === "free" ? "on" : ""} role="tab" aria-selected={tab === "free"} onClick={() => switchTab("free")}>
            <I n="seedling" /> Cuenta personal
          </button>
        </div>
        <p className="meta" style={{ margin: "10px 0 14px" }}>
          {tab === "conv" ? "Tu universidad es aliada: entras gratis, con créditos de mentoría cada mes." : "Estudio por mi cuenta: 3 consultas de IA al día gratis · Premium S/ 15/mes."}
        </p>
        {tab === "free" && (
          <p style={{ margin: "0 0 10px" }}>
            <span className="tag-free">
              <I n="credit-card" /> Prueba sin tarjeta ni costo
            </span>
          </p>
        )}

        {tab === "conv" && step === 1 && (
          <>
            <h3 className="ct">Selecciona y busca tu universidad</h3>
            <div className="cb">
              <I n="graduation-cap" />
              <input
                role="combobox"
                aria-expanded={open}
                aria-controls="ul"
                aria-label="Buscar universidad"
                placeholder="Seleccionar universidad"
                autoComplete="off"
                value={uni && q === uni.name ? uni.name : q}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (uni && e.target.value !== uni.name) setUni(null);
                  setOpen(true);
                }}
              />
              <I n="chevron-down" />
            </div>
            {open && (
              <ul id="ul" className="ul" role="listbox" onMouseDown={(e) => e.preventDefault()}>
                {filtered.length ? (
                  filtered.map((u) => (
                    <li
                      key={u.id}
                      role="option"
                      aria-selected={uni?.id === u.id}
                      onClick={() => {
                        setUni(u);
                        setQ(u.name);
                        setOpen(false);
                      }}
                    >
                      <span className="av2">{u.shortName}</span>
                      <span>
                        <b>{u.name}</b>
                        <small>@{u.domain}</small>
                      </span>
                      <span className="chip">Aliada</span>
                    </li>
                  ))
                ) : (
                  <li className="no">No encontramos esa universidad</li>
                )}
                <li className="alt2" onClick={() => switchTab("free")}>
                  ¿No está tu universidad? Crea tu cuenta personal gratis →
                </li>
              </ul>
            )}
            <button className={`bt2 ${uni ? "" : "dis"}`} disabled={!uni} onClick={() => setStep(2)}>
              Continuar
            </button>
          </>
        )}

        {tab === "conv" && step === 2 && uni && (
          <form onSubmit={submitConv}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="chip">
                <I n="graduation-cap" /> {uni.name}
              </span>
              <button type="button" className="t2" onClick={() => setStep(1)}>
                Cambiar
              </button>
            </div>
            <h3 className="ct" style={{ marginTop: 10 }}>
              Ingresa con tu cuenta institucional
            </h3>
            <div className="fi">
              <I n="envelope" className="ic2" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`usuario@${uni.domain}`} aria-label="Correo institucional" autoComplete="email" />
            </div>
            <PasswordInput id="cpw" value={pw} onChange={setPw} placeholder="Contraseña asignada por tu universidad" autoComplete="current-password" />
            <p className="meta" style={{ margin: "6px 0" }}>
              <I n="key" /> Tu universidad te entrega esta contraseña la primera vez. Luego puedes cambiarla en «Cuenta».
            </p>
            <ErrorText msg={err} />
            <button className="bt2" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar con mi universidad →"}
            </button>
          </form>
        )}

        {tab === "free" && (
          <form onSubmit={submitFree}>
            <div className="seg">
              <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>
                Ingresar
              </button>
              <button type="button" className={mode === "reg" ? "on" : ""} onClick={() => setMode("reg")}>
                Crear cuenta
              </button>
            </div>
            {mode === "reg" && (
              <div className="fi">
                <I n="user" className="ic2" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" aria-label="Nombre" autoComplete="name" />
              </div>
            )}
            <div className="fi">
              <I n="envelope" className="ic2" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" aria-label="Correo" autoComplete="email" />
            </div>
            <PasswordInput id="pw" value={pw} onChange={setPw} placeholder="Contraseña (mínimo 6 caracteres)" autoComplete={mode === "reg" ? "new-password" : "current-password"} />
            <div className="meta" style={{ minHeight: 22, margin: "6px 0" }}>
              {hint}
            </div>
            <ErrorText msg={err} />
            <button className="bt2" disabled={busy}>
              {busy ? "Un momento…" : mode === "reg" ? "Crear mi cuenta →" : "Entrar →"}
            </button>
          </form>
        )}
      </div>

      {demo && demo.accounts.length > 0 && (
        <div className="card demo">
          <h3 className="ct">
            <I n="flask" /> Cuentas de prueba
          </h3>
          <p className="meta" style={{ margin: "0 0 10px" }}>
            Entra con un clic para probar la app. Todas usan la contraseña{" "}
            <button type="button" className="demo-pw" onClick={() => copy(demo.password ?? "")} aria-label="Copiar contraseña">
              {demo.password} <I n="copy" />
            </button>
          </p>
          <div className="demo-list">
            {demo.accounts.map((a) => (
              <div className="demo-it" key={a.key}>
                <span className="demo-ic">
                  <I n={a.icon} />
                </span>
                <span className="demo-tx">
                  <b>{a.label}</b>
                  <button type="button" className="demo-mail" onClick={() => copy(a.email)} aria-label={`Copiar correo ${a.email}`}>
                    {a.email} <I n="copy" />
                  </button>
                  <small>{a.description}</small>
                </span>
                <button type="button" className="sm" disabled={busy} onClick={() => run(() => api.post("/auth/demo", { key: a.key }))}>
                  Entrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <b>¿Tienes inconvenientes con la plataforma?</b>
        <a className="wa" href="https://wa.me/?text=Hola%20Mentoriza%2C%20necesito%20ayuda%20para%20ingresar" target="_blank" rel="noopener">
          <I n="whatsapp" brand /> Contáctanos por WhatsApp
        </a>
      </div>
    </>
  );
}
