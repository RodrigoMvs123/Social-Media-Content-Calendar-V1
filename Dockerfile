# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy server package files first
COPY --from=builder /app/server/package*.json ./server/

# Install server production dependencies
RUN cd server && npm ci --omit=dev

# Copy built application
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server

# Set environment variables
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server directly
WORKDIR /app/server
CMD ["node", "index.js"]