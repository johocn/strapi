# Strapi 项目安装文档

## 项目概述

本项目是基于 Strapi v5 的二次开发项目，包含多个自定义插件用于在线教育平台。后端为 `basic` 目录（Strapi），前端管理后台为 `web` 目录（uni-app H5），C 端为 `shao` 目录（uni-app H5）。

## 系统要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 20.0.0 <= 24.x.x | 推荐 20.x LTS |
| npm | >= 6.0.0 | 随 Node.js 安装 |
| PostgreSQL | 14+ | 主数据库 |
| Redis | 6.x+ | zhao-channel 插件需要 |
| Chromium | 可选 | zhao-wealth 采集功能需要（Playwright） |

## 插件列表

| 插件名称 | 描述 |
|----------|------|
| zhao-auth | 统一认证 - JWT 验证、角色授权、渠道权限、权限树初始化、admin 用户自动初始化 |
| zhao-channel | 渠道管理 - 三级渠道、注册控制、渠道信息、邀请码 |
| zhao-common | 通用基础设施 - 日志、配置、异常处理、国际化、站点配置、featureFlags |
| zhao-course | 课程管理 - 课程、课时、知识点、学习进度、跨渠道访问控制 |
| zhao-oss | 多媒体存储 - 阿里云 OSS 备份与多供应商支持 |
| zhao-point | 积分管理 - 积分获取、消费、兑换、签到 |
| zhao-quiz | 题库管理 - 多题型、批量导入、考试记录、关联课程 |
| zhao-sso | 单点登录 - OAuth2 授权码模式、微信/支付宝登录、短信验证码、邀请码、推荐关系 |
| zhao-tag | 标签管理 - 分组、预设、全局检索、知识点标签 |
| zhao-third | 三方登录 - 微信/支付宝/抖音 |
| zhao-wealth | 财富管理 - 理财产品净值采集（Bull 队列 + Playwright）、理财公司种子数据初始化 |
| zhao-studio | 工作室管理 - 内容采集、AI 辅助、多平台发布、数据分析、广告管理 |
| zhao-website | 官网中心 - 文章、品牌信息、案例、AI 摘要、SEO 输出 |
| zhao-logistics | 物流中心 - 客户管理、报价、订单、跟单、财务、统计 |

## 安装步骤

### 1. 克隆项目

```bash
git clone -b main git@github.com:johocn/strapi.git
cd strapi/basic
```

> 仓库根目录下含 `basic`（Strapi 后端）、`web`（管理后台）、`shao`（C 端）三个子项目。本指南只涉及 `basic`。

### 2. 配置 npm 镜像（推荐）

```bash
npm config set registry https://registry.npmmirror.com
npm config get registry
```

### 3. 安装依赖

```bash
npm install --legacy-peer-deps
```

**说明**：所有插件的依赖已合并到项目根目录 `package.json`，包括 `bcryptjs`、`jsonwebtoken`（zhao-auth）、`bull`、`ioredis`（zhao-channel）、`xlsx`（zhao-quiz）、`ali-oss`（zhao-oss）、`pg`（数据库工具脚本）等。`--legacy-peer-deps` 参数必需。

### 4. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

必需的环境变量（`.env.example` 已含默认值，生产环境必须修改 secrets 和密码）：

```env
# 基础配置
HOST=0.0.0.0
PORT=1337
APP_KEYS="key1,key2,key3,key4"
API_TOKEN_SALT=your-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
ENCRYPTION_KEY=your-encryption-key
JWT_SECRET=your-jwt-secret

# 数据库配置
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_SSL=false

# Redis 配置 (zhao-channel 插件需要)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# 阿里云 OSS 配置 (zhao-oss 插件，可选，不配置则使用本地存储)
ALIYUN_OSS_REGION=
ALIYUN_OSS_ACCESS_KEY=
ALIYUN_OSS_ACCESS_SECRET=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_CNAME=
```

**可选环境变量**（按需添加到 `.env`）：

```env
# admin 用户自动初始化（首次启动时若不存在 admin 角色用户则自动创建）
# 未设置则使用默认值 admin/admin@example.com/Admin@12345
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_EMAIL=admin@example.com
INIT_ADMIN_PASSWORD=Admin@12345

# 短信服务商（zhao-sso 短信验证码）
# mock / aliyun / tencent
SMS_PROVIDER=mock

# SSO 回调地址（生产域名）
SSO_REDIRECT_BASE_URL=https://h.joho.cn
```

生成 secrets 的命令：

```bash
openssl rand -base64 32
```

每个 secret 变量生成一次新的，不要复用。`APP_KEYS` 用逗号分隔多个 key（建议 4 个）。

### 5. 构建插件

**重要**：插件的 `dist` 目录不会提交到仓库，必须在本地/服务器构建。

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
cd plugins/zhao-auth
npx strapi-plugin build
```

### 6. 构建 Strapi 项目

```bash
npm run build
```

### 7. 启动项目

```bash
# 开发模式（热重载，监听插件源码变更）
npm run dev

