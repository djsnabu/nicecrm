# ── Vaihe 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Riippuvuudet ensin (layer cache)
COPY package*.json ./
RUN npm ci

# Lähdekoodi
COPY . .

# PUBLIC_POCKETBASE_URL täytyy tietää build-ajassa (uppoaa client-bundleen)
ARG PUBLIC_POCKETBASE_URL=https://crm.niceevents.fi
ENV PUBLIC_POCKETBASE_URL=$PUBLIC_POCKETBASE_URL

RUN npm run build

# ── Vaihe 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Tarvitaan vain dist + node_modules (ei src tai devDeps)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Astro standalone kuuntelee näitä
ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
