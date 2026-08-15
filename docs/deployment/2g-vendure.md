# 2G 服务器 Vendure 部署方案

> 适用环境：总内存 2G 的云服务器，已运行 1Panel + PostgreSQL + Strapi，需追加 Vendure。
> 核心策略：**本地构建产物提交 Git，服务器只拉代码 + 最小化安装运行时依赖 + PM2 启动**。
> 更新日期：2026-08-14

---

## 一、问题背景

2G 服务器同时运行 1Panel、PostgreSQL、Strapi 后可用内存仅 ~400MB。Vendure monorepo 全量 `npm install` 需解析 30+ workspace 包 + 数千依赖，npm 构建依赖树时内存峰值超 1.5G，**必然被 OOM Killer 杀死**。

| 全量安装内存消耗 | 最小安装内存消耗 |
|:-:|:-:|
| ~1.5G（含 devDependencies：vitest、rollup、playwright 等） | ~400M（仅 runtime 依赖） |

**解决方案**：本地完成全部编译（`tsc` + `vite build`），将 `dist/` 产物提交 Git。服务器只需安装**运行时依赖**（不含 devDependencies），用 `--omit=dev` + swap 兜底即可完成安装。

---

## 二、本地构建（Windows / 开发机）

### 2.1 构建内容

| 产物 | 路径 | 说明 |
|------|------|------|
| dev-server 入口 | `packages/dev-server/dist/index.js` | tsc 编译，生产入口 |
| dev-server 静态页 | `packages/dev-server/dist/index.html` | Dashboard 前端 |
| 核心库 | `packages/core/dist/index.js` | Vendure 核心 |
| 业务插件 | `packages/cjk-plugin/lib/` | 含 ShippingProfile/PaymentProfile |
| 其他插件 | `packages/*/dist/` 或 `packages/*/lib/` | 各 @vendure/* 插件 |

### 2.2 构建步骤

```powershell
cd e:\code\vendure

# 1. 编译 dev-server（跳过 test-plugins，生产模式惰性 require）
cd packages\dev-server
npx --package=typescript tsc -p tsconfig.prod.json
cd ..\..

# 2. 编译 cjk-plugin（如已修改 src/*.ts）
cd packages\cjk-plugin
npm run build
cd ..\..

# 3. 编译其他业务插件（按需，未改可跳过）
# cd packages\delivery-plugin && npm run build && cd ..\..
# cd packages\sales-plugin && npm run build && cd ..\..
```

### 2.3 关键配置：惰性加载 dev-only 插件

`packages/dev-server/dev-config.ts` 中，三个测试插件（ReviewsPlugin、FloorBuilderPlugin、NavModifierPlugin）必须用**惰性 require**，不能静态 import：

```typescript
// ✅ 正确：生产模式跳过，不 require 缺失的 test-plugins
const IS_PROD = path.basename(__dirname) === 'dist';
const devOnlyPlugins = IS_PROD
    ? []
    : (() => {
          const { ReviewsPlugin } = require('./test-plugins/reviews/reviews-plugin');
          const { FloorBuilderPlugin } = require('./test-plugins/floor-builder');
          const { NavModifierPlugin } = require('./test-plugins/nav-modifier-plugin/nav-modifier-plugin');
          return [ReviewsPlugin, FloorBuilderPlugin, NavModifierPlugin];
      })();
```

> 如果用静态 import，Node 加载模块时会强制 require 这些路径，生产 dist 缺少 floor-builder 编译产物，导致 `MODULE_NOT_FOUND`。

### 2.4 提交并推送

```powershell
cd e:\code\vendure
git add -A
git commit --no-verify -m "build: production artifacts for server deployment"
git push
```

---

## 三、服务器安装（最小化）

### 3.1 前提：Swap 已扩容到 6G

```bash
# 确认现有 swap（通常已有 2G）
swapon --show
free -h

# 追加 4G swap 文件（换名避免与已有的 /swapfile 冲突）
sudo fallocate -l 4G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2

# 开机自动挂载
echo '/swapfile2 none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证 Swap 总量应为 6G
free -h
```

> **关键**：物理 1.8G + Swap 6G = ~7.8G 可用空间。npm 解析依赖树时内存峰值会被换入 swap 而非被 OOM Kill。

### 3.2 拉取代码

```bash
cd /www/apps/vendure
git pull origin master
```

> 如遇 `package-lock.json` 冲突：`git checkout -- package-lock.json && git pull`

### 3.3 最小化安装运行时依赖

```bash
cd /www/apps/vendure

# 1. 清理所有残留（含 workspace 包内的嵌套 node_modules）
rm -rf node_modules
rm -rf packages/*/node_modules
rm -f package-lock.json

