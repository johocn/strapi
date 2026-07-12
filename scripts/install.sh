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
  echo "  使用 nvm 或 1Panel 应用商店安装"
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
  echo "  执行: yum install -y git 或 apt install -y git"
  exit 1
fi

if docker ps &>/dev/null 2>&1; then
  echo "  Docker: 运行中 ✓"
else
  echo "  [警告] Docker 未运行，请通过 1Panel 确认 PostgreSQL 和 Redis 已启动"
fi

# ---- Step 2: 创建目录 ----
echo ""
echo "[2/7] 创建目录..."
mkdir -p "$BASE" "$LOG_DIR"
echo "  → $BASE"
echo "  → $LOG_DIR"

# ---- Step 3: SSH 密钥提示 ----
echo ""
echo "[3/7] SSH 密钥检查..."
if [ ! -f ~/.ssh/id_ed25519.pub ] && [ ! -f ~/.ssh/id_rsa.pub ]; then
  echo "  → 未检测到 SSH 公钥。请执行:"
  echo "    ssh-keygen -t ed25519 -C \"$(hostname)\""
  echo "    cat ~/.ssh/id_ed25519.pub"
  echo "  复制输出内容，添加到 GitHub: Settings → SSH and GPG keys → New SSH key"
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
    cd "$dir" && git pull || echo "  [警告] git pull 失败，请手动检查"
  else
    echo "  → 克隆 $repo"
    git clone "$repo" "$dir"
  fi
}

clone_or_pull "$STRAPI_GIT" "$BASE/strapi"
clone_or_pull "$VENDURE_GIT" "$BASE/vendure"
clone_or_pull "$VSHOP_GIT" "$BASE/vshop"
clone_or_pull "$SHOP_GIT" "$BASE/shop"
clone_or_pull "$SITE_GIT" "$BASE/site"
clone_or_pull "$DSITE_GIT" "$BASE/dsite"

# 创建上传目录
mkdir -p "$BASE/strapi/public/uploads"
echo "  → 创建 $BASE/strapi/public/uploads"

# ---- Step 5: 安装生产依赖 ----
echo ""
echo "[5/7] 安装生产依赖..."

echo "  → Strapi..."
cd "$BASE/strapi"
npm ci --production --ignore-scripts
echo "  Strapi 完成"

echo "  → Vendure..."
cd "$BASE/vendure"
npm ci --production --ignore-scripts || echo "  [警告] Vendure npm ci 失败，请手动检查"
cd "$BASE"

# ---- Step 6: 配置环境变量 ----
echo ""
echo "[6/7] 配置环境变量..."

if [ ! -f "$BASE/strapi.env" ]; then
  cat > "$BASE/strapi.env" << 'EOF'
HOST=127.0.0.1
PORT=1337
APP_KEYS="change-me-key-1,change-me-key-2,change-me-key-3,change-me-key-4"
API_TOKEN_SALT=change-me-token-salt
ADMIN_JWT_SECRET=change-me-jwt-secret
TRANSFER_TOKEN_SALT=change-me-transfer-salt

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
EOF
  echo "  → 已生成 $BASE/vendure.env"
fi

echo ""
echo "  ⚠ 请编辑以下文件，填入实际密钥和数据库密码："
echo "    nano $BASE/strapi.env"
echo "    nano $BASE/vendure.env"
echo ""
read -p "  编辑完成后按 Enter 继续..."

# ---- Step 7: PM2 启动 ----
echo ""
echo "[7/7] PM2 启动..."

# 确认 Vendure 入口文件
VENDURE_SCRIPT="dist/index.js"
if [ ! -f "$BASE/vendure/$VENDURE_SCRIPT" ]; then
  VENDURE_SCRIPT=$(find "$BASE/vendure/dist" -maxdepth 2 -name "index.js" 2>/dev/null | head -1)
  VENDURE_SCRIPT=${VENDURE_SCRIPT#$BASE/vendure/}
  if [ -z "$VENDURE_SCRIPT" ]; then
    echo "  [警告] 未找到 Vendure 入口文件，设置为 dist/index.js"
    VENDURE_SCRIPT="dist/index.js"
  fi
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
      script: '$VENDURE_SCRIPT',
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
pm2 startup

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
echo " 1Panel 网站配置（共 6 个站点）:"
echo "   1. api.joho.cn       → 反向代理 127.0.0.1:1337"
echo "   2. shop-api.joho.cn  → 反向代理 127.0.0.1:3000"
echo "   3. www.joho.cn       → 静态文件 /opt/joho/dsite/dist/"
echo "   4. shop.joho.cn      → 静态文件 /opt/joho/shop/dist/"
echo "   5. cross.joho.cn     → 静态文件 /opt/joho/vshop/dist/"
echo "   6. course.joho.cn    → 静态文件 /opt/joho/site/dist/"
echo ""
echo " 代码更新命令:"
echo "   strapi:"
echo "     cd /opt/joho/strapi && git pull && npm ci --production --ignore-scripts && pm2 restart strapi"
echo "   vendure:"
echo "     cd /opt/joho/vendure && git pull && npm ci --production --ignore-scripts && pm2 restart vendure"
echo "   前端:"
echo "     本地构建后 git push → 服务器 cd /opt/joho/*/ && git pull"
echo "========================================"