# 生产模式
npm start
```

## 首次启动自动化初始化

首次启动 Strapi 时，多个插件会自动执行初始化，无需手动操作。启动日志中会看到以下信息。

### 1. admin 用户自动初始化（zhao-auth）

`zhao-auth` 插件启动约 3 秒后执行：

1. 调用 `initDefaultRoles` 初始化系统角色（admin、channel-admin、plugin-manager、instructor、user）
2. 检查 `up_users` 表中是否已有 `zhao_roles` 包含 `admin` 的用户
3. 若不存在，则创建第一个 admin 用户

日志示例：

```
zhao-auth: 角色初始化完成 [admin, channel-admin, plugin-manager, instructor, user]
zhao-auth: ✅ 已创建第一个 admin 用户（username=admin, email=admin@example.com）。请尽快修改默认密码。
```

若已存在 admin 用户：

```
zhao-auth: 已存在 admin 用户（id=12, username=1117），跳过初始化
```

admin 用户凭证从环境变量 `INIT_ADMIN_USERNAME` / `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD` 读取，未设置则使用默认值 `admin` / `admin@example.com` / `Admin@12345`。

**生产环境务必**：设置 `INIT_ADMIN_*` 环境变量，并在首次登录后立即修改密码。

### 2. 根渠道自动创建（zhao-channel）

`zhao-channel` 插件启动后自动执行：

| 操作 | 说明 |
|------|------|
| 创建根渠道 | 自动创建名为"平台根渠道"的顶级渠道 |
| 关联 admin 用户 | 将 admin 用户设为根渠道的 owner |
| 关联 admin 角色 | 将 admin 角色关联到根渠道 |
| 授予渠道权限 | 为 admin 用户授予根渠道权限 |

日志示例：

```
[zhao-channel] 默认根渠道创建成功 (ID: 1, Code: XXXX)
[zhao-channel] admin 用户已关联到根渠道作为 owner (User ID: 1)
```

**幂等性**：根渠道已存在则跳过。

### 3. 理财公司种子数据初始化（zhao-wealth）

`zhao-wealth` 插件启动时检查 `wealth_companies` 表：

- 表为空时，从 `server/src/data/wealth-companies.json` 导入 31 家银行理财公司（工银理财、建信理财、中银理财等）
- 表已有数据则跳过

日志示例：

```
[zhao-wealth] 已初始化 31 家理财公司种子数据
```

或：

```
[zhao-wealth] 理财公司数据已存在（31 条），跳过初始化
```

### 4. featureFlags 默认值（zhao-common）

`zhao-common` 的 `featureFlags` 默认全部为 `true`（website、logistics、studio、sso、points 等），站点未显式配置时前端管理面板显示所有模块。可在后台「站点配置」中按租户关闭不需要的模块。

### 验证初始化结果

访问 `http://localhost:1337/admin`，用 admin 账号登录后：

- 管理员账号拥有全部渠道权限
- 可在渠道管理中看到"平台根渠道"
- 可在理财管理中看到 31 家理财公司
- 可创建子渠道、租户等

## 手动初始化脚本（可选）

自动初始化失败时，可使用以下脚本手动操作。

### ensure-admin.js — 创建第一个 admin 用户

```bash
# 确保项目已构建
npm run build

# 运行脚本（通过环境变量传凭证）
ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpass \
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=strapi DB_USER=postgres DB_PASSWORD=admin \
node ensure-admin.js
```

脚本逻辑：
1. 查询 `up_users` 表 `zhao_roles @> '["admin"]'` 的用户
2. 已存在则跳过
3. 检查用户名/邮箱是否被占用
4. 用 bcryptjs 哈希密码，插入新用户，`zhao_roles = ["admin"]`

### init-channel-admin.js — 创建根渠道和渠道管理员

```bash
node scripts/init-channel-admin.js
```

脚本功能：

| 操作 | 说明 |
|------|------|
| 创建根渠道 | 如果不存在，创建"平台根渠道" |
| 创建管理员用户 | 如果不存在，创建 `channel-admin` 用户 |
| 关联渠道成员 | 将用户设为渠道 owner |
| 授予渠道权限 | 创建 user-channel 和 role-channel 关联 |
| 创建邀请码 | 自动生成用户邀请码 |

## 服务器部署完整流程

```bash
# 1. 克隆项目
cd /home/admin
git clone -b main git@github.com:johocn/strapi.git strapi
cd strapi/basic

# 2. 配置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 3. 安装依赖
npm install --legacy-peer-deps

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env：修改数据库密码、生成 secrets、设置 INIT_ADMIN_* 凭证

# 5. 构建所有插件
chmod +x scripts/build-plugins.sh
./scripts/build-plugins.sh

# 6. 构建 Strapi
npm run build

# 7. 启动服务
npm start
# 或使用 PM2
pm2 start npm --name "strapi" -- start
pm2 save
pm2 startup
```