# 2. 清 npm 缓存（避免上次中断的缓存损坏）
npm cache clean --force

# 3. 只装运行时依赖（--omit=dev 跳过所有 devDependencies）
#    --legacy-peer-deps 绕过 npm arborist peer 解析 bug
#    --maxsockets=2 降低并发，压低内存峰值
NODE_OPTIONS="--max-old-space-size=2048" \
  npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --maxsockets=2
```

**参数说明**：

| 参数 | 作用 |
|------|------|
| `--omit=dev` | 跳过 devDependencies（vitest、rollup、playwright 等全部不装），内存需求减半以上 |
| `--legacy-peer-deps` | 绕过 npm 10.x 的 `#loadPeerSet` 崩溃 bug（`Cannot read properties of null (reading 'edgesOut')`） |
| `--maxsockets=2` | 限制 npm 网络并发为 2，降低内存峰值 |
| `--no-audit` / `--no-fund` | 跳过安全审计和 fund 检查，减少内存和耗时 |

### 3.4 补装 Linux 平台原生模块

```bash
# sharp 模块的 Linux 二进制（服务器是 linux-x64）
npm install --omit=dev @img/sharp-linux-x64 --no-audit --no-fund
```

### 3.5 如果 install 仍被 Killed

逐包安装（进一步降低单次内存峰值）：

```bash
cd /www/apps/vendure

# 先装根目录依赖（不解析 workspace）
NODE_OPTIONS="--max-old-space-size=1024" \
  npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --maxsockets=1 --no-package-lock

# 再逐个装 workspace 包的依赖
for pkg in packages/*/; do
    if [ -f "$pkg/package.json" ]; then
        echo ">>> Installing $pkg"
        cd "/www/apps/vendure/$pkg"
        NODE_OPTIONS="--max-old-space-size=768" \
          npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --maxsockets=1 --no-package-lock 2>/dev/null || true
        cd /www/apps/vendure
    fi
done
```

> 逐包安装时，每个包只解析自己的依赖树，内存峰值远低于全量解析。

### 3.6 补建 workspace 符号链接

`npm install --omit=dev` 可能不创建所有 workspace 包的 `@vendure/*` 符号链接。手动补齐：

```bash
cd /www/apps/vendure
mkdir -p node_modules/@vendure

# 列出所有需要链接的 @vendure/* 包
for pkg in packages/*/; do
    name=$(node -p "try{require('./$pkg/package.json').name}catch(e){null}" 2>/dev/null)
    if [[ "$name" == @vendure/* ]]; then
        linkname="${name#@vendure/}"
        echo "Linking @vendure/$linkname -> $pkg"
        ln -sfn "/www/apps/vendure/$pkg" "/www/apps/vendure/node_modules/@vendure/$linkname"
    fi
done
```

### 3.7 配置 .env

```bash
cd /www/apps/vendure/packages/dev-server
cp .env.example .env  # 如无 .env.example 则手动创建
vi .env
```

```env
DB=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=vendure_user
DB_PASSWORD=<数据库密码>
DB_NAME=vendure_prod
API_PORT=3020
# 生产环境关闭调试绕过
DEV_BYPASS_SMS=false
DEV_BYPASS_WECHAT=false
DEV_BYPASS_ALIPAY=false
DEV_BYPASS_DOUYIN=false
```

---

## 四、数据库准备

### 4.1 创建数据库和用户

```bash
sudo -u postgres psql
```

```sql
CREATE USER vendure_user WITH PASSWORD '<强密码>';
CREATE DATABASE vendure_prod OWNER vendure_user;
GRANT ALL PRIVILEGES ON DATABASE vendure_prod TO vendure_user;
\q
```

### 4.2 自动建表（synchronize）

Vendure 配置中 PostgreSQL 模式 `synchronize: true`，首次启动时 TypeORM 自动创建所有表和自定义字段：

- `shipping_profile` 表（含 pickupLocations 多对多关联表）
- `payment_profile` 表
- `product_variant` 表新增 `customFieldsShippingprofileid`、`customFieldsPaymentprofileid` 列

> **无需手动 migration**，首次启动自动完成。建议启动前 `pg_dump` 备份现有数据。

