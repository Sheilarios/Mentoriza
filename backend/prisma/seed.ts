/**
 * Datos iniciales de Mentoriza. Es idempotente: se puede ejecutar en cada despliegue.
 * - Universidades aliadas, cuentas de demostración y mentores.
 * - Evidencia del programa Científica Sprint 2026 (cuaderno de entregables de NovaDevs).
 */
import "dotenv/config";
import { PrismaClient, type Role, type Plan } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = [path.join(here, "data/program.json"), path.join(here, "../../prisma/data/program.json"), path.resolve("prisma/data/program.json")].find((p) => fs.existsSync(p));
if (!dataPath) throw new Error("No se encontró prisma/data/program.json");
const program = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const ACCESS = process.env.SEED_UNI_ACCESS_CODE || "mentoriza2026";
const DEMO_PW = process.env.SEED_DEMO_PASSWORD || "mentoriza2026";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@mentoriza.pe").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mentoriza2026";
const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).format(new Date());

const ORG: Record<string, string> = {
  "universidad tecnologica del perú": "Universidad Tecnológica del Perú",
  "universidad tecnológica del perú": "Universidad Tecnológica del Perú",
  "universidad cientifica del sur": "Universidad Científica del Sur",
  "univesidad san ignacio loyola": "Universidad San Ignacio de Loyola",
};

async function main() {
  const accessHash = await bcrypt.hash(ACCESS, 10);
  const unis = [
    { name: "Universidad Científica del Sur", shortName: "UCSUR", domain: "cientifica.edu.pe", monthlyCredits: 4 },
    { name: "Universidad Tecnológica del Perú", shortName: "UTP", domain: "utp.edu.pe", monthlyCredits: 4 },
  ];
  const uniIds: Record<string, string> = {};
  for (const u of unis) {
    const r = await prisma.university.upsert({ where: { domain: u.domain }, update: {}, create: { ...u, accessCodeHash: accessHash } });
    uniIds[u.domain] = r.id;
  }

  const user = async (email: string, name: string, role: Role, plan: Plan, pw: string, extra: Record<string, unknown> = {}, demo = false) => {
    const passwordHash = await bcrypt.hash(pw, 10);
    // Las cuentas de prueba recuperan su contraseña en cada despliegue para que siempre se pueda ingresar.
    return prisma.user.upsert({ where: { email }, update: demo ? { passwordHash } : {}, create: { email, name, role, plan, passwordHash, onboarded: true, ...extra } });
  };

  await user(ADMIN_EMAIL, "Administración Mentoriza", "ADMIN", "FREE", ADMIN_PASSWORD);
  await user("coordinacion@cientifica.edu.pe", "Coordinación Académica UCSUR", "UNI_ADMIN", "UNIVERSITY", DEMO_PW, { universityId: uniIds["cientifica.edu.pe"] }, true);
  const ana = await user("ana@cientifica.edu.pe", "Ana", "STUDENT", "UNIVERSITY", DEMO_PW, { universityId: uniIds["cientifica.edu.pe"], credits: 4, creditsMonth: month, career: "Ingeniería de Sistemas", cycle: 5 }, true);
  const luis = await user("luis.prueba@gmail.com", "Luis", "STUDENT", "FREE", DEMO_PW, { career: "Administración", cycle: 3 }, true);
  const mentorUser = await user("valeria@mentoriza.pe", "Valeria Quispe", "MENTOR", "FREE", DEMO_PW, {}, true);

  if ((await prisma.course.count({ where: { userId: ana.id } })) === 0) {
    await prisma.course.create({ data: { userId: ana.id, name: "Desarrollo Web", emoji: "💻", syllabus: ["Variables y tipos de datos", "Funciones y alcance", "Arreglos y métodos map/filter", "Manipulación del DOM", "Consumo de APIs con fetch"] } });
    await prisma.course.create({ data: { userId: ana.id, name: "Cálculo II", emoji: "📐", syllabus: ["Integrales indefinidas", "Integración por partes", "Sustitución trigonométrica", "Series y convergencia"] } });
  }
  if ((await prisma.course.count({ where: { userId: luis.id } })) === 0) {
    await prisma.course.create({ data: { userId: luis.id, name: "Estadística", emoji: "📊", syllabus: ["Medidas de tendencia central", "Medidas de dispersión", "Probabilidad básica", "Distribución normal"] } });
  }

  const mentors = [
    { name: "Valeria Q.", headline: "Ciclo 10 · Ing. de Sistemas", courses: ["Desarrollo Web"], rating: 4.9, userId: mentorUser.id },
    { name: "Rodrigo P.", headline: "Ciclo 9 · Ing. de Software", courses: ["Desarrollo Web"], rating: 4.8 },
    { name: "Camila R.", headline: "Magíster en Matemática", courses: ["Cálculo II"], rating: 4.8 },
    { name: "Lucía T.", headline: "Asistente de cátedra · Matemática", courses: ["Cálculo II"], rating: 5.0 },
    { name: "Diego M.", headline: "Egresado · Estadística", courses: [], rating: 4.7 },
  ];
  for (const m of mentors) {
    const ex = await prisma.mentor.findFirst({ where: { name: m.name } });
    if (!ex) await prisma.mentor.create({ data: m });
  }

  // ---------- Evidencia del programa (se refresca en cada ejecución) ----------
  await prisma.$transaction([
    prisma.interview.deleteMany(),
    prisma.interview.createMany({
      data: program.interviews.map((i: Record<string, unknown>) => ({ ...i, date: new Date(`${i.date}T12:00:00-05:00`), organization: ORG[String(i.organization).toLowerCase()] || i.organization })),
    }),
    prisma.hypothesis.deleteMany(),
    prisma.hypothesis.createMany({ data: program.hypotheses }),
    prisma.prototypeTest.deleteMany(),
    prisma.prototypeTest.createMany({ data: program.tests }),
    prisma.prototypeChange.deleteMany(),
    prisma.prototypeChange.createMany({ data: program.changes }),
    prisma.marketLevel.deleteMany(),
    prisma.marketLevel.createMany({
      data: [
        { level: "TAM", quantity: 1627598, order: 1, method: "Total de estudiantes universitarios matriculados en el Perú durante 2024.", source: "MINEDU, Diagnóstico de brechas 2027-2029 (agosto 2025), sección 3.2.11." },
        { level: "SAM", quantity: 702085, order: 2, method: "Estudiantes universitarios matriculados en la provincia de Lima (2023), categoría «LIMA: LIMA» del SIRIES.", source: "MINEDU, Estadísticas a nivel nacional: Tabla de matriculados, 2024." },
        { level: "SOM", quantity: 100, order: 3, method: "Meta interna y provisional para los primeros 12 meses. No es una cifra de mercado publicada.", source: "Estimación propia del equipo NovaDevs, 2026." },
      ],
    }),
    prisma.costItem.deleteMany(),
    prisma.costItem.createMany({
      data: [
        ["fixed", "Alquiler o espacio", 0, "Trabajo remoto del equipo."],
        ["fixed", "Servicios (luz, agua, internet)", 100, "Aporte estimado para conectividad y servicios."],
        ["fixed", "Licencias y software", 80, "Herramientas de desarrollo y diseño."],
        ["fixed", "Sueldos fijos", 0, "Equipo fundador trabaja inicialmente sin sueldo."],
        ["fixed", "Hosting y dominios", 120, "Alojamiento web, servidor y dominio."],
        ["fixed", "Contabilidad y trámites", 100, "Gastos administrativos estimados."],
        ["fixed", "Mantenimiento y soporte", 150, "Mantenimiento y soporte técnico."],
        ["variable", "Comisión de pasarela de pago", 0.9, "Comisión estimada por transacción."],
        ["variable", "Consumo de API de IA", 2, "Consumo estimado de API de IA por estudiante."],
        ["variable", "Almacenamiento y procesamiento", 0.5, "Almacenamiento y procesamiento adicional."],
      ].map(([kind, label, amount, note], order) => ({ kind: String(kind), label: String(label), amount: Number(amount), note: String(note), order })),
    }),
  ]);

  const settings: Record<string, unknown> = {
    price: 15,
    unitsPerMonth: 100,
    unit: "Una suscripción Premium mensual por estudiante",
    pricing: [
      { q: "¿Qué paga hoy el cliente?", a: "Usa ChatGPT, YouTube, compañeros y grupos de WhatsApp; algunos recurren a profesores particulares o academias, sin gasto frecuente." },
      { q: "¿Qué cobra el sustituto?", a: "Las herramientas de IA tienen planes gratuitos y de pago; una hora de tutor particular cuesta alrededor de S/ 40. Mentoriza: S/ 15 al mes, adaptado al sílabo y la rúbrica." },
      { q: "¿Qué escuchamos sobre pagar?", a: "La hipótesis de pago directo se cayó: por eso hay acceso gratuito, Premium opcional y licencias para universidades." },
      { q: "¿Cuánto ahorra?", a: "Los entrevistados reportan bloqueos de 1 a 3 horas por duda; Mentoriza busca reducir ese tiempo con pasos guiados." },
    ],
    team: {
      name: "NovaDevs",
      venture: "Mentoriza",
      program: "Científica Sprint 2026 · Universidad Científica del Sur",
      members: [
        { name: "Sheila Betty Rios Cordova", role: "Representante · Comunicación" },
        { name: "Alexander Andri Yupanqui Segura", role: "Validación" },
        { name: "Erick Alexander Colan Espinoza", role: "Producto" },
        { name: "Ariana Sofia Medina Capcha", role: "Negocio" },
      ],
    },
    versions: [
      { v: "v1", title: "Estudio guiado con rúbrica", desc: "Método socrático paso a paso, temporizador de enfoque y vinculación de rúbricas docentes.", source: "Sprint 2 · 11 entrevistas" },
      { v: "v2", title: "Bienvenida separada por tipo de acceso", desc: "Convenio institucional y cuenta libre claramente separados en el inicio.", source: "Prueba de prototipo · Angie" },
      { v: "v2", title: "Confirmación visible de la rúbrica", desc: "Indicador verde al procesar la rúbrica o el sílabo del curso.", source: "Prueba de prototipo · Christi" },
      { v: "v2", title: "Prueba sin tarjeta ni costo", desc: "Planes transparentes: la fase beta es gratuita y no pide métodos de pago.", source: "Prueba de prototipo · Alonso" },
      { v: "v3", title: "Plataforma completa con backend", desc: "Cuentas seguras, base de datos, IA conectada, mentorías, panel universitario y administración.", source: "Entregable final" },
    ],
    canvas: {
      partners: "Universidades e institutos (sílabos y licencias B2B), profesores y delegados (early adopters), centros de estudiantes (embajadores).",
      activities: "Mejora continua de la IA para evitar alucinaciones, onboarding y soporte, validación de tutores, marketing digital y convenios B2B, actualización de sílabos y rúbricas.",
      value: "Un compañero de estudio inteligente que combina la inmediatez de la IA con la explicación paso a paso de un tutor, usando el sílabo y la rúbrica del curso.",
      relationship: "Estudiantes: autoservicio guiado y comunidad. Universidades: acompañamiento personalizado (Customer Success).",
      segments: "Universitarios de pregrado en Lima que estudian de forma autónoma, mayormente de noche. Clientes que pagan: universidades e institutos.",
      resources: "Plataforma web, nube, API de IA, base de sílabos y rúbricas, equipo de desarrollo y UX, red de mentores por comisión.",
      channels: "Estudiantes: TikTok, Instagram, WhatsApp y delegados. Universidades: venta B2B, ferias educativas y networking con decanos.",
      costs: "Fijos: hosting, licencias, API de IA base. Variables: pago a tutores por sesión, pasarela de pago y adquisición.",
      revenue: "Licencias anuales B2B por volumen de alumnos; Freemium con Premium S/ 15/mes; comisión por sesiones con tutores.",
    },
    protection: [
      { asset: "Marca y lema «Mentoriza»", figure: "Registro de marca (Indecopi, clases 41/42 de Niza)", next: "Búsqueda fonética y solicitud de registro." },
      { asset: "Código fuente e interfaz", figure: "Obra de software (Dirección de Derecho de Autor)", next: "Depósito del código y la arquitectura." },
      { asset: "Heurística de contextualización y prompts", figure: "Secreto empresarial", next: "Acuerdos de confidencialidad (NDA)." },
      { asset: "Rúbricas y sílabos de aliados", figure: "Protocolo de uso de datos académicos", next: "Convenios con cláusulas de datos." },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } });
  }
  console.log("🌱 Datos iniciales listos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
