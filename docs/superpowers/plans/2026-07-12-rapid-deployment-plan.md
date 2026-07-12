# 服务器快速安装实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现快速安装方案：本地构建后直接运行，服务器 git pull + npm ci --production 后 PM2 启动 Strapi 和 Vendure

**Architecture:** 共 6 个仓库，后端 2 个（strapi/vendure）通过 PM2 管理进程，前端 4 个（vshop/shop/site/dsite）git clone 到服务器后通过 1Panel 网站面板配置。Docker 仅用于 PostgreSQL + Redis。所有服务只暴露 80/443 端口，由 1Panel Nginx 反向代理。

**Tech Stack:** Strapi 5 / Vendure / PM2 / Node.js 20 / PostgreSQL / Redis / 1Panel OpenResty

---

## 文件清单

### 本地修改/创建（E:\code\basic 目录下）

| 文件 | 操作 |
|------|------|
| `.gitignore` | 修改：`build` → `!build/` |
| `build-prod.bat` | 新建：一键构建脚本 |
| `config/database.ts` | 修改：连接池 min:1, max:5 |

### 服务器创建（/opt/joho/ 下）

| 文件 | 操作 |
|------|------|
| `install.sh` | 新建：一键安装脚本 |
| `ecosystem.config.js` | 新建：PM2 配置 |
| `strapi.env` | 新建：Strapi 环境变量模板 |
| `vendure.env` | 新建：Vendure 环境变量模板 |
| `nginx-template.txt` | 新建：Nginx 配置辅助（非供 1Panel 直接使用） |

---

### Task 1: 修改 .gitignore 允许 build 提交

**Files:**
- Modify: `E:\code\basic\.gitignore`

- [ ] **Step 1: 修改 .gitignore**

将 `.gitignore` 中第 130 行的 `build` 改为 `!build/`：

```diff
 .strapi
-build
+!build/
 .strapi-updater.json
```

- [ ] **Step 2: 验证修改**

```bash
cd E:\code\basic
git check-ignore build
```

Expected: 无输出（表示 `build/` 不再被忽略）。


### Task 2: 创建 build-prod.bat 本地构建脚本

**Files:**
- Create: `E:\code\basic\build-prod.bat`

- [ ] **Step 1: 创建脚本文件**

```batch
@echo off
chcp 65001 > nul
echo ========================================
echo  快速部署构建脚本
echo  1. 构建所有插件 dist
echo  2. 构建 Strapi（TS + admin panel）
echo ========================================
cd /d "%~dp0"

echo.
echo [1/2] 构建所有插件...
for /d %%p in (plugins\zhao-*) do (
    if exist "%%p\package.json" (
        echo   → 构建插件: %%p
        cd "%%p"
        call npx -y @strapi/sdk-plugin build >nul 2>&1
        if errorlevel 1 (
            echo   [警告] %%p 构建失败，检查是否已有 dist
        ) else (
            echo   [完成] %%p
        )
        cd "%~dp0"
    )
)

echo.
echo [2/2] 构建 Strapi 应用...
call npm run build
if errorlevel 1 (
    echo [错误] Strapi 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo.
echo 下一步：
echo   git add -A .
echo   git commit -m "build: rebuild for deploy"
echo   git push strapi main
echo ========================================
pause
```

- [ ] **Step 2: 验证脚本**

```bash
cd E:\code\basic
# 先空跑一次（npm ci 确保依赖完整）:
npm ci
```

确认 node_modules 完整后，双击 `build-prod.bat` 执行。


### Task 3: 优化数据库连接池

**Files:**
- Modify: `E:\code\basic\config\database.ts`

- [ ] **Step 1: 修改连接池配置**

找到 `postgres` 配置中的 `pool` 行：

```diff
- pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
+ pool: { min: env.int('DATABASE_POOL_MIN', 1), max: env.int('DATABASE_POOL_MAX', 5) },
```


### Task 4: 添加 git remote 并推送

**Files:** 无（git 操作）

- [ ] **Step 1: 添加 strapi 远程**

```bash
cd E:\code\basic
git remote add strapi git@github.com:johocn/strapi.git
git remote -v
```

Expected output:
```
origin   (现有远程)
strapi   git@github.com:johocn/strapi.git (fetch)
strapi   git@github.com:johocn/strapi.git (push)
```

- [ ] **Step 2: 构建后推送到 strapi 远程**

```bash
cd E:\code\basic
git add -A .
git commit -m "build: rebuild for deploy"
git push strapi main
```

Expected: 推送成功，GitHub 上 `johocn/strapi` 仓库包含 `dist/` 和 `build/` 目录。


