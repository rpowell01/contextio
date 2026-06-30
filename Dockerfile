
FROM node:22-alpine AS build
WORKDIR /app

# Copy root package files for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./

# Copy all package.json files for workspace resolution
COPY packages/core/package.json packages/core/package.json
COPY packages/proxy/package.json packages/proxy/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/redact/package.json packages/redact/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/cli/package.json packages/cli/package.json

# Enable corepack and install dependencies
# Set PNPM_MINIMUM_RELEASE_AGE=0 to allow newer packages in lockfile
# Export PATH to include pnpm global bin directory
# Use --ignore-scripts then rebuild for native modules (sharp, unrs-resolver)
RUN corepack enable && \
    export PATH="$PATH:/root/.local/share/pnpm/bin" && \
    pnpm config set minimum-release-age 0 --global && \
    pnpm install --ignore-scripts && \
    pnpm rebuild sharp unrs-resolver

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
COPY packages/web/public packages/web/public

# Copy cli package source files
COPY packages/cli/src packages/cli/src
COPY packages/cli/tsconfig.json packages/cli/tsconfig.json

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
ENV LOGGER_CAPTURE_DIR=/app/captures
ENV REDACT_POLICY_FILE=/app/custom-policy.json
ENV NEXT_PUBLIC_SITE_URL=http://localhost:4041

# Enable corepack for pnpm in runtime
RUN corepack enable

# Copy node_modules and packages directory (symlinks in node_modules point here)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

# Copy proxy dist to root for server entry
COPY --from=build /app/packages/proxy/dist ./dist

# Copy web standalone (preserving symlink structure)
COPY --from=build /app/packages/web/.next/standalone ./standalone
COPY --from=build /app/packages/web/.next/static ./standalone/.next/static
COPY --from=build /app/packages/web/.next/static ./standalone/packages/web/.next/static

# Copy bundled default policy file
COPY --from=build /app/packages/web/public/default-policy.json /app/default-policy.json

# Create captures directory
RUN mkdir -p /app/captures && chmod 777 /app/captures

# Create custom-policy.json with default content if it doesn't exist
RUN if [ ! -f /app/custom-policy.json ]; then \
    cp /app/default-policy.json /app/custom-policy.json; \
    fi && chmod 666 /app/custom-policy.json

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

# Create a startup script that runs both proxy and web server
# Note: API routes are served by the web server on port 4041, so we use relative URLs
# NEXT_PUBLIC_API_URL is left empty to use relative URLs for same-origin API calls
RUN printf '%s\n' \
'#!/bin/sh' \
'echo "Starting ContextIO Proxy on port 4040..."' \
'node dist/server.js &' \
'echo "Starting ContextIO Web UI on port 4041..."' \
'cd standalone/packages/web && NEXT_PUBLIC_SITE_URL=http://localhost:4041 LOGGER_CAPTURE_DIR=/app/captures PORT=4041 node server.js' \
> /app/start.sh && chmod +x /app/start.sh

# Fix permissions for node user (after all files are created)
RUN chown -R node:node /app

USER node
EXPOSE 4040
EXPOSE 4041

CMD ["/app/start.sh"]
