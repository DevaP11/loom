# Multi-stage Dockerfile for Next.js (with Bun) and Go API

# Stage 1: Build Go API
FROM golang:1.25-alpine AS go-builder

WORKDIR /go-app

# Copy Go modules files
COPY api/go.mod api/go.sum* ./

# Download dependencies
RUN go mod download

# Copy Go source code
COPY api/ ./

# Build Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /go-api .

# Stage 2: Build Next.js with Bun
FROM oven/bun:1-alpine AS bun-builder

WORKDIR /nextjs-app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy Next.js source code (excluding node_modules and api directory)
COPY next.config.* ./
COPY components.json* ./
COPY jsconfig.json* ./
COPY eslint.config.mjs* ./
COPY tsconfig.json* ./
COPY postcss.config.mjs* ./
COPY public ./public
COPY src ./src

# Build Next.js app
RUN bun run build

# Stage 3: Production runtime
FROM oven/bun:1.3.5-alpine AS runner

WORKDIR /app

# Install bun and dumb-init
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
RUN apk add --no-cache dumb-init ca-certificates

# Copy Go binary from go-builder
COPY --from=go-builder /go-api /app/go-api

# Copy Next.js build from bun-builder
COPY --from=bun-builder /nextjs-app/.next /app/.next
COPY --from=bun-builder /nextjs-app/node_modules /app/node_modules
COPY --from=bun-builder /nextjs-app/package.json /app/package.json
COPY --from=bun-builder /nextjs-app/public /app/public

# Create startup script to run both services
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Go API in background' >> /app/start.sh && \
    echo '/app/go-api &' >> /app/start.sh && \
    echo 'GO_PID=$!' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Next.js in foreground' >> /app/start.sh && \
    echo 'cd /app && bun run start &' >> /app/start.sh && \
    echo 'NEXTJS_PID=$!' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Wait for any process to exit' >> /app/start.sh && \
    echo 'wait -n' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Exit with status of process that exited first' >> /app/start.sh && \
    echo 'exit $?' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports (4144 for Next.js, 8080 for Go API)
EXPOSE 4144 8080

# Set environment to production
ENV NODE_ENV=production

# Start both services using dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/start.sh"]
