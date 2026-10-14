#!/usr/bin/env bash
# safe-restart.sh — 2G 内存服务器 strapi 错峰重启（防 OOM crash loop）
#
# 背景：vendure(~400M) + nshop(~150M) + postgres(~400M) 常驻下，strapi 启动峰值 ~460M
# 会顶穿 1.87G 物理内存被 OOM killer 杀，且 strapi bootstrap 每次启动自动跑 zhao-search
# 全量索引（约 110s），重启即死循环（2026-10-14 曾 pm2 ↺ 6200+，dmesg 每 ~15s 一次 Killed process）。
#
# 铁律：绝不在 vendure 运行中启动 strapi。
#
# 流程：停 vendure+nshop → strapi 以 ecosystem.config.cjs 为准重建（含 crash-loop 防护参数）
#       → 轮询健康 → settle（等 bootstrap 全量索引内存峰值回落）→ 回起 vendure（等健康）→ 回起 nshop → pm2 save
#
# 关键实测（2026-10-14）：strapi 端口 ~28s 即开始响应，但 bootstrap 全量索引继续灌内存、
# 峰值 ~690MB 在其后——健康探测通过后立即回起 vendure 会被顶爆（曾三连 OOM）。
# settle 默认 90s，端口响应 + settle ≈ 120s，与「strapi 独启等 100-110s 再回起」的历史安全经验吻合。
# 可用环境变量覆盖：STRAPI_SETTLE=120 bash scripts/safe-restart.sh
#
# 用法（服务器，admin 用户登录 shell）：bash /www/apps/strapi/scripts/safe-restart.sh
# deploy.mjs 部署默认走本脚本；vendure/nshop 自身的部署/重启不受此铁律约束，勿混用。
# 失败时 vendure/nshop 保持停止状态（避免回起再次挤死 strapi），排查后手动回起：
#   pm2 start vendure nshop

set -u

STRAPI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STRAPI_URL="http://127.0.0.1:1337"
VENDURE_URL="http://127.0.0.1:3020/admin-api"
STRAPI_TIMEOUT=300
STRAPI_SETTLE="${STRAPI_SETTLE:-90}"
VENDURE_TIMEOUT=120
POLL_INTERVAL=5

command -v pm2 >/dev/null 2>&1 || { echo "[FATAL] pm2 不在 PATH（请以 admin 用户在登录 shell 执行）"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "[FATAL] curl 不可用"; exit 1; }

# strapi：1337 端口任意 HTTP 响应（含 404/401）即视为 node 监听完成
# （production 下 /admin 与部分路由 404，不能用作健康判据；node 在 bootstrap 完成后才 listen）
strapi_up() { curl -s -o /dev/null -m 3 "$STRAPI_URL/"; }
# vendure：GraphQL admin-api 应答 {"data":...}
vendure_up() {
  curl -s -m 5 -X POST "$VENDURE_URL" -H "Content-Type: application/json" \
    -d '{"query":"{__typename}"}' | grep -q '"data"'
}

wait_up() { # $1=名称 $2=探测函数名 $3=超时秒
  local name="$1" fn="$2" timeout="$3" deadline=$((SECONDS + $3))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if "$fn"; then echo " [OK] $name 健康（耗时 ${SECONDS}s）"; return 0; fi
    echo -n "."
    sleep "$POLL_INTERVAL"
  done
  echo " [FATAL] $name ${timeout}s 内未达健康"
  return 1
}

echo "=== 1/6 停 vendure + nshop（释放内存给 strapi 启动）==="
pm2 stop vendure nshop 2>/dev/null || true

echo "=== 2/6 重建 strapi（以 ecosystem.config.cjs 为准，含 crash-loop 防护参数）==="
pm2 delete strapi 2>/dev/null || true
if ! pm2 start "$STRAPI_DIR/ecosystem.config.cjs"; then
  echo "[FATAL] strapi 启动失败（检查 ecosystem.config.cjs 语法：node -e \"require('$STRAPI_DIR/ecosystem.config.cjs')\"）"
  exit 1
fi

echo "=== 3/6 等待 strapi 健康（最长 ${STRAPI_TIMEOUT}s）==="
if ! wait_up strapi strapi_up "$STRAPI_TIMEOUT"; then
  pm2 logs strapi --lines 30 --nostream
  echo "[HINT] vendure/nshop 保持停止；排查后手动回起：pm2 start vendure nshop"
  exit 1
fi

echo "=== 4/6 settle ${STRAPI_SETTLE}s：等 bootstrap 全量索引内存峰值回落 ==="
sleep "$STRAPI_SETTLE"
if ! strapi_up; then
  echo "[FATAL] settle 期间 strapi 失去响应（疑似启动期崩溃，参见 crash-loop 防护）"
  pm2 logs strapi --lines 30 --nostream
  echo "[HINT] vendure/nshop 保持停止；排查后手动回起：pm2 start vendure nshop"
  exit 1
fi
free -m | awk 'NR==2{print "  内存:",$3"MB used /",$7"MB available"}'

echo "=== 5/6 回起 vendure ==="
pm2 start vendure
if ! wait_up vendure vendure_up "$VENDURE_TIMEOUT"; then
  echo "[HINT] strapi 已健康；vendure 异常请单独排查：pm2 logs vendure"
  exit 1
fi

echo "=== 6/6 回起 nshop + pm2 save ==="
pm2 start nshop
pm2 save

pm2 ls
free -m | sed -n '2p'
echo "[DONE] 错峰重启完成"
