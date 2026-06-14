# Strapi 项目安装文档

## 项目概述

本项目是基于 Strapi v5 的二次开发项目，包含多个自定义插件用于在线教育平台。

## 系统要求

- Node.js: >= 20.0.0 <= 24.x.x
- npm: >= 6.0.0
- PostgreSQL: 8.x+ (推荐)
- Redis: 6.x+ (用于 zhao-channel 插件)

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

编辑 `config/plugins.ts`，修改插件 `resolve` 路径为实际路径：

```typescript
// 开发环境 - 使用绝对路径
"zhao-auth": {
    enabled: true,
    resolve: "./plugins/zhao-auth",  // 相对路径
},

// 生产环境 - 使用 npm 包
"zhao-auth": {
    enabled: true,
    // resolve 可省略，通过 npm 安装
},
```

### 5. 构建插件

每个插件需要单独构建：

```bash
# 进入插件目录构建
cd plugins/zhao-auth && npm run build
cd plugins/zhao-channel && npm run build
cd plugins/zhao-common && npm run build
cd plugins/zhao-course && npm run build
cd plugins/zhao-oss && npm run build
cd plugins/zhao-point && npm run build
cd plugins/zhao-quiz && npm run build
cd plugins/zhao-sso && npm run build
cd plugins/zhao-tag && npm run build
cd plugins/zhao-third && npm run build
```

或批量构建：

```bash
for plugin in zhao-auth zhao-channel zhao-common zhao-course zhao-oss zhao-point zhao-quiz zhao-sso zhao-tag zhao-third; do
    cd plugins/$plugin && npm run build && cd ../..
done
```

### 6. 启动项目

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
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
```

## 数据库初始化

首次运行时，Strapi 会自动创建数据库表结构。如需手动迁移：

```bash
npm run strapi migration:run
```

## 常见问题

### Q1: 插件路径找不到

确保 `config/plugins.ts` 中的 `resolve` 路径正确：
- Windows: 使用 `E:/code/plugins/zhao-xxx` 或 `./plugins/zhao-xxx`
- Linux/Mac: 使用 `/path/to/plugins/zhao-xxx` 或 `./plugins/zhao-xxx`

### Q2: Redis 连接失败

检查 Redis 服务状态：
```bash
redis-cli ping
```

### Q3: OSS 上传失败

检查阿里云 OSS 配置：
- accessKeyId 和 accessKeySecret 是否正确
- bucket 是否存在
- region 是否匹配

### Q4: 数据库连接失败

检查 PostgreSQL：
```bash
psql -U postgres -d strapi -h localhost
```

## 目录结构

```
basic/
├── config/           # Strapi 配置
│   ├── plugins.ts    # 插件配置
│   ├── database.ts   # 数据库配置
│   └── server.ts     # 服务器配置
├── src/
│   ├── api/          # API 接口
│   └── extensions/   # 扩展内置插件
├── public/           # 静态资源
├── database/         # 数据库迁移
├── plugins/          # 自定义插件目录 (需创建)
│   ├── zhao-auth/
│   ├── zhao-channel/
│   ├── zhao-common/
│   ├── zhao-course/
│   ├── zhao-oss/
│   ├── zhao-point/
│   ├── zhao-quiz/
│   ├── zhao-sso/
│   ├── zhao-tag/
│   └── zhao-third/
└── .env              # 环境变量
```

## 生产部署建议

1. 使用 PM2 管理进程：
```bash
pm2 start npm --name "strapi" -- start
```

2. 配置 Nginx 反向代理：
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

3. 启用 SSL：
```bash
certbot --nginx -d your-domain.com
```

## 技术支持

- 作者: zhao yitao <johocn@163.com>
- GitHub: https://github.com/johocn/strapi