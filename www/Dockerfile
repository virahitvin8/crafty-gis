# ═══════════════════════════════════════════════════════════
#  FarmHealth — Dockerfile (Google Cloud Ready)
#  ═══════════════════════════════════════════════════════════
#  Bundles the Node.js GEE proxy server with the static
#  frontend files into a single deployable container.
#  ═══════════════════════════════════════════════════════════

# ─── Stage 1: Build / Install Dependencies ───
FROM node:20-slim AS builder

WORKDIR /app

# Copy server files and install dependencies
COPY server/ ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# ─── Stage 2: Runtime ───
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for GEE
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend files
COPY index.html .
COPY manifest.json .
COPY sw.js .
COPY css/ ./css/
COPY js/ ./js/

# Copy server files with node_modules
COPY --from=builder /app/server/ ./server/

# Create directory for GCloud credentials (mount at runtime)
RUN mkdir -p /root/.config/gcloud

# Expose the port Cloud Run expects
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/gee/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the server
CMD ["node", "server/server.js"]
