# 银行理财评分标尺收紧 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将银行理财（bank-wealth）的波动率标尺从 0.03 收紧到 0.005，并新增按类型的回撤标尺 0.005，恢复波动/回撤维度评分区分度，解决产品 4/6 综合分同为 81 的趋同问题。

**Architecture:** 标尺是纯配置驱动：config.ts 的 `scoreScales` 定义标尺值，scoring-service.ts 的 `absoluteVolatilityScore` 已支持按类型取标尺，`absoluteDrawdownScore` 需补上 productType 参数以支持新增的 `drawdownScaleByType`。改配置+评分函数后重算快照即可生效，无需动表结构。

**Tech Stack:** TypeScript / Jest（Strapi 插件 zhao-wealth）/ PostgreSQL（生产验证）

---

## 受影响文件

- Modify: `plugins/zhao-wealth/server/src/config.ts`（`volatilityScaleByType['bank-wealth']` 0.03→0.005、新增 `drawdownScaleByType`）
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts`（`absoluteDrawdownScore` 加 productType 参数、`calculateScore` 调用处、scoreScales 默认值）
- Modify: `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts`（新增 2 断言 + 更新 1 处 compositeScore）
- 部署：joho（39.97.54.5）Strapi 生产机，git pull + pm2 restart

**关键预期值（09-16 生产数据复算）：**
- 产品 4（bank-wealth，波动 0.001455/回撤 -0.000194/年化 1.42%）：综合分 81 → **74**
- 产品 6（daily-open，波动 0.000826/回撤 0/年化 2.4%）：综合分 81 → **78**

---

### Task 1: 标尺调整（TDD：先改测试，再改代码）

**Files:**
- Modify: `plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts`
- Modify: `plugins/zhao-wealth/server/src/config.ts`
- Modify: `plugins/zhao-wealth/server/src/services/scoring-service.ts`

- [ ] **Step 1: 更新测试——config 断言增加标尺值校验**

在 `scoring-service.test.ts` 第 41 行 `it('config 含按类型收益标尺与 operation_mode 别名', ...)` 的 `expect` 块内追加：

```typescript
    expect(pluginConfig.scoreScales.volatilityScaleByType['bank-wealth']).toBe(0.005);
    expect(pluginConfig.scoreScales.drawdownScaleByType['bank-wealth']).toBe(0.005);
```

- [ ] **Step 2: 更新测试——负收益用例的 compositeScore 期望（52 → 15）**

`it('银行理财负收益按对称标尺计分（-2% → 30 分）', ...)` 中（该用例波动 0.01、回撤 -0.01，均超过 0.005 新标尺 → 波动分/回撤分 clamp 为 0）：

```typescript
    expect(score!.compositeScore).toBe(15); // 30*.5 + 0*.25 + 0*.25（波动1%/回撤1%超0.005标尺→0分）
```

- [ ] **Step 3: 新增测试——bank-wealth 波动分按 0.005 标尺**

在 `it('银行理财负收益按对称标尺计分...')` 用例之后插入：

```typescript
  it('银行理财波动分按 0.005 标尺（0.05% → 90 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.01 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: 0 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.volatilityScore).toBe(90); // (1 - 0.0005/0.005)*100
  });

  it('银行理财回撤分按 0.005 标尺（-0.02% → 96 分）', async () => {
    mockProductFindOne.mockResolvedValue({ id: 1, productType: 'bank-wealth', operationMode: 'open' });
    mockSnapshotFindOne.mockResolvedValue({ annual1m: 0.01 });
    mockMetricFindMany.mockImplementation((opts: any) => {
      const map: Record<string, number> = { volatility: 0.0005, maxDrawdown: -0.0002 };
      const v = map[opts.where.metricName];
      return Promise.resolve(v !== undefined ? [{ metricValue: v }] : []);
    });

    const score = await service.calculateScore(1, 'm1');
    expect(score!.drawdownScore).toBe(96); // (1 + (-0.0002)/0.005)*100
  });