---

## 五、PM2 启动

### 5.1 ecosystem 配置

创建 `/www/apps/vendure/packages/dev-server/ecosystem.config.cjs`：

```js
module.exports = {
  apps: [{
    name: 'vendure',
    cwd: '/www/apps/vendure/packages/dev-server',
    script: 'prod-start.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    watch: false,
    // 限制 V8 堆 256MB（2G 服务器，与 Strapi 共存）
    node_args: '--max-old-space-size=256',
    max_memory_restart: '400M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/home/admin/logs/vendure-error.log',
    out_file: '/home/admin/logs/vendure-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### 5.2 启动

```bash
# 确保日志目录存在
mkdir -p /home/admin/logs

cd /www/apps/vendure/packages/dev-server

# 如有旧进程，先删除
pm2 delete vendure 2>/dev/null

# 启动
pm2 start ecosystem.config.cjs
pm2 save

# 查看日志
pm2 logs vendure --lines 50
```

### 5.3 验证

```bash
# 健康检查
curl http://127.0.0.1:3020/health

# Shop API 测试
curl -X POST http://127.0.0.1:3020/shop-api \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'

# PM2 状态
pm2 status
```

---

## 六、2G 内存分配总览（Strapi + Vendure 共存）

| 服务 | 预估内存 | 说明 |
|------|---------|------|
| 系统（内核 + 文件缓存） | ~200MB | Linux 基础开销 |
| 1Panel 面板 | ~100MB | Go 程序 |
| PostgreSQL | ~150MB | 已调优（shared_buffers=32MB） |
| Strapi (Node.js) | ~400MB | V8 堆 384MB |
| Vendure (Node.js) | ~350MB | V8 堆 256MB |
| 剩余 buffer | ~200MB + Swap | 突发峰值靠 swap 兜底 |
| **合计** | **~1200MB** | 物理剩余 ~800MB + Swap 6G |

> Swap 6G 作为兜底，正常运行时物理内存足够，仅在 npm install 或高峰时换入 swap。

---

## 七、故障排查

### 7.1 `Cannot find module '@vendure/xxx'`

workspace 符号链接缺失，执行 [3.6 补建符号链接](#36-补建-workspace-符号链接)。

### 7.2 `Cannot find module './test-plugins/floor-builder'`

dev-config.ts 用了静态 import 而非惰性 require。确认本地已修复并推送，服务器 `git pull` 后重启。

验证方式：

```bash
grep -n "devOnlyPlugins" /www/apps/vendure/packages/dev-server/dist/dev-config.js
# 应显示 IS_PROD ? [] : (() => { ... })() 惰性结构
```

### 7.3 `npm install` 被 Killed

1. 确认 swap 总量 6G：`free -h`
2. 确认用了 `--omit=dev`
3. 改用逐包安装（见 [3.5](#35-如果-install-仍被-killed)）

### 7.4 `npm error Cannot read properties of null (reading 'edgesOut')`

npm arborist 的 peer 依赖解析 bug。加 `--legacy-peer-deps` 绕过。

### 7.5 `ENOTEMPTY: directory not empty`

上次 install 中断留下的半删除残留。清理后重试：

```bash
rm -rf node_modules
rm -rf packages/*/node_modules
npm cache clean --force
npm install --omit=dev --legacy-peer-deps ...
```

### 7.6 Vendure 启动后 OOM 重启

```bash
# 查看 PM2 重启次数
pm2 list

# 如果 vendure 频繁重启
pm2 logs vendure --err --lines 30

# 降低 node_args 到 192MB
# 或检查是否有内存泄漏
```

---

## 八、部署 Checklist

- [ ] 本地：dev-config.ts 已改为惰性 require dev-only 插件
- [ ] 本地：tsc 编译 dev-server → dist/
- [ ] 本地：cjk-plugin build → lib/
- [ ] 本地：git commit + push
- [ ] 服务器：swap 扩展到 6G（`free -h` 确认）
- [ ] 服务器：`git pull` 成功
- [ ] 服务器：`npm install --omit=dev --legacy-peer-deps` 成功
- [ ] 服务器：workspace 符号链接已补建
- [ ] 服务器：.env 配置正确（DB 连接、端口）
- [ ] 服务器：数据库 vendure_prod 已创建
- [ ] 服务器：PM2 启动，`curl /health` 返回 200
- [ ] 服务器：`pm2 save` + `pm2 startup` 持久化
