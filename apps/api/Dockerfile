FROM node:20-alpine

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

EXPOSE 4000
CMD ["npm", "run", "dev"]