### Task 5: 创建 install.sh 服务器安装脚本

**Files:**
- Create: `E:\code\basic\scripts\install.sh`（本地创建，上传到服务器）

- [ ] **Step 1: 创建脚本**

```bash
#!/bin/bash
set -e

# ========================================
# 快速安装脚本 — Strapi + Vendure + 前端
# 环境: 阿里云 2G/40G / 1Panel / Rocky Linux
# 用法: chmod +x install.sh && ./install.sh
# ========================================

BASE="/opt/joho"
LOG_DIR="/var/log/joho"
STRAPI_GIT="git@github.com:johocn/strapi.git"
VENDURE_GIT="git@github.com:johocn/vendure.git"
VSHOP_GIT="git@github.com:johocn/vshop.git"
SHOP_GIT="git@github.com:johocn/shop.git"
SITE_GIT="git@github.com:johocn/site.git"
DSITE_GIT="git@github.com:johocn/dsite.git"

echo "========================================"
echo " 快速安装脚本"
echo " 目标: $BASE"
echo "========================================"

# ---- Step 1: 环境检查 ----
echo ""
echo "[1/7] 检查环境..."

NODE_VERSION=$(node -v 2>/dev/null || echo "none")
echo "  Node.js: $NODE_VERSION"
if [ "$NODE_VERSION" = "none" ]; then
  echo "  [错误] 请先安装 Node.js >= 20"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "  [错误] npm 未安装"
  exit 1
fi

if ! command -v pm2 &>/dev/null; then
  echo "  → 安装 PM2..."
  npm install -g pm2
fi

if ! command -v git &>/dev/null; then
  echo "  [错误] Git 未安装"
  exit 1
fi

if ! docker ps &>/dev/null; then
  echo "  [警告] Docker 未运行，请确认 PostgreSQL 和 Redis 已启动"
else
  echo "  Docker: 运行中"
fi

# ---- Step 2: 创建目录 ----
echo ""
echo "[2/7] 创建目录..."
mkdir -p "$BASE" "$LOG_DIR"

# ---- Step 3: SSH 密钥提示 ----
echo ""
echo "[3/7] SSH 密钥检查..."
if [ ! -f ~/.ssh/id_ed25519.pub ] && [ ! -f ~/.ssh/id_rsa.pub ]; then
  echo "  → 未检测到 SSH 公钥。请执行以下命令："
  echo "    ssh-keygen -t ed25519 -C \"$(hostname)\""
  echo "    cat ~/.ssh/id_ed25519.pub"
  echo "  然后将公钥添加到 GitHub: Settings → SSH and GPG keys"
  echo ""
  read -p "  添加完成后按 Enter 继续..."
fi

# ---- Step 4: 克隆仓库 ----
echo ""
echo "[4/7] 克隆仓库..."

clone_or_pull() {
  local repo="$1"
  local dir="$2"
  if [ -d "$dir/.git" ]; then
    echo "  → 更新 $dir"
    cd "$dir" && git pull
  else
    echo "  → 克隆 $repo → $dir"
    git clone "$repo" "$dir"
  fi
}

clone_or_pull "$STRAPI_GIT" "$BASE/strapi"
clone_or_pull "$VENDURE_GIT" "$BASE/vendure"
clone_or_pull "$VSHOP_GIT" "$BASE/vshop"
clone_or_pull "$SHOP_GIT" "$BASE/shop"
clone_or_pull "$SITE_GIT" "$BASE/site"
clone_or_pull "$DSITE_GIT" "$BASE/dsite"

# 创建 uploads 目录
mkdir -p "$BASE/strapi/public/uploads"

# ---- Step 5: 安装生产依赖 ----
echo ""
echo "[5/7] 安装生产依赖..."

cd "$BASE/strapi"
npm ci --production --ignore-scripts
echo "  Strapi 依赖安装完成"

cd "$BASE/vendure"
npm ci --production --ignore-scripts || echo "  [警告] Vendure npm ci 失败，请手动检查"
cd "$BASE"

# ---- Step 6: 创建 .env 模板 ----
echo ""
echo "[6/7] 配置环境变量..."

if [ ! -f "$BASE/strapi.env" ]; then
  cat > "$BASE/strapi.env" << 'EOF'
HOST=127.0.0.1
PORT=1337
APP_KEYS="change-me-1,change-me-2,change-me-3,change-me-4"
API_TOKEN_SALT=change-me-api-token-salt
ADMIN_JWT_SECRET=change-me-admin-jwt-secret
TRANSFER_TOKEN_SALT=change-me-transfer-token-salt

DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_prod
DATABASE_USERNAME=strapi_user
DATABASE_PASSWORD=your_db_password_here

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EOF
  echo "  → 已生成 $BASE/strapi.env"
fi

if [ ! -f "$BASE/vendure.env" ]; then
  cat > "$BASE/vendure.env" << 'EOF'
NODE_ENV=production
HOST=127.0.0.1
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=vendure_prod
DB_USERNAME=vendure_user
DB_PASSWORD=your_db_password_here

COOKIE_SECRET=change-me-cookie-secret
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your_admin_password_here
EOF
  echo "  → 已生成 $BASE/vendure.env"
fi

echo ""
echo "  → 请编辑 .env 文件，填入实际密钥和数据库密码："
echo "    nano $BASE/strapi.env"
echo "    nano $BASE/vendure.env"
read -p "  编辑完成后按 Enter 继续..."

# ---- Step 7: PM2 启动 ----
echo ""
echo "[7/7] PM2 启动..."

# 确认 Vendure 入口文件
VENDURE_ENTRY="dist/index.js"
if [ ! -f "$BASE/vendure/$VENDURE_ENTRY" ]; then
  VENDURE_ENTRY=$(find "$BASE/vendure/dist" -name "index.js" -maxdepth 2 2>/dev/null | head -1)
  VENDURE_ENTRY=${VENDURE_ENTRY#"$BASE/vendure/"}
fi

cat > "$BASE/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: '$BASE/strapi',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=800',
        HOST: '127.0.0.1',
        PORT: 1337,
      },
      env_file: '$BASE/strapi.env',
      max_memory_restart: '850M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '$LOG_DIR/strapi-error.log',
      out_file: '$LOG_DIR/strapi-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'vendure',
      cwd: '$BASE/vendure',
      script: '$VENDURE_ENTRY',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=600',
        HOST: '127.0.0.1',
        PORT: 3000,
      },
      env_file: '$BASE/vendure.env',
      max_memory_restart: '650M',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '$LOG_DIR/vendure-error.log',
      out_file: '$LOG_DIR/vendure-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
EOF

pm2 start "$BASE/ecosystem.config.js"
pm2 save

# ---- 完成 ----
echo ""
echo "========================================"
echo " 安装完成！"
echo "========================================"
echo ""
echo " PM2 状态:"
pm2 status
echo ""
echo " 日志查看:"
echo "   tail -f $LOG_DIR/strapi-error.log"
echo "   tail -f $LOG_DIR/vendure-error.log"
echo ""
echo " 1Panel 网站配置:"
echo "   1. 网站 → 创建网站 → 填写域名"
echo "   2. api.joho.cn → 反向代理 127.0.0.1:1337"
echo "   3. shop-api.joho.cn → 反向代理 127.0.0.1:3000"
echo "   4. shop.joho.cn → 上传前端 dist 到 /opt/joho/shop/dist/"
echo "   5. cross.joho.cn → 上传前端 dist 到 /opt/joho/vshop/dist/"
echo "   6. course.joho.cn → 上传前端 dist 到 /opt/joho/site/dist/"
echo "   7. www.joho.cn → 上传前端 dist 到 /opt/joho/dsite/dist/"
echo ""
echo " 更新代码:"
echo "   cd /opt/joho/strapi && git pull && npm ci --production --ignore-scripts && pm2 restart strapi"
echo "   cd /opt/joho/vendure && git pull && npm ci --production --ignore-scripts && pm2 restart vendure"
echo "========================================"
```

> 注意：此脚本在本地 `E:\code\basic\scripts\install.sh` 中创建，随后上传到服务器。

- [ ] **Step 2: 设置可执行权限**

```bash
chmod +x scripts/install.sh
```


### Task 6: 自审与提交

**Files:** 无

- [ ] **Step 1: 本地提交所有变更**

```bash
cd E:\code\basic
git add -A .
git status
```

确认包含以下变更：
- `.gitignore` 修改
- `build-prod.bat` 新建
- `config/database.ts` 修改（连接池）
- `scripts/install.sh` 新建

```bash
git commit -m "feat: add production deployment scripts and config optimization"
```

---

## 自审检查

**1. Spec 覆盖：**
- ✅ .gitignore `build` → `!build/` → Task 1
- ✅ 本地构建脚本 → Task 2
- ✅ 数据库连接池优化 → Task 3
- ✅ git remote + 推送 → Task 4
- ✅ 服务器安装脚本（clone/npm ci/.env/PM2/上传指引）→ Task 5
- ✅ 自审与提交 → Task 6

**2. 占位符检查：** 无 TBD/TODO，所有代码块完整。

**3. 类型一致性：** 无跨任务类型引用问题。