```

- [ ] **Step 4: 运行测试确认失败**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage --testPathPatterns=scoring-service`

Expected: 2 个新用例失败（`volatilityScore`/`drawdownScore` 为 83/96 附近而非 90/96——旧标尺下 0.0005 波动 → (1-0.0005/0.03)*100=98）、config 断言失败、负收益用例失败（composite 52≠15）。

- [ ] **Step 5: 修改 config.ts——收紧波动标尺 + 新增回撤标尺**

在 `plugins/zhao-wealth/server/src/config.ts` 的 `scoreScales` 内（约第 43-47 行），将：

```typescript
    volatilityScaleByType: {
      'bank-wealth': 0.03,
      'money-fund': 0.02,
      'money-wealth': 0.02,
    },
```

改为：

```typescript
    volatilityScaleByType: {
      'bank-wealth': 0.005,
      'money-fund': 0.02,
      'money-wealth': 0.02,
    },
    // 按产品类型覆盖回撤标尺（银行理财真实回撤 0~0.2%，全局 0.05 形同虚设）
    drawdownScaleByType: {
      'bank-wealth': 0.005,
    },
```

- [ ] **Step 6: 修改 scoring-service.ts——absoluteDrawdownScore 按类型取标尺**

(a) 第 30 行 scoreScales 默认值追加 `drawdownScaleByType: {}`：

```typescript
  const scoreScales = config?.scoreScales || { returnScale: 0.06, volatilityScale: 0.10, drawdownScale: 0.05, volatilityScaleByType: {}, drawdownScaleByType: {} };
```

(b) `absoluteDrawdownScore`（第 107-110 行）加 productType 参数：

```typescript
  function absoluteDrawdownScore(maxDrawdown: number | null, productType?: string): number {
    if (maxDrawdown === null || isNaN(Number(maxDrawdown))) return 50;
    const scale = (scoreScales.drawdownScaleByType && scoreScales.drawdownScaleByType[productType || ''])
      ?? scoreScales.drawdownScale;
    return clampScore((1 + Number(maxDrawdown) / scale) * 100);
  }
```

(c) `calculateScore` 内调用处（第 177 行）传入 productType：

```typescript
    const drawdownScore = absoluteDrawdownScore(metrics.maxDrawdown, product.productType);
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage --testPathPatterns=scoring-service`

Expected: 全部通过（7 个用例，含新增 2 个）。同时核对 `getScoreBreakdown` 返回的 `scales` 中含 `drawdownScaleByType`。

- [ ] **Step 8: 运行全量测试确认无其他用例受影响**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm test -- --no-coverage`

Expected: 全部通过（其他测试文件未引用 drawdownScale/波动标尺，已确认）。

- [ ] **Step 9: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/config.ts plugins/zhao-wealth/server/src/services/scoring-service.ts plugins/zhao-wealth/server/src/__tests__/scoring-service.test.ts
git commit -m "feat(zhao-wealth): 收紧银行理财波动/回撤标尺至0.005（修复评分趋同）"
```

---

### Task 2: 重建 dist + 自检 + 推送 main

**Files:**
- Build: `plugins/zhao-wealth/dist`（由 `npm run build` 生成）

- [ ] **Step 1: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-wealth && npm run build`

Expected: 构建成功，无报错。

- [ ] **Step 2: dist 自检——确认新标尺进入产物**

Run: `rg -l "drawdownScaleByType" e:\code\basic\plugins\zhao-wealth\dist\server`

Expected: 命中文件（如 `dist/server/services/scoring-service.js`）。若未命中说明 build 未包含改动，回到 Task 1 检查。

- [ ] **Step 3: 提交 dist 并推送 main**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/dist
git commit -m "build(zhao-wealth): 重建 dist（波动/回撤标尺 0.005）"
git push origin main
```

Expected: 推送成功。

---

### Task 3: 部署 joho + 重算评分快照 + 数据验证

**Files:**
- 部署目标：joho（39.97.54.5，SSH 别名 `joho`，Strapi 在 `/www/apps/strapi`）
- 触发接口：`POST /api/wealth/scores/recalculate`（admin 路由，需 jwt）

- [ ] **Step 1: 部署拉取 + 重启**

Run（本机 PowerShell）：

```powershell
ssh joho "cd /www/apps/strapi && git pull origin main && export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:\$PATH && export PM2_HOME=/home/admin/.pm2 && pm2 restart strapi"
```

Expected: `git pull` 拉到 2 个新 commit（config+service、dist）；pm2 restart 成功。

- [ ] **Step 2: 获取 admin jwt**

Run（本机 PowerShell，base64 传输避免引号剥离）：

```powershell
$cmd = @'
curl -s -X POST http://127.0.0.1:1337/api/zhao-auth/admin/auth/local -H "Content-Type: application/json" -d '{"identifier":"admin","password":"Admin@12345"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('jwt',''))"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 输出 jwt 字符串（保存备用）。

- [ ] **Step 3: 触发评分重算**

Run（用上一步 jwt 替换 `$JWT`）：

```powershell
$cmd = @'
JWT=PASTE_JWT_HERE
curl -s -X POST http://127.0.0.1:1337/api/wealth/scores/recalculate -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"period":"m1"}'
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected: 返回 `{"total":7,"success":7,"failed":0}`（7 个上架产品全部重算，snapshotDate=今天）。

- [ ] **Step 4: 数据验证——核对产品 4/6 新评分**

Run：

```powershell
$cmd = @'
export PGPASSWORD=Joho@963963
PSQL="docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c"
$PSQL "SELECT l.wealth_product_id AS pid,s.snapshot_date,s.period,s.composite_score,s.return_score,s.volatility_score,s.drawdown_score,s.weight_profile FROM wealth_score_snapshots s JOIN wealth_score_snapshots_product_lnk l ON l.wealth_score_snapshot_id=s.id WHERE l.wealth_product_id IN (4,6) ORDER BY l.wealth_product_id,s.snapshot_date DESC LIMIT 4;"
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
ssh joho "echo $b64 | base64 -d | bash"
```

Expected:
- 产品 4：composite **74**（return 64 / volatility ~71 / drawdown ~96，weight_profile=bank-wealth）
- 产品 6：composite **78**（return 74 / volatility ~83 / drawdown 100，weight_profile=bank-wealth:daily-open）

若与复算有 ±1 差异（round 边界）属正常，偏差 >2 需回查。

- [ ] **Step 5: C 端走查**

微信浏览器打开 `https://v.joho.cn/wealth/#/pages/detail/index?id=4` 与 `?id=6`：
- 产品 4 综合分显示 74、产品 6 显示 78（不再是两个 81）
- 星级、维度分与快照一致

Expected: 展示正确即完成，任务收尾。

---

## Self-Review

**Spec coverage:**
- 4.1 标尺调整（volatility 0.005 + drawdownScaleByType）→ Task 1 Step 5-6 ✓
- 4.2 代码改动（absoluteDrawdownScore 参数化）→ Task 1 Step 6 ✓
- 4.3 测试更新 → Task 1 Step 1-3 ✓
- 6 验证方案（测试/自检/部署/重算/走查）→ Task 2-3 ✓
- 风险与回退（配置改回 + 重算）→ 无任务，属运维操作，注释说明即可 ✓

**Placeholder scan:** 无 TDD/TODO；唯一占位是 Step 3 的 `PASTE_JWT_HERE`（运行期由上一步输出填充，属正常流程）。

**Type consistency:** `absoluteDrawdownScore(maxDrawdown, productType?)` 在定义与调用处签名一致；`drawdownScaleByType` 在 config、service 默认值、取用处命名一致。
