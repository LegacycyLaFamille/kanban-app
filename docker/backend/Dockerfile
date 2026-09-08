FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p /data && chown node:node /data

COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src/index.js ./src/index.js
COPY src/routes ./src/routes
COPY src/persistence ./src/persistence

ENV SQLITE_DB_LOCATION=/data/todo.db
EXPOSE 3000
USER node

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/items',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "src/index.js"]