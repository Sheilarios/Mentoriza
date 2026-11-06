import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { User } from "./types";

// ---------------- Avisos y celebraciones ----------------
interface ToastCtx {
  toast: (m: string) => void;
  party: (m: string) => void;
}
const ToastContext = createContext<ToastCtx>({ toast: () => {}, party: () => {} });
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const t = useRef<number>();
  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setShow(false), 2800);
  }, []);
  const party = useCallback(
    (m: string) => {
      toast(m);
      if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
      const colors = ["#3DDC97", "#3DDC97", "#1E5AA8", "#FF9F43"];
      for (let i = 0; i < 14; i++) {
        const s = document.createElement("i");
        s.className = "cf";
        s.style.cssText = `--x:${(Math.random() - 0.5) * 280}px;--y:${-90 - Math.random() * 170}px;background:${colors[i % 4]}`;
        document.body.appendChild(s);
        window.setTimeout(() => s.remove(), 950);
      }
    },
    [toast],
  );
  return (
    <ToastContext.Provider value={{ toast, party }}>
      {children}
      <div id="toast" role="status" className={show ? "show" : ""}>
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------- Sesión ----------------
interface AuthCtx {
  user: User | null;
  ready: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setUser(await api.get<User>("/me"));
    } catch {
      /* el manejador 401 cierra la sesión */
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [logout, refresh]);

  const setSession = useCallback((token: string, u: User) => {
    tokenStore.set(token);
    setUser(u);
  }, []);

  const value = useMemo(() => ({ user, ready, setSession, setUser, refresh, logout }), [user, ready, setSession, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------- Tema (modo nocturno automático desde las 20:00) ----------------
interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [local, setLocal] = useState<boolean | null>(null);
  const pref = user ? user.darkMode : local;
  const h = new Date().getHours();
  const dark = pref === null || pref === undefined ? h >= 20 || h < 6 : pref;
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const toggle = useCallback(() => {
    const next = !dark;
    setLocal(next);
    if (user) {
      setUser({ ...user, darkMode: next });
      api.patch("/me", { darkMode: next }).catch(() => {});
    }
  }, [dark, user, setUser]);
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

// ---------------- Temporizador de enfoque (persiste al navegar) ----------------
interface FocusState {
  total: number;
  left: number;
  running: boolean;
  finished: boolean;
  startedAt: string | null;
  result: { questions: number; topics: string[] } | null;
}
interface FocusCtx extends FocusState {
  toggle: () => void;
  reset: () => void;
  setDuration: (s: number) => void;
}
const FocusContext = createContext<FocusCtx>(null as unknown as FocusCtx);
export const useFocus = () => useContext(FocusContext);

function FocusProvider({ children }: { children: ReactNode }) {
  const { party } = useToast();
  const { refresh } = useAuth();
  const [s, setS] = useState<FocusState>({ total: 1500, left: 1500, running: false, finished: false, startedAt: null, result: null });
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => {
    if (!s.running) return;
    const id = window.setInterval(() => {
      setS((p) => {
        if (p.left <= 1) return { ...p, left: 0, running: false, finished: true };
        return { ...p, left: p.left - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [s.running]);

  useEffect(() => {
    if (!s.finished || s.result) return;
    const minutes = Math.max(1, Math.round(s.total / 60));
    api
      .post<{ streak: number | null; questions: number; topics: string[] }>("/focus", { minutes, startedAt: s.startedAt })
      .then((r) => {
        setS((p) => ({ ...p, result: { questions: r.questions, topics: r.topics } }));
        party(r.streak ? `¡Sesión completa! Racha de ${r.streak} ${r.streak > 1 ? "días" : "día"}` : "¡Sesión completa!");
        refresh();
      })
      .catch(() => setS((p) => ({ ...p, result: { questions: 0, topics: [] } })));
  }, [s.finished, s.result, s.total, s.startedAt, party, refresh]);

  const toggle = useCallback(() => {
    setS((p) => {
      if (p.finished) return { ...p, left: p.total, finished: false, running: true, result: null, startedAt: new Date().toISOString() };
      return { ...p, running: !p.running, startedAt: p.startedAt || new Date().toISOString() };
    });
  }, []);
  const reset = useCallback(() => setS((p) => ({ ...p, left: p.total, running: false, finished: false, result: null, startedAt: null })), []);
  const setDuration = useCallback((sec: number) => setS({ total: sec, left: sec, running: false, finished: false, startedAt: null, result: null }), []);

  return <FocusContext.Provider value={{ ...s, toggle, reset, setDuration }}>{children}</FocusContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <FocusProvider>{children}</FocusProvider>
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export const planLabel = (u: User) =>
  u.plan === "UNIVERSITY" ? `${u.university?.name || "Universidad aliada"} · ${u.credits} créditos este mes` : u.plan === "PREMIUM" ? "Plan Premium · S/ 15/mes" : "Plan Gratis · 3 consultas IA al día";
