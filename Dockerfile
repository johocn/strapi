# 阶段1: 构建阶段（安装完整依赖 + 编译 + 构建 admin panel）
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建所需系统依赖
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# 复制源代码和插件
COPY . .

# 构建所有插件
RUN for plugin in plugins/zhao-*/; do \
      if [ -f "$plugin/package.json" ]; then \
        echo "Building plugin: $plugin"; \
        cd "$plugin"; \
        npx -y @strapi/sdk-plugin build || echo "WARN: $plugin build failed, using pre-built dist"; \
        cd /app; \
      fi; \
    done

# 构建 Strapi（TS 编译 + admin panel）
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# 阶段2: 生产镜像（仅运行时依赖）
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# 安装运行时系统依赖
RUN apk add --no-cache libpq tzdata && \
    mkdir -p /app/uploads /app/config /app/public && \
    chown -R node:node /app

USER node

# 复制构建产物和运行时依赖
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/config ./config
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/plugins ./plugins
COPY --from=builder --chown=node:node /app/package.json ./package.json

EXPOSE 1337

CMD ["node", "dist/src/index.js"]
