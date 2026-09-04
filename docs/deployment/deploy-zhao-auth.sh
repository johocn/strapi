#!/bin/bash
# ============================================
# zhao-auth 插件专属部署脚本（无新增依赖，低风险）
# 用法：cd /www/apps/strapi && ./docs/deployment/deploy-zhao-auth.sh
# 前提：
#   1) 本地已修改 zhao-auth 源码并在插件目录执行构建（scripts/build-plugins.ps1）
#   2) 本地已 git add + commit 插件源码与 dist 产物，并 git push 到 origin main
# 说明：自上版以来未新增 dependencies，部署只做「拉代码 + 重启」，不触发完整 npm install，
#       规避 2G 服务器安装依赖 OOM 风险。
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."
cd "$PROJECT_DIR"

PLUGIN="plugins/zhao-auth"

echo "=========================================="
echo "  开始部署 zhao-auth - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  服务器目录: $(pwd)"
echo "=========================================="

echo ""
echo ">>> [1/4] 拉取最新代码（含 zhao-auth 源码与 dist）..."
git pull origin main

echo ""
echo ">>> [2/4] 校验插件目录与构建产物存在..."
for f in "$PLUGIN/strapi-server.js" "$PLUGIN/dist/server/index.mjs" "$PLUGIN/strapi-admin.js" "$PLUGIN/dist/admin/index.mjs"; do
    if [ ! -f "$f" ]; then
        echo "❌ 缺少文件: $f"
        exit 1
    fi
done
echo "✅ 插件文件齐全"

echo ""
echo ">>> [3/4] 校验新增接口已进入产物..."
if grep -c "syncSsoProfile" "$PLUGIN/dist/server/index.js" >/dev/null 2>&1; then
    echo "✅ syncSsoProfile 已在产物中"
else
    echo "⚠️  产物中未找到 syncSsoProfile，请确认已构建"
fi

echo ""
echo ">>> [4/4] 重启 Strapi..."
if pm2 describe strapi > /dev/null 2>&1; then
    pm2 restart strapi
    pm2 save
else
    echo "❌ 未找到 pm2 进程 strapi，请先确认进程名（pm2 list）"
    exit 1
fi

echo ""
echo "=========================================="
echo "  部署完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  验证：pm2 status"
echo "=========================================="