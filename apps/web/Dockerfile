FROM node:20-alpine

ENV NODE_ENV=production
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm install
WORKDIR /app/apps/web
RUN npm install

COPY apps/web ./

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
