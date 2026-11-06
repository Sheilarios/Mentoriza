/**
 * Cuentas de prueba que se muestran debajo del inicio de sesión.
 * Se activan con DEMO_ACCOUNTS (por defecto activas). Para producción con usuarios reales: DEMO_ACCOUNTS=false.
 * La cuenta de administración nunca se incluye porque ve datos privados (contactos de interesados).
 */
export type DemoAccount = {
  key: string;
  email: string;
  label: string;
  description: string;
  icon: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "estudiante-convenio",
    email: "ana@cientifica.edu.pe",
    label: "Estudiante por convenio",
    description: "Universidad Científica del Sur · consultas ilimitadas y créditos de mentoría.",
    icon: "graduation-cap",
  },
  {
    key: "estudiante-gratis",
    email: "luis.prueba@gmail.com",
    label: "Estudiante con plan Gratis",
    description: "3 consultas de IA al día · puede pasar a Premium (pago de prueba).",
    icon: "seedling",
  },
  {
    key: "mentor",
    email: "valeria@mentoriza.pe",
    label: "Mentor",
    description: "Recibe solicitudes de mentoría y responde con ofertas.",
    icon: "chalkboard-user",
  },
  {
    key: "universidad",
    email: "coordinacion@cientifica.edu.pe",
    label: "Universidad",
    description: "Panel de la coordinación académica con el uso de sus estudiantes.",
    icon: "building-columns",
  },
];

export const demoAccountsEnabled = () => (process.env.DEMO_ACCOUNTS ?? "true").toLowerCase() !== "false";
export const demoPassword = () => process.env.SEED_DEMO_PASSWORD || "mentoriza2026";
export const findDemoAccount = (key: string) => DEMO_ACCOUNTS.find((a) => a.key === key);
export const isDemoEmail = (email: string) => DEMO_ACCOUNTS.some((a) => a.email === email.toLowerCase());
