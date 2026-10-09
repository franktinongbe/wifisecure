FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/ingestor/package.json ./apps/ingestor/package.json
RUN npm ci --workspace apps/ingestor --include-workspace-root=false

COPY apps/ingestor ./apps/ingestor
WORKDIR /app/apps/ingestor
RUN npm run build
USER node

CMD ["npm", "start"]
