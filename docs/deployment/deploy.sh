#!/bin/bash
# ============================================
# 服务器一键部署脚本
# 用法：cd /www/apps/strapi && ./docs/deployment/deploy.sh
# 前提：本地已构建并 git push，构建产物已在仓库中
# ============================================
set -e

# 确保在项目根目录运行（脚本位于 docs/deployment/，向上 2 级即项目根）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."
cd "$PROJECT_DIR"

echo "=========================================="
echo "  开始部署 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  工作目录: $(pwd)"
echo "=========================================="

echo ""
echo ">>> [1/3] 拉取最新代码..."
git pull origin main

echo ""
echo ">>> [2/3] 安装依赖..."
npm install --legacy-peer-deps

echo ""
echo ">>> [3/3] 重启 Strapi..."
# 使用 ecosystem.config.cjs 确保 PM2 在正确目录运行
if pm2 describe strapi > /dev/null 2>&1; then
    pm2 restart strapi
else
    pm2 start ecosystem.config.cjs
    pm2 save
fi

echo ""
echo "=========================================="
echo "  部署完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Strapi Admin: http://localhost:1337/admin"
echo "=========================================="
