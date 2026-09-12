FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm install
WORKDIR /app/apps/web
RUN npm install

COPY apps/web ./

EXPOSE 3000
CMD ["npm", "run", "dev"]
