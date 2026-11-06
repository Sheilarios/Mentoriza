# Mentoriza — imagen única (frontend React compilado + API Node.js)
# Construir:  docker build -t mentoriza .
# Ejecutar:   docker run -p 4000:4000 --env-file .env mentoriza

# ---------- 1. Frontend ----------
FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- 2. Backend ----------
FROM node:20-bookworm-slim AS backend
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---------- 3. Producción ----------
FROM node:20-bookworm-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
COPY --from=backend /app/backend/prisma ./prisma
COPY --from=backend /app/backend/package.json ./package.json
COPY --from=frontend /app/frontend/dist ./public
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start:prod"]
