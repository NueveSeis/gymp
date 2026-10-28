# syntax=docker/dockerfile:1
# Imagen de producción para Dokploy (Build Type: Dockerfile)

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1) Dependencias (se cachea mientras no cambie package-lock.json)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2) Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Imagen final: solo el servidor standalone (~150 MB en lugar de ~1 GB)
FROM base AS runner
RUN apk add --no-cache su-exec \
  && addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/database ./database
COPY --chmod=755 scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/uploads /app/.next/cache && chown -R nextjs:nodejs /app/uploads /app/.next/cache

EXPOSE 3000
# Liveness sin tocar la base: si Hostinger tiene un bache no se reinicia el contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health?live=1" >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "scripts/start.mjs"]
