# Multi-stage build for production-ready container
FROM node:20-slim AS builder
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install

# Copy source files and build frontend & server bundle
COPY . .
RUN npm run build

# Runner stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled frontend and bundled server from builder stage
COPY --from=builder /app/dist ./dist

# Expose container port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
