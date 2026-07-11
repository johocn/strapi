FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV STRAPI_DISABLE_STARTUP_LOGS=false
ENV STRAPI_HIDE_STARTUP_MESSAGE=false

RUN apk add --no-cache libpq tzdata && \
    mkdir -p /app/dist /app/uploads /app/config /app/public && \
    chown -R node:node /app

USER node

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=node:node dist ./dist
COPY --chown=node:node config ./config
COPY --chown=node:node public ./public

EXPOSE 1337

CMD ["node", "dist/src/index.js"]