> 生产环境的完整部署（1Panel + Nginx + PM2 + 前端发布）请参考 [1panel-install.md](1panel-install.md)。

## 目录结构

```
basic/
├── config/                # Strapi 配置
│   ├── plugins.ts         # 插件配置（相对路径方案）
│   ├── plugins-windows.ts # 插件配置（Windows 绝对路径方案）
│   ├── database.ts        # 数据库配置
│   └── server.ts          # 服务器配置
├── src/
│   ├── api/               # API 接口
│   └── extensions/        # 扩展内置插件
├── public/                # 静态资源
├── database/              # 数据库迁移
├── scripts/               # 工具脚本
│   ├── build-plugins.sh   # Linux/Mac 构建脚本
│   ├── build-plugins.ps1  # Windows 构建脚本
│   └── init-channel-admin.js
├── ensure-admin.js        # 手动创建第一个 admin 用户
├── update-role.js         # 手动给指定用户设置 admin 角色
├── plugins/               # 自定义插件目录
│   ├── zhao-auth/         # 认证 + admin 用户自动初始化
│   ├── zhao-channel/      # 渠道管理 + 根渠道自动初始化
│   ├── zhao-common/       # 通用基础设施 + featureFlags
│   ├── zhao-course/       # 课程管理
│   ├── zhao-logistics/    # 物流中心
│   ├── zhao-oss/          # 多媒体存储
│   ├── zhao-point/        # 积分体系
│   ├── zhao-quiz/         # 题库管理
│   ├── zhao-sso/          # 单点登录
│   ├── zhao-studio/       # 工作室管理
│   ├── zhao-tag/          # 标签管理
│   ├── zhao-third/        # 三方登录
│   ├── zhao-wealth/       # 财富管理 + 理财公司种子数据
│   └── zhao-website/      # 官网中心
└── .env                   # 环境变量
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

**原因**：`.gitignore` 忽略了 `dist` 目录，构建产物不会提交到仓库。服务器拉取代码后，所有插件的 `dist` 目录均为空。

**解决方案**：在服务器上运行构建脚本：
```bash
./scripts/build-plugins.sh
npm run build
```

### Q3: zhao-sso 插件 admin 导出错误

**错误信息**：
```
"default" is not exported by "plugins/zhao-sso/strapi-admin.js"
```

**原因**：zhao-sso 插件缺少前端开发依赖（`@strapi/design-system`、`@strapi/icons`、`react`、`react-dom` 等），导致 `strapi-plugin build` 无法正确编译 admin 模块。

**解决方案**：确保 `plugins/zhao-sso/package.json` 的 `devDependencies` 包含相关依赖，重新安装并构建：
```bash
cd plugins/zhao-sso
npm install
npm run build
cd ../..
npm run build
```

### Q4: Redis 连接失败

检查 Redis 服务状态：
```bash
redis-cli ping
# 应返回 PONG
```

### Q5: OSS 上传失败

检查阿里云 OSS 配置：
- accessKeyId 和 accessKeySecret 是否正确
- bucket 是否存在
- region 是否匹配

### Q6: 数据库连接失败

检查 PostgreSQL：
```bash
psql -U postgres -d strapi -h localhost
```

### Q7: npm install 被系统杀死（内存不足）

**错误信息**：
```
Killed                  npm install --legacy-peer-deps
```

**原因**：服务器内存不足（OOM Killer）

**解决方案**：
1. 确保使用国内 npm 镜像
2. 依赖已合并到根目录，只需一次安装
3. 构建脚本已优化，不再每个插件单独安装依赖
4. 临时增加 swap（见 1panel-install.md 第九章 9.5 节）

### Q8: admin 用户未自动创建

**现象**：启动日志中没有"已创建第一个 admin 用户"或"已存在 admin 用户"的输出。

**排查**：
1. 查看 PM2 日志：`pm2 logs strapi --lines 100`
2. 确认 `zhao-auth` 插件 dist 已构建：检查 `plugins/zhao-auth/dist/server/index.js` 是否存在 `ensureAdminUser` 字样
3. 确认 `up_users` 表的 `zhao_roles` 字段为 jsonb 类型
4. 手动执行 `ensure-admin.js` 脚本（见上文）

### Q9: 理财公司数据为空

**现象**：理财管理页面无理财公司数据。

**排查**：
1. 查看启动日志是否有 `[zhao-wealth] 已初始化 N 家理财公司种子数据`
2. 确认 `plugins/zhao-wealth/dist/server/index.js` 包含 `initSeedCompanies` 字样
3. 确认 `plugins/zhao-wealth/server/src/data/wealth-companies.json` 文件存在且非空
4. 手动触发：删除 `wealth_companies` 表数据后重启 Strapi

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
npm install --legacy-peer-deps

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
