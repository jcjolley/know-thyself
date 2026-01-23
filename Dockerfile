# Stage 1: Build
FROM node:25-bookworm AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY docs/journeys/ ./docs/journeys/

# Build server (TypeScript -> JavaScript)
RUN npm run build:server

# Build renderer (React -> static files)
RUN npm run build:renderer

# Stage 2: Production
FROM node:25-bookworm-slim

WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip postinstall which needs electron-rebuild)
RUN npm ci --omit=dev --ignore-scripts && npm rebuild better-sqlite3

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy journey documentation
COPY docs/journeys/ ./docs/journeys/

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/server/server/index.js"]
