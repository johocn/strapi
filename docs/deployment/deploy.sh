#!/bin/bash
# ============================================
# 服务器一键部署脚本
# 用法：在服务器上 ./deploy.sh
# 前提：本地已构建并 git push，构建产物已在仓库中
# ============================================
set -e

echo "=========================================="
echo "  开始部署 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo ""
echo ">>> [1/3] 拉取最新代码..."
git pull origin main

echo ""
echo ">>> [2/3] 安装依赖..."
npm install --legacy-peer-deps

echo ""
echo ">>> [3/3] 重启 Strapi..."
pm2 restart strapi

echo ""
echo "=========================================="
echo "  部署完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Strapi Admin: http://localhost:1337/admin"
echo "=========================================="
