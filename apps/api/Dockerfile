FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma

RUN npm install
WORKDIR /app/apps/api
RUN npm install

COPY apps/api ./
COPY prisma ./../../prisma

RUN npx prisma generate --schema ../../prisma/schema.prisma
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
