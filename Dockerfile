FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies using package-lock for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code with non-root ownership
COPY --chown=node:node . .

# Run application as non-root user
USER node

EXPOSE 3001

CMD ["node", "server.js"]