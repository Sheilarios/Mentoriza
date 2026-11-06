import { Link } from "react-router-dom";

/** Icono de Font Awesome Free (incluido localmente). */
export function I({ n, brand = false, className = "" }: { n: string; brand?: boolean; className?: string }) {
  return <i className={`${brand ? "fa-brands" : "fa-solid"} fa-${n} ${className}`} aria-hidden="true" />;
}

export function Logo({ className = "lg" }: { className?: string }) {
  return (
    <svg className={className} viewBox="260 240 740 720" role="img" aria-label="Logo de Mentoriza">
      <path d="M413 358Q415 350 430 344L612 273Q626 268 640 273L828 346Q845 354 840 364L765 407Q690 372 628 372Q560 372 495 408L430 372Q412 364 413 358ZM507 418Q630 360 752 418L752 470Q745 482 725 480Q630 440 530 480Q507 482 507 470ZM818 400L834 392L834 440L848 478Q846 496 828 496L812 496Q800 494 801 476L818 440Z" fill="var(--lb)" />
      <circle cx="423" cy="535" r="80" fill="var(--lb)" />
      <circle cx="791" cy="590" r="70" fill="#FF9F43" />
      <path d="M640 712C700 690 760 662 830 660C920 662 960 720 960 800L960 880C960 925 920 938 890 930C850 920 835 890 835 850L835 790C830 760 800 750 760 755L650 740Z" fill="#FF9F43" />
      <path d="M300 790C300 680 360 620 440 622C520 625 580 690 640 710L748 755L650 810C610 800 560 760 520 740C470 715 420 725 420 790L420 880C420 920 380 935 350 932C315 928 300 900 300 860Z" fill="var(--lb)" />
      <path d="M478 840Q478 816 500 816Q580 818 632 850L632 940Q550 900 478 878ZM778 838Q778 816 756 816Q690 818 636 850L636 940Q700 900 778 876Z" fill="#3DDC97" />
      <path d="M965 332Q972 392 1030 400Q972 408 965 468Q958 408 902 400Q958 392 965 332Z" fill="#3DDC97" />
    </svg>
  );
}

/** Mascota de Mentoriza (búho con birrete). */
export function Mascot({ cls = "" }: { cls?: string }) {
  return (
    <svg className={`mas ${cls}`} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="110" rx="30" ry="5" fill="rgba(0,0,0,.1)" />
      <g className="bob">
        <ellipse cx="24" cy="74" rx="9" ry="16" fill="#3DDC97" transform="rotate(12 24 74)" />
        <ellipse cx="96" cy="74" rx="9" ry="16" fill="#3DDC97" transform="rotate(-12 96 74)" />
        <ellipse cx="60" cy="68" rx="38" ry="36" fill="#1E5AA8" />
        <ellipse cx="60" cy="80" rx="23" ry="20" fill="#FAFAF8" opacity=".6" />
        <g className="ey">
          <circle cx="47" cy="58" r="6.5" fill="#FAFAF8" />
          <circle cx="73" cy="58" r="6.5" fill="#FAFAF8" />
          <circle cx="49" cy="56" r="2.4" fill="#2D2D2D" />
          <circle cx="75" cy="56" r="2.4" fill="#2D2D2D" />
        </g>
        <path d="M54 67L66 67L60 77Z" fill="var(--pe)" />
        <path d="M30 34L60 22L90 34L60 46Z" fill="#3DDC97" />
        <path d="M90 34V50" stroke="var(--pe)" strokeWidth="3" strokeLinecap="round" />
        <g className="bk">
          <path d="M28 90Q44 82 60 92Q76 82 92 90V110Q76 102 60 110Q44 102 28 110Z" fill="#FF9F43" />
        </g>
      </g>
    </svg>
  );
}

export function Footer() {
  return (
    <div className="ft">
      Mentoriza® — marca en trámite ante Indecopi · Software protegido por derechos de autor
      <br />
      Sílabos y rúbricas usados con autorización de universidades aliadas · © 2026 NovaDevs
      <br />
      <Link to="/acerca">Acerca de · Versiones · Validación</Link>
    </div>
  );
}

export function Loading({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="loading">
      <div>
        <div className="spin" />
        {text}
      </div>
    </div>
  );
}

export function ErrorText({ msg }: { msg?: string | null }) {
  return (
    <p className="err" role="alert">
      {msg || ""}
    </p>
  );
}

export const initials = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
