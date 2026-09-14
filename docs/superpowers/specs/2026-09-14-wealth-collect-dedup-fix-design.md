# 净值采集去重与反馈修复设计

日期：2026-09-14
状态：已确认

## 背景与问题

用户报告幸福99（产品3，杭银理财 JQB2673J）采集净值"失败"、监察页重新采集按钮与采集中心手动批量采集均失败。线上排查结论：

1. **触发失败/报错**：SSO 登录会话过期，接口返回 401（日志 16:15、16:29），重新登录后恢复正常（19:54+ 全部 200）。属会话机制，非代码缺陷，不修复。
2. **成功但净值没变（假成功）**：三个产品数据源均未发布新净值——hzbank 幸福99 最新 09-13、cbhb 最新 09-11、中国理财网最新 09-10。采集到的日期数据库已存在，去重后 0 保存，但前端统一显示"成功"，用户感知为失败。
3. **去重条件不足**：`collect-job.ts` 仅按 `navDate` 判重。若数据源更正某日净值（数值变化），因日期已存在而被跳过，净值修正永远无法生效。

## 目标

- 去重改为「日期+净值」双重判断：同日期同净值跳过、同日期不同净值更新、新日期插入
- 前端展示真实采集结果（新增/更新条数），0 新增时明确提示数据源未更新
- 净值被更新后，同日期年化快照与风险指标随之重算，保证指标与净值一致

## 后端设计（zhao-wealth 插件）

### 1. collect-job.ts 去重改造（collect-single）

```ts
let insertCount = 0;
let updateCount = 0;
const updatedDates: string[] = [];

for (const nav of navData) {
  const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
    where: { product: productId, navDate: nav.navDate },
  });

  if (!existing) {
    await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({ data: { product: productId, ...nav } });
    insertCount++;
  } else if (Number(existing.unitNav) !== Number(nav.unitNav)) {
    await strapi.db.query('plugin::zhao-wealth.wealth-nav').update({
      where: { id: existing.id },
      data: { unitNav: nav.unitNav, accNav: nav.accNav ?? existing.accNav, dataSource: nav.dataSource ?? existing.dataSource },
    });
    updateCount++;
    updatedDates.push(nav.navDate);
  }
  // 同日期同净值 → 跳过
}
```

- 净值比较统一 `Number()` 转换（PG numeric 返回字符串）
- 更新时仅覆盖净值相关字段，保留原记录的创建信息

### 2. 净值更新后的指标联动

净值被更新（updateCount > 0）时，该日期的年化快照与风险指标基于旧净值，必须重算：

```ts
if (updateCount > 0) {
  for (const dateStr of updatedDates) {
    await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').delete({
      where: { product: productId, snapshotDate: dateStr },
    });
    await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').delete({
      where: { product: productId, snapshotDate: dateStr },
    });
  }
}
```

- 删除后触发既有补缺 job（recalculate-product / recalculate-risk-metric-product），补缺算法会按"有净值但无快照/指标"重算该日期
- 只删被更新日期的快照，不影响其他日期（rankPercentile 按日比较，样本独立）

### 3. 采集摘要字段（wealth-collect-config）

schema.json 新增两个整型字段：

```json
"lastInsertCount": { "type": "integer", "default": 0 },
"lastUpdateCount": { "type": "integer", "default": 0 }
```

- collect-single 成功分支写入：`lastInsertCount: insertCount, lastUpdateCount: updateCount, lastCollectTime: new Date()`
- 成功分支同时清理 `failReason`（当前残留旧失败原因，如产品1 的"采集返回空数据"）
- Strapi 重启自动 ALTER TABLE（与 collectStatus 加 running 同机制），无手工迁移

### 4. 测试（TDD）

新增 collect-job 去重逻辑单元测试：
- 新日期 → create，insertCount+1
- 同日期同净值 → 跳过
- 同日期不同净值 → update，updateCount+1，且删除同日期快照/指标

## 前端设计（web 仓库）

### 1. 监察页 monitor/index.vue

`doCollect` 成功后调用 `loadMonitor()` 刷新列表，使净值日期/状态立即更新。

### 2. 采集中心 collect/index.vue

`refreshBatchResult('collect')` 改造：
- 从 configs 汇总 `lastInsertCount` 总和与 `lastUpdateCount` 总和
- 展示"新增 X 条 / 更新 Y 条"
- 两者全为 0 时提示"数据源暂无新净值（最新 YYYY-MM-DD）"（从 monitor.list 取各产品最新净值日期）

## 不改动项

- SSO 登录会话过期（重新登录即可）
- 采集调度、年化/风险补缺算法本身
- 数据源侧无新净值属银行发布节奏，非系统问题

## 风险与兼容性

- 加字段需重启 Strapi（自动迁移，秒级中断），部署窗口内管理端短暂不可用
- 净值更新触发指标删除后，若补缺 job 失败，该日期指标缺失（监察页会显示未同步 → 预警），可再点"风险重算"恢复，属可自愈
- 更新逻辑只覆盖净值字段，accNav 缺省时保留原值，避免误清空

## 验收标准

1. 采集中心批量采集后展示真实"新增/更新"条数；0 新增时提示数据源未更新
2. 手工改库模拟某日净值变化，再采集 → 该日净值被更新，年化/风险指标按新净值重算
3. 监察页重新采集后列表自动刷新
4. 全量测试通过（既有 holding-service/controllers 失败除外）
