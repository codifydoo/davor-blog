# syntax=docker/dockerfile:1.7
# Stage 1: build the static site with Astro
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: serve prebuilt HTML with Caddy (static files, brotli/zstd/gzip, cache headers)
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 3000
