import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Footer, I, Loading, Logo } from "./components/ui";
import { useAuth, useTheme } from "./state";
import About from "./pages/About";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import CourseContext from "./pages/CourseContext";
import Focus from "./pages/Focus";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Mentor from "./pages/Mentor";
import MentorPanel from "./pages/MentorPanel";
import More from "./pages/More";
import Onboarding from "./pages/Onboarding";
import Plans from "./pages/Plans";
import Study from "./pages/Study";
import University from "./pages/University";
import UniDashboard from "./pages/UniDashboard";

function Header({ minimal = false }: { minimal?: boolean }) {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  return (
    <header>
      {!minimal && (
        <>
          <Logo />
          <h1>Mentoriza</h1>
        </>
      )}
      <div className="sp">
        {!minimal && user?.role === "STUDENT" && (
          <span className="pill" title="Racha de días estudiando">
            <I n="fire" /> {user.streak}
          </span>
        )}
        <button className="ic" onClick={toggle} aria-label="Cambiar entre modo claro y modo nocturno">
          <I n={dark ? "sun" : "moon"} />
        </button>
      </div>
    </header>
  );
}

const STUDENT_NAV = [
  { to: "/", icon: "house", label: "Inicio", match: ["/", "/estudiar", "/curso"] },
  { to: "/enfoque", icon: "stopwatch", label: "Enfoque" },
  { to: "/mentores", icon: "handshake", label: "Mentores" },
  { to: "/cuenta", icon: "user", label: "Cuenta" },
  { to: "/mas", icon: "wand-magic-sparkles", label: "Más", match: ["/mas", "/planes", "/universidad", "/acerca"] },
];

function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  let items = STUDENT_NAV;
  if (user?.role === "MENTOR") items = [{ to: "/panel-mentor", icon: "chalkboard-user", label: "Mis sesiones" }, { to: "/cuenta", icon: "user", label: "Cuenta" }, { to: "/acerca", icon: "scroll", label: "Acerca" }];
  if (user?.role === "UNI_ADMIN") items = [{ to: "/panel-universidad", icon: "chart-column", label: "Panel" }, { to: "/cuenta", icon: "user", label: "Cuenta" }, { to: "/acerca", icon: "scroll", label: "Acerca" }];
  if (user?.role === "ADMIN") items = [{ to: "/admin", icon: "gauge", label: "Admin" }, { to: "/panel-universidad", icon: "chart-column", label: "Universidad" }, { to: "/cuenta", icon: "user", label: "Cuenta" }, { to: "/acerca", icon: "scroll", label: "Acerca" }];
  return (
    <nav>
      {items.map((it) => {
        const m = "match" in it && it.match ? it.match : [it.to];
        const on = m.some((p) => (p === "/" ? loc.pathname === "/" : loc.pathname.startsWith(p)));
        return (
          <NavLink key={it.to} to={it.to} className={`nvl ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
            <I n={it.icon} /> <span>{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

const homeFor = (role?: string) => (role === "MENTOR" ? "/panel-mentor" : role === "UNI_ADMIN" ? "/panel-universidad" : role === "ADMIN" ? "/admin" : "/");

/** Zona privada: exige sesión y bienvenida completada (estudiantes). */
function Private() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/ingresar" replace state={{ from: loc.pathname }} />;
  if (user.role === "STUDENT" && !user.onboarded) return <Navigate to="/bienvenida" replace />;
  return (
    <>
      <Header />
      <main id="app">
        <Outlet />
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}

function RoleGate({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to={homeFor(user?.role)} replace />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to={user.role === "STUDENT" && !user.onboarded ? "/bienvenida" : homeFor(user.role)} replace />;
  return (
    <>
      <Header minimal />
      <main id="app">{children}</main>
    </>
  );
}

function OnboardingRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/ingresar" replace />;
  return (
    <>
      <Header />
      <main id="app">
        <Onboarding />
      </main>
    </>
  );
}

const S = ["STUDENT"];

export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/bienvenida" element={<OnboardingRoute />} />
      <Route element={<Private />}>
        <Route path="/" element={<RoleGate roles={S}><Home /></RoleGate>} />
        <Route path="/curso/:id/contexto" element={<RoleGate roles={S}><CourseContext /></RoleGate>} />
        <Route path="/estudiar" element={<RoleGate roles={S}><Study /></RoleGate>} />
        <Route path="/enfoque" element={<RoleGate roles={S}><Focus /></RoleGate>} />
        <Route path="/mentores" element={<RoleGate roles={S}><Mentor /></RoleGate>} />
        <Route path="/mas" element={<RoleGate roles={S}><More /></RoleGate>} />
        <Route path="/planes" element={<Plans />} />
        <Route path="/universidad" element={<University />} />
        <Route path="/acerca" element={<About />} />
        <Route path="/cuenta" element={<Account />} />
        <Route path="/panel-mentor" element={<RoleGate roles={["MENTOR", "ADMIN"]}><MentorPanel /></RoleGate>} />
        <Route path="/panel-universidad" element={<RoleGate roles={["UNI_ADMIN", "ADMIN"]}><UniDashboard /></RoleGate>} />
        <Route path="/admin" element={<RoleGate roles={["ADMIN"]}><Admin /></RoleGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
