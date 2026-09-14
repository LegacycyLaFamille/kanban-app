FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p /data && chown node:node /data

COPY --from=build /app /app

ENV PORT=3000
ENV SQLITE_DB_LOCATION=/data/todo.db
EXPOSE 3000
USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]