/**
 * Cliente de IA compatible con la API de OpenAI (OpenAI, Azure OpenAI, Groq, OpenRouter, Ollama, etc.).
 * Si no hay AI_API_KEY configurada, Mentoriza usa respuestas locales deterministas para que la
 * plataforma siga funcionando (modo demostración).
 */
import { config } from "../config.js";
import { toLines } from "./rules.js";

export const aiEnabled = () => Boolean(config.ai.apiKey);

type Content = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

async function chat(system: string, user: Content, json: boolean): Promise<string | null> {
  if (!aiEnabled()) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
  try {
    const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.ai.apiKey}` },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      console.warn("[ai] respuesta no válida", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn("[ai] error", (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s.replace(/^```(?:json)?|```$/g, "").trim()) as T;
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

const SYSTEM =
  "Eres Mentoriza, un compañero de estudio amable para universitarios de Lima, Perú. Respondes en español claro y cercano. " +
  "Nunca das solo el resultado: enseñas el método en pasos cortos, conectados con el sílabo y la rúbrica del curso.";

export interface StudyAnswer {
  topic: string;
  steps: string[];
  rubricHint: string;
  checkQ: string;
  checkA: string;
  source: "ai" | "local";
}

export async function solveStepByStep(course: { name: string; syllabus: string[]; rubric: string[] }, question: string): Promise<StudyAnswer> {
  const prompt =
    `Curso: ${course.name}\nSílabo:\n${course.syllabus.join("\n") || "(no disponible)"}\nRúbrica:\n${course.rubric.join("\n") || "(no disponible)"}\n` +
    `Duda del estudiante: ${question}\n` +
    'Responde SOLO JSON: {"tema":"tema del sílabo (copia exacta de la lista si existe)","pasos":["3 a 5 pasos cortos"],"rubrica":"criterio de la rúbrica y cómo cumplirlo","check":{"q":"pregunta corta de verificación","a":"respuesta esperada"}}';
  const r = parseJson<{ tema?: string; pasos?: string[]; rubrica?: string; check?: { q?: string; a?: string } }>(await chat(SYSTEM, prompt, true));
  if (r && Array.isArray(r.pasos) && r.pasos.length) {
    return {
      topic: String(r.tema || course.syllabus[0] || course.name),
      steps: r.pasos.slice(0, 6).map((p) => String(p).replace(/^\s*paso\s*\d+\s*[:.)-]\s*/i, "")),
      rubricHint: String(r.rubrica || course.rubric[0] || "Revisa los criterios que te dio tu profesor."),
      checkQ: String(r.check?.q || "¿Qué método usaste y por qué?"),
      checkA: String(r.check?.a || "Puedes justificar cada paso."),
      source: "ai",
    };
  }
  return localAnswer(course, question);
}

export function localAnswer(course: { name: string; syllabus: string[]; rubric: string[] }, question: string): StudyAnswer {
  const words = question.toLowerCase().split(/[^a-záéíóúñü0-9]+/i).filter((w) => w.length > 3);
  const topic = course.syllabus.find((l) => words.some((w) => l.toLowerCase().includes(w))) || course.syllabus[0] || course.name;
  return {
    topic,
    steps: [
      `Escribe con tus palabras qué te piden: “${question.slice(0, 80)}”.`,
      `Ubica el tema del sílabo que lo cubre: ${topic}.`,
      "Anota tus datos y el método que vieron en clase.",
      "Resuelve primero un caso pequeño y luego el tuyo.",
      "Revisa tu resultado con la rúbrica antes de entregarlo.",
    ],
    rubricHint: course.rubric[0] || "Revisa los criterios que te dio tu profesor.",
    checkQ: "¿Qué tema usaste y por qué?",
    checkA: `Usaste ${topic} y puedes justificar cada paso.`,
    source: "local",
  };
}

export async function explainStep(courseName: string, question: string, step: string): Promise<string> {
  const t = await chat(
    SYSTEM,
    `Explica este paso con una analogía cotidiana simple (máximo 60 palabras, sin markdown). Curso: ${courseName}. Duda: ${question}. Paso: ${step}`,
    false,
  );
  return t || "Piensa en este paso como armar un plano antes de construir: primero anota qué tienes y qué buscas, después elige la herramienta.";
}

export async function checkAnswer(q: string, expected: string, answer: string): Promise<{ ok: boolean; feedback: string }> {
  const r = parseJson<{ ok?: boolean; feedback?: string }>(
    await chat(
      SYSTEM,
      `Pregunta: ${q}\nRespuesta esperada: ${expected}\nRespuesta del estudiante: ${answer}\nEvalúa si entendió lo esencial. Responde SOLO JSON {"ok":true,"feedback":"una frase breve y amable, con una pista si falló"}`,
      true,
    ),
  );
  if (r && typeof r.ok === "boolean") return { ok: r.ok, feedback: String(r.feedback || "") };
  const w = expected.toLowerCase().split(/[^a-záéíóúñü0-9]+/i).filter((x) => x.length > 4);
  const hits = w.filter((x) => answer.toLowerCase().includes(x)).length;
  return { ok: hits >= Math.min(2, w.length), feedback: "Compara tu respuesta con la respuesta guía." };
}

export async function extractDocument(input: { text?: string; imageDataUrl?: string }): Promise<{ rubric: string[]; syllabus: string[] }> {
  const P =
    'Del documento de un curso universitario extrae los criterios de la rúbrica (con su peso si aparece) y los temas del sílabo. Responde SOLO JSON {"rubrica":["criterio"],"silabo":["tema"]}; usa listas vacías si no hay.';
  let raw: string | null = null;
  if (input.imageDataUrl) {
    raw = await chat(SYSTEM, [{ type: "text", text: P }, { type: "image_url", image_url: { url: input.imageDataUrl } }], true);
  } else if (input.text) {
    raw = await chat(SYSTEM, `${P}\nTexto:\n${input.text.slice(0, 8000)}`, true);
  }
  const r = parseJson<{ rubrica?: string[]; silabo?: string[] }>(raw);
  if (r && (r.rubrica?.length || r.silabo?.length)) return { rubric: (r.rubrica || []).map(String), syllabus: (r.silabo || []).map(String) };
  return { rubric: input.text ? toLines(input.text).slice(0, 30) : [], syllabus: [] };
}

const CANNED = [
  "Entiendo. ¿Qué intentaste hasta ahora?",
  "Probemos dividirlo en partes. ¿Qué datos tienes y qué te piden?",
  "Vas bien. ¿Qué pasa si lo aplicas a un ejemplo pequeño?",
  "Perfecto, ya casi. ¿Cómo lo explicarías con tus palabras?",
];

export async function mentorReply(mentorName: string, courseName: string, topic: string, message: string, n: number): Promise<string> {
  const t = await chat(
    `Eres ${mentorName}, mentor universitario amable de Mentoriza. Guías con preguntas, en español, máximo 40 palabras, sin markdown.`,
    `Curso: ${courseName}. Duda: ${topic}. Mensaje del estudiante: ${message}`,
    false,
  );
  return t || CANNED[n % CANNED.length];
}
