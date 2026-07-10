#!/bin/bash
# ============================================
# 一键部署脚本
# 用法：./deploy.sh
# 前提：本地已用 HBuilderX 构建 web 和 shao 的 H5 产物
# ============================================
set -e

# ===== 配置区（按实际修改） =====
SSH_USER="root"
SSH_HOST="你的服务器IP"
REMOTE_DIR="/opt/strapi/basic"
WEB_DIST="/var/www/web"
SHAO_DIST="/var/www/shao"
# ================================

echo "=========================================="
echo "  开始部署 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# ===== 1. 后端部署 =====
echo ""
echo ">>> [1/3] 部署后端..."
ssh $SSH_USER@$SSH_HOST << 'EOF'
  cd /opt/strapi/basic
  echo "  拉取最新代码..."
  git pull origin main
  echo "  安装依赖..."
  npm install --legacy-peer-deps
  echo "  构建插件..."
  ./scripts/build-plugins.sh
  echo "  构建主项目..."
  npm run build
  echo "  重启 Strapi..."
  pm2 restart strapi
  echo "  后端部署完成"
EOF

# ===== 2. 前端部署（web 后台） =====
echo ""
echo ">>> [2/3] 部署后台管理 (web)..."
if [ -d "e:/code/web/unpackage/dist/build/h5" ]; then
  ssh $SSH_USER@$SSH_HOST "rm -rf $WEB_DIST/*"
  scp -r e:/code/web/unpackage/dist/build/h5/* $SSH_USER@$SSH_HOST:$WEB_DIST/
  echo "  后台管理部署完成"
else
  echo "  警告: 未找到 web H5 构建产物，跳过"
fi

# ===== 3. 前端部署（shao C端） =====
echo ""
echo ">>> [3/3] 部署 C 端 (shao)..."
if [ -d "e:/code/shao/unpackage/dist/build/h5" ]; then
  ssh $SSH_USER@$SSH_HOST "rm -rf $SHAO_DIST/*"
  scp -r e:/code/shao/unpackage/dist/build/h5/* $SSH_USER@$SSH_HOST:$SHAO_DIST/
  echo "  C 端部署完成"
else
  echo "  警告: 未找到 shao H5 构建产物，跳过"
fi

echo ""
echo "=========================================="
echo "  部署完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  后台管理: http://h.joho.cn"
echo "  Strapi Admin: http://h.joho.cn/admin"
echo "  C 端: http://<租户域名>"
echo "=========================================="
