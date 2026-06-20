# Strapi 项目安装文档

## 项目概述

本项目是基于 Strapi v5 的二次开发项目，包含多个自定义插件用于在线教育平台。

## 系统要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 20.0.0 <= 24.x.x | 推荐 20.x LTS |
| npm | >= 6.0.0 | 随 Node.js 安装 |
| PostgreSQL | 8.x+ | 主数据库 |
| Redis | 6.x+ | zhao-channel 插件需要 |

## 插件列表

| 插件名称 | 描述 | 依赖 |
|----------|------|------|
| zhao-auth | 统一认证策略中间件 - JWT验证、角色授权、渠道权限 | bcryptjs, jsonwebtoken |
| zhao-channel | 渠道管理 - 三级渠道、注册控制、渠道信息 | bull, ioredis, pg |
| zhao-common | 通用基础设施 - 日志、配置、异常处理、国际化 | 无额外依赖 |
| zhao-course | 课程管理 - 课程、课时、知识点、学习进度 | 无额外依赖 |
| zhao-oss | 多媒体存储 - 阿里云OSS备份与多供应商支持 | ali-oss |
| zhao-point | 积分管理 - 积分获取、消费、兑换 | 无额外依赖 |
| zhao-quiz | 测验管理 - 多题型、批量导入、关联课程 | xlsx |
| zhao-sso | 单点登录 - OAuth2授权码模式 | bcryptjs, uuid |
| zhao-tag | 标签管理 - 分组、预设、全局检索 | 无额外依赖 |
| zhao-third | 三方登录 - 微信/支付宝/抖音 | jsonwebtoken |
| zhao-wealth | 财富管理 - Bull队列 | bull |
| zhao-studio | 工作室管理 | 无额外依赖 |

## 安装步骤

### 1. 克隆项目

```bash
git clone git@github.com:johocn/strapi.git
cd strapi
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

必需的环境变量：

```env
# 基础配置
HOST=0.0.0.0
PORT=1337
APP_KEYS="your-app-keys"
API_TOKEN_SALT=your-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# 数据库配置
DATABASE_CLIENT=pg
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_SSL=false

# Redis配置 (zhao-channel插件需要)
REDIS_HOST=localhost
REDIS_PORT=6379

# 阿里云OSS配置 (zhao-oss插件需要)
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_REGION=oss-cn-hangzhou

# SSO配置 (zhao-sso插件需要)
SSO_JWT_SECRET=your-sso-jwt-secret
```

### 4. 配置插件路径

项目提供两种插件配置方案：

#### 方案A：相对路径方案（推荐）

使用 `config/plugins.ts`，插件目录位于项目内的 `./plugins/`：

```typescript
"zhao-auth": {
    enabled: true,
    resolve: "./plugins/zhao-auth",
},
```

#### 方案B：Windows 绝对路径方案

使用 `config/plugins-windows.ts`，插件目录位于 `E:/code/plugins/`：

```typescript
"zhao-auth": {
    enabled: true,
    resolve: "E:/code/plugins/zhao-auth",
},
```

切换方案：
```bash
# 使用 Windows 绝对路径方案
mv config/plugins.ts config/plugins-relative.ts
mv config/plugins-windows.ts config/plugins.ts
```

### 5. 构建插件

**重要**：插件的 `dist` 目录不会提交到仓库，需要在本地/服务器构建。

#### Linux/Mac 批量构建

```bash
chmod +x scripts/build-plugins.sh
./scripts/build-plugins.sh
```

#### Windows 批量构建

```powershell
.\scripts\build-plugins.ps1
```

#### 单个插件构建

```bash
cd plugins/zhao-channel
npm run build
```

### 6. 构建 Strapi 项目

```bash
npm run build
```

### 7. 启动项目

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 服务器部署完整流程

```bash
# 1. 克隆项目
git clone git@github.com:johocn/strapi.git
cd strapi

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写真实配置

# 4. 构建所有插件
chmod +x scripts/build-plugins.sh
./scripts/build-plugins.sh

# 5. 构建 Strapi
npm run build

# 6. 启动服务
npm start
# 或使用 PM2
pm2 start npm --name "strapi" -- start
```

## 插件依赖关系图

```
zhao-common (基础)
    ↓
zhao-auth (认证) ← zhao-third (三方登录) ← zhao-sso (单点登录)
    ↓
zhao-channel (渠道)
    ↓
zhao-course (课程) ← zhao-quiz (测验) ← zhao-point (积分)
    ↓
zhao-tag (标签)
    ↓
zhao-oss (存储)
    ↓
zhao-wealth (财富) ← zhao-studio (工作室)
```

## 数据库初始化

首次运行时，Strapi 会自动创建数据库表结构。如需手动迁移：

```bash
npm run strapi migration:run
```

## 常见问题

### Q1: 插件路径找不到

**错误信息**：
```
Could not resolve "../../plugins/zhao-channel/./dist/admin/index.mjs"
```

**解决方案**：
1. 确保已构建插件：`./scripts/build-plugins.sh`
2. 检查 `config/plugins.ts` 中的 `resolve` 路径是否正确

### Q2: 构建产物缺失

**错误信息**：
```
Building admin panel [ERROR] Could not resolve "...dist/admin/index.mjs"
```

**原因**：`.gitignore` 忽略了 `dist` 目录，构建产物不会提交到仓库。

**解决方案**：在服务器上运行构建脚本：
```bash
./scripts/build-plugins.sh
npm run build
```

### Q3: Redis 连接失败

检查 Redis 服务状态：
```bash
redis-cli ping
# 应返回 PONG
```

### Q4: OSS 上传失败

检查阿里云 OSS 配置：
- accessKeyId 和 accessKeySecret 是否正确
- bucket 是否存在
- region 是否匹配

### Q5: 数据库连接失败

检查 PostgreSQL：
```bash
psql -U postgres -d strapi -h localhost
```

## 目录结构

```
basic/
├── config/           # Strapi 配置
│   ├── plugins.ts    # 插件配置（相对路径方案）
│   ├── plugins-windows.ts  # 插件配置（Windows绝对路径方案）
│   ├── database.ts   # 数据库配置
│   └── server.ts     # 服务器配置
├── src/
│   ├── api/          # API 接口
│   └── extensions/   # 扩展内置插件
├── public/           # 静态资源
├── database/         # 数据库迁移
├── scripts/          # 工具脚本
│   ├── build-plugins.sh    # Linux/Mac 构建脚本
│   └── build-plugins.ps1   # Windows 构建脚本
├── plugins/          # 自定义插件目录
│   ├── zhao-auth/
│   ├── zhao-channel/
│   ├── zhao-common/
│   ├── zhao-course/
│   ├── zhao-oss/
│   ├── zhao-point/
│   ├── zhao-quiz/
│   ├── zhao-sso/
│   ├── zhao-tag/
│   ├── zhao-third/
│   ├── zhao-wealth/
│   └── zhao-studio/
└── .env              # 环境变量
```

## 生产部署建议

### 1. 使用 PM2 管理进程

```bash
pm2 start npm --name "strapi" -- start
pm2 save
pm2 startup
```

### 2. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用 SSL

```bash
certbot --nginx -d your-domain.com
```

### 4. 自动化部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash
set -e

echo "拉取最新代码..."
git pull

echo "安装依赖..."
npm install

echo "构建插件..."
./scripts/build-plugins.sh

echo "构建 Strapi..."
npm run build

echo "重启服务..."
pm2 restart strapi

echo "部署完成！"
```

## 技术支持

- 作者: zhao yitao <johocn@163.com>
- GitHub: https://github.com/johocn/strapi