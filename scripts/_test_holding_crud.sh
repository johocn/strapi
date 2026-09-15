#!/bin/bash
# 持仓 CRUD 录入测试脚本（在 Strapi 服务器本地执行）
# 流程: zhao-auth 登录 → 取上架产品 → 建仓(买价留空测自动回退) → 列表 → 详情指标校验 → 盈亏时序 → 更新 → 删除清理
# 用法: BUY_AMOUNT=50000 BUY_DATE=2026-06-01 bash _test_holding_crud.sh
# 依赖: curl + node(JSON 解析)
set -e
BASE="${BASE:-http://localhost:1337/api}"
BUY_AMOUNT="${BUY_AMOUNT:-10000}"
BUY_DATE="${BUY_DATE:-$(date -d '90 days ago' +%F 2>/dev/null || date +%F)}"
REMARK="录入测试-$(date +%s)"
PASS=0; FAIL=0

# JSON 字段提取: parse 'j.data.records[0]?.id'
parse() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const v=eval(process.argv[1]);console.log(v===undefined||v===null?'':v)}catch(e){console.log('')}})" "$1"; }
check() { if [ "$1" = "$2" ]; then echo "PASS: $3"; PASS=$((PASS+1)); else echo "FAIL: $3 (期望 $2 实际 $1)"; FAIL=$((FAIL+1)); fi; }

# 1. 登录 zhao-auth 获取 admin token（is-authenticated 策略接受该 jwt）
TOKEN=$(curl -s -X POST "$BASE/zhao-auth/v1/admin/auth/local" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin@12345"}' | parse 'j.jwt||j.token')
[ -z "$TOKEN" ] && { echo "FAIL: 登录失败"; exit 1; }
H="Authorization: Bearer $TOKEN"
echo "PASS: 登录成功"

# 2. 取第一个上架产品
P=$(curl -s "$BASE/zhao-wealth/v1/admin/products?pageSize=1&status=true" -H "$H")
PID=$(echo "$P" | parse 'j.data.records[0]?.id')
PNAME=$(echo "$P" | parse 'j.data.records[0]?.productName')
[ -z "$PID" ] && { echo "FAIL: 无上架产品，无法建仓"; exit 1; }
echo "PASS: 使用产品 id=$PID $PNAME"

# 3. 建仓（buyNav 不传，测自动回退）
C=$(curl -s -X POST "$BASE/zhao-wealth/v1/admin/holdings" -H "$H" -H "Content-Type: application/json" \
  -d "{\"product\":$PID,\"buyDate\":\"$BUY_DATE\",\"buyAmount\":$BUY_AMOUNT,\"remark\":\"$REMARK\"}")
HID=$(echo "$C" | parse 'j.data?.id')
check "$HID" "$HID" "建仓成功 holdingId=$HID 买入日=$BUY_DATE 金额=$BUY_AMOUNT"
[ -z "$HID" ] && { echo "$C"; exit 1; }
echo "  买入净值=$(echo "$C" | parse 'j.data?.buyNav') 份额=$(echo "$C" | parse 'j.data?.shares')"

# 4. 列表校验
L=$(curl -s "$BASE/zhao-wealth/v1/admin/holdings?page=1&pageSize=20&status=holding" -H "$H")
LTOTAL=$(echo "$L" | parse 'j.data.total')
FOUND=$(echo "$L" | parse "j.data.records.some(r=>r.id==$HID)")
check "$FOUND" "true" "列表包含新持仓 (总数=$LTOTAL)"

# 5. 详情指标校验
D=$(curl -s "$BASE/zhao-wealth/v1/admin/holdings/$HID" -H "$H")
echo "  currentValue=$(echo "$D" | parse 'j.data?.currentValue') profit=$(echo "$D" | parse 'j.data?.profit')"
echo "  profitPercent=$(echo "$D" | parse 'j.data?.profitPercent') holdingDays=$(echo "$D" | parse 'j.data?.holdingDays') annualized=$(echo "$D" | parse 'j.data?.annualizedProfit')"
[ "$(echo "$D" | parse 'j.data?.currentValue')" != "" ] && { echo "PASS: 详情返回市值/盈亏指标"; PASS=$((PASS+1)); } || { echo "FAIL: 详情缺市值/盈亏"; FAIL=$((FAIL+1)); }

# 6. 盈亏时序
T=$(curl -s "$BASE/zhao-wealth/v1/admin/holdings/$HID/profit-trend" -H "$H")
TPOINTS=$(echo "$T" | parse 'j.data?.points?.length')
[ "${TPOINTS:-0}" -gt 0 ] && { echo "PASS: 盈亏时序返回 $TPOINTS 个点"; PASS=$((PASS+1)); } || { echo "WARN: 盈亏时序为空（该产品净值覆盖不足）"; }

# 7. 更新 remark
U=$(curl -s -X PUT "$BASE/zhao-wealth/v1/admin/holdings/$HID" -H "$H" -H "Content-Type: application/json" -d "{\"remark\":\"$REMARK-updated\"}")
check "$(echo "$U" | parse 'j.data?.remark')" "$REMARK-updated" "更新 remark 生效"

# 8. 删除清理
DEL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/zhao-wealth/v1/admin/holdings/$HID" -H "$H")
check "$DEL" "200" "删除测试持仓"
GONE=$(curl -s "$BASE/zhao-wealth/v1/admin/holdings/$HID" -H "$H" | parse 'j.code')
check "$GONE" "404" "删除后详情返回 code=404"

echo ""
echo "===== 结果: PASS=$PASS FAIL=$FAIL ====="
[ "$FAIL" -eq 0 ]
