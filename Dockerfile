# Use the official Node.js 18 image optimized for Cloud Run
FROM node:18-slim

# Set the working directory
WORKDIR /app

# Install system dependencies for Google Cloud libraries
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create a non-root user for security
RUN useradd -r -u 1001 -g root appuser && \
    chown -R appuser:root /app && \
    chmod -R 755 /app
USER appuser

# Expose the port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check for container readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]