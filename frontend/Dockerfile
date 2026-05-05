# ════════════════════════════════════════════════════════════════
#  Friomac CRM Frontend — Multi-stage Dockerfile (PRODUÇÃO)
#  Build do Vite → assets servidos por nginx.
# ════════════════════════════════════════════════════════════════

# ── Stage 1: deps ───────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ── Stage 2: builder ────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ── Stage 3: runtime (nginx) ────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache wget
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1
