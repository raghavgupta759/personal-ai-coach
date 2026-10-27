# Multi-stage production build for Personal AI Coach
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy application source code
COPY . .

# Build Vite frontend bundle
RUN npm run build

# Production Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy production dependencies and built assets
COPY package*.json ./
RUN npm ci --omit=dev

# Install tsx globally or locally so server.ts can execute
RUN npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts

# Create persistent data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 10000

CMD ["tsx", "server.ts"]
