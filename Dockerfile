# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.0

# ─── Base ───────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ARG PNPM_VERSION
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# ─── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set confirmModulesPurge false \
    && pnpm install --frozen-lockfile

# ─── Build ──────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* come from Kamal builder.args (sourced via .kamal/secrets).
# Do not rely on copying .env.production — Kamal builds from a git clone that excludes gitignored files.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_WEB_URL
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

ENV DOCKER_BUILD=1 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL \
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=3072" \
    UV_THREADPOOL_SIZE=2 \
    NEXT_CPU_COUNT=1

# Webpack uses less peak RAM than Turbopack on small builders.
RUN pnpm build

# ─── Runner ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
