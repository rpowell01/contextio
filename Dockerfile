
FROM node:22-alpine AS build
WORKDIR /app

# Copy root package files for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

# Copy web package.json before install (needed for web dependencies)
COPY packages/web/package.json packages/web/package.json

# Enable corepack and install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source files
COPY packages/core/src packages/core/src
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/proxy/src packages/proxy/src
COPY packages/proxy/tsconfig.json packages/proxy/tsconfig.json
COPY packages/logger/src packages/logger/src
COPY packages/logger/tsconfig.json packages/logger/tsconfig.json
COPY packages/redact/src packages/redact/src
COPY packages/redact/tsconfig.json packages/redact/tsconfig.json
COPY packages/web/next.config.mjs packages/web/next.config.mjs
COPY packages/web/postcss.config.cjs packages/web/postcss.config.cjs
COPY packages/web/tailwind.config.js packages/web/tailwind.config.js
COPY packages/web/tsconfig.json packages/web/tsconfig.json
COPY packages/web/app packages/web/app
COPY packages/web/components packages/web/components
COPY packages/web/lib packages/web/lib
COPY packages/web/types packages/web/types
COPY packages/web/globals.css packages/web/globals.css
COPY packages/web/config packages/web/config

# Build all packages
RUN pnpm -r build


FROM node:22-alpine AS runtime
WORKDIR /app

ARG BUILDTIME
ARG VERSION
ARG REVISION

LABEL org.opencontainers.image.title="contextio"
LABEL org.opencontainers.image.description="LLM API proxy with redaction, logging, and web UI. Zero external dependencies."
LABEL org.opencontainers.image.url="https://github.com/larsderidder/contextio"
LABEL org.opencontainers.image.source="https://github.com/larsderidder/contextio"
LABEL org.opencontainers.image.vendor="Lars de Ridder"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILDTIME}"
LABEL org.opencontainers.image.revision="${REVISION}"

ENV NODE_ENV=production
ENV CONTEXT_PROXY_BIND_HOST=0.0.0.0
ENV CONTEXT_PROXY_PORT=4040
ENV CONTEXT_PROXY_PLUGINS=/app/logger-plugin.js,/app/redact-plugin.js
ENV LOG_TRAFFIC=false
ENV DEBUG_ROUTING=false

COPY --from=build /app/packages/proxy/dist ./dist
COPY --from=build /app/packages/proxy/package.json ./package.json
COPY --from=build /app/packages/core/package.json ./node_modules/@contextio/core/package.json
COPY --from=build /app/packages/core/dist ./node_modules/@contextio/core/dist
COPY --from=build /app/packages/logger/package.json ./node_modules/@contextio/logger/package.json
COPY --from=build /app/packages/logger/dist ./node_modules/@contextio/logger/dist
COPY --from=build /app/packages/redact/package.json ./node_modules/@contextio/redact/package.json
COPY --from=build /app/packages/redact/dist ./node_modules/@contextio/redact/dist

COPY --from=build /app/packages/web/.next/standalone ./web
COPY --from=build /app/packages/web/.next/static ./web/.next/static
COPY --from=build /app/packages/web/package.json ./web/package.json
COPY --from=build /app/packages/web/node_modules ./web/node_modules

# ✅ FIXED: Proper JS (no HTML escaping)
RUN printf '%s\n' \
'import { createLoggerPlugin } from "@contextio/logger";' \
'const captureDir = process.env.LOGGER_CAPTURE_DIR;' \
'const maxSessions = process.env.LOGGER_MAX_SESSIONS ? parseInt(process.env.LOGGER_MAX_SESSIONS, 10) : 0;' \
'export default () => createLoggerPlugin({ captureDir, maxSessions });' \
> /app/logger-plugin.js && \
printf '%s\n' \
'import { createRedactPlugin } from "@contextio/redact";' \
'const preset = process.env.REDACT_PRESET || "pii";' \
'const reversible = process.env.REDACT_REVERSIBLE === "true";' \
'const policyFile = process.env.REDACT_POLICY_FILE;' \
'const config = policyFile ? { policyFile, reversible } : { preset, reversible };' \
'export default () => createRedactPlugin(config);' \
> /app/redact-plugin.js

USER node
EXPOSE 4040
EXPOSE 4041

# Create a startup script that runs both proxy and web server
RUN printf '%s\n' \
'#!/bin/sh' \
'echo "Starting ContextIO Proxy on port 4040..."' \
'node dist/server.js &' \
'echo "Starting ContextIO Web UI on port 4041..."' \
'cd web && NEXT_PUBLIC_API_URL=http://localhost:4040 pnpm start -- -p 4041' \
> /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
