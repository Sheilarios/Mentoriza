import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { aiEnabled } from "./lib/ai.js";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`✅ Mentoriza API escuchando en http://localhost:${config.port}`);
  console.log(`   IA: ${aiEnabled() ? `activada (${config.ai.model})` : "modo local (sin AI_API_KEY)"} · Pagos: ${config.paymentsMode}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
