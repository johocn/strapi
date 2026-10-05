#!/bin/bash
# zhao-studio 生产健康检查
# 用法: bash scripts/healthcheck.sh [TOKEN]
# exit: 0=healthy, 1=有问题

set -uo pipefail
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin

BASE="${BASE:-http://localhost:1337}"
REDIS_PASS="${REDIS_PASS:-Joho@963963}"
REDIS_CONTAINER="${REDIS_CONTAINER:-1Panel-redis-mJDW}"
REDIS="docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASS"
TOKEN="${1:-}"
EXIT_CODE=0

ok()   { echo "  ✅ $*"; }
fail() { echo "  ❌ $*"; EXIT_CODE=1; }
warn() { echo "  ⚠️  $*"; }

echo "=== zhao-studio healthcheck ($(date +%H:%M:%S)) ==="

# 1. Strapi HTTP
echo ""
echo "[1/6] Strapi HTTP"
# POST auth/local（GET 404 是正常的，POST 会返回 200/400/401 任一都说明活的）
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
  -X POST "$BASE/api/auth/local" -H "Content-Type: application/json" -d '{}')
if [ "$CODE" -ge 200 ] && [ "$CODE" -lt 500 ]; then
  ok "Strapi 可达 (HTTP $CODE)"
else
  fail "Strapi 不可达 (HTTP $CODE)"
fi

# 2. Redis
echo ""
echo "[2/6] Redis"
if $REDIS PING 2>/dev/null | grep -q PONG; then
  ok "Redis PONG"
else
  fail "Redis 不可连"
fi

# 3. BullMQ queue 状态
echo ""
echo "[3/6] BullMQ studio-publish"
for state in wait active delayed stalled failed completed; do
  KEY="bull:studio-publish:$state"
  TYPE=$($REDIS TYPE "$KEY" 2>/dev/null | tr -d '\r')
  case "$TYPE" in
    none) N=0 ;;
    list) N=$($REDIS LLEN "$KEY" 2>/dev/null | tr -d '\r') ;;
    zset) N=$($REDIS ZCARD "$KEY" 2>/dev/null | tr -d '\r') ;;
    hash|set) N=$($REDIS HLEN "$KEY" 2>/dev/null | tr -d '\r') ;;
    *) N="-" ;;
  esac
  [ -z "$N" ] || [ "$N" = "-" ] && continue
  if [ "$state" = "failed" ] && [ "$N" -gt 0 ]; then
    warn "failed=$N (有失败 job)"
  elif [ "$state" = "stalled" ] && [ "$N" -gt 0 ]; then
    fail "stalled=$N (worker 可能挂了)"
  else
    ok "$state=$N"
  fi
done

# 4. Scheduler cron (BullMQ 5 repeatable 在 bull:{qname}:repeat ZSET)
echo ""
echo "[4/6] BullMQ studio-scheduler cron"
REPEAT_ZSET="bull:studio-scheduler:repeat"
REPEAT_COUNT=$($REDIS ZCARD "$REPEAT_ZSET" 2>/dev/null | tr -d '\r')
if [ "$REPEAT_COUNT" -gt 0 ]; then
  # 取 score 最大的（最近一次已执行的）或 score 最小的（下一次待执行的）
  NEXT_SCORE=$($REDIS ZRANGE "$REPEAT_ZSET" 0 0 WITHSCORES 2>/dev/null | tail -1 | tr -d '\r')
  if [ -n "$NEXT_SCORE" ] && [ "$NEXT_SCORE" -gt 0 ] 2>/dev/null; then
    NOW_MS=$(date +%s%3N)
    DELTA=$(( (NEXT_SCORE - NOW_MS) / 1000 ))
    if [ "$DELTA" -ge 0 ] && [ "$DELTA" -lt 180 ]; then
      ok "${REPEAT_COUNT} repeatable jobs, 下次 ${DELTA}s 后"
    else
      warn "${REPEAT_COUNT} repeatable jobs, delta=${DELTA}s (可能有延迟)"
    fi
  else
    ok "${REPEAT_COUNT} repeatable jobs 已注册"
  fi
else
  fail "scan-and-trigger repeatable 不存在 (cron 未注册)"
fi

# 5. Publish 成功率（最近 24h）
echo ""
echo "[5/6] publish-record 成功率"
if [ -n "$TOKEN" ]; then
  RAW=$(curl -s "$BASE/api/zhao-studio/v1/admin/records?pagination[pageSize]=100&sort[createdAt]=desc" \
    -H "Authorization: Bearer $TOKEN" --max-time 10)
  STATS=$(echo "$RAW" | node -e "
process.stdin.on('data',d=>{
  const j=JSON.parse(d);
  if(j.error){console.log('api_err:'+j.error.message);return}
  const data = j.data || [];
  const recent24 = data.filter(r=>(Date.now()-new Date(r.createdAt).getTime())<86400000);
  const s = { total: recent24.length, success: 0, failed: 0, rejected: 0, queued: 0 };
  for(const r of recent24){ s[r.attributes.status] = (s[r.attributes.status]||0)+1; }
  console.log(JSON.stringify(s));
})")
  if echo "$STATS" | grep -q "api_err"; then
    warn "records API: $(echo $STATS | cut -d: -f2)"
  else
    TOTAL=$(echo "$STATS" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.total||0)})")
    SUCCESS=$(echo "$STATS" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success||0)})")
    if [ "$TOTAL" -gt 0 ]; then
      RATE=$(( SUCCESS * 100 / TOTAL ))
      if [ "$RATE" -ge 80 ]; then
        ok "最近24h: total=$TOTAL success=$SUCCESS rate=${RATE}%"
      else
        fail "最近24h: total=$TOTAL success=$SUCCESS rate=${RATE}% (低于 80%)"
      fi
    else
      ok "最近24h 无发布记录"
    fi
  fi
else
  warn "未传 TOKEN，跳过 record 成功率检查"
fi

# 6. PM2 进程
echo ""
echo "[6/6] PM2 strapi"
PM2_HOME="${PM2_HOME:-/home/admin/.pm2}"
export PM2_HOME
PM2_STATUS=$(pm2 describe strapi 2>/dev/null | grep -i "status" | head -1 | awk '{print $4}')
if [ "$PM2_STATUS" = "online" ]; then
  ok "PM2 strapi online"
else
  fail "PM2 strapi status=$PM2_STATUS"
fi

echo ""
if [ "$EXIT_CODE" = "0" ]; then
  echo "=== ALL GOOD ==="
else
  echo "=== ISSUES FOUND (exit=$EXIT_CODE) ==="
fi
exit $EXIT_CODE
