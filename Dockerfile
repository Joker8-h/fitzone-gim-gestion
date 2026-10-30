FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install --include=dev --prefix client && \
    npm install --include=dev --prefix server

COPY client ./client
COPY server ./server

RUN npm run build --prefix client && \
    npm run build --prefix server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "start", "--prefix", "server"]
