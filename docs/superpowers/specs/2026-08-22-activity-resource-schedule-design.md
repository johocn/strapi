# 活动资源/讲师排期 设计文档

> 决策：讲师 + 场地 双维度；新建/改期检测冲突并拒绝 + 返回替代建议；活动内嵌排期；忙闲 = startTime~endTime ± 资源缓冲；运营端做档期视图 + 冲突对照；讲师/场地为独立资源主档，软删除（`disabled` 停用），历史活动关联保留。

## 目标

线上预约排期时，讲师与场地不冲突。运营端能管理讲师/场地主档、查看各自档期、在新建/改期活动时得到冲突对照与替代时段。

## 架构

新增两个资源内容类型 `lecturer`、`venue`（zhao-point 插件）。活动通过 `lecturer`/`venue` 关联引用资源，忙闲区间由活动 `startTime~endTime` 前后各加资源缓冲得到。新增 `resource-schedule` service 统一承担冲突检测与替代建议，被活动保存与运营端 API 复用。

**单向依赖**：`resource-schedule` 依赖 activity、lecturer、venue；activity 保存时调用 `resource-schedule` 校验，不产生反向耦合。

## 技术栈

Strapi v5、PostgreSQL、uni-app/H5 运营端（web 仓库）、现有 zhao-point 插件模式。

---

## 1. 内容类型

### lecturer（讲师）
- `name` string required
- `desc` text
- `defaultBufferMin` integer default 30
- `disabled` boolean default false（软删除停用）
- activity 反查：`activities` oneToMany

### venue（场地）
- `name` string required
- `desc` text
- `defaultBufferMin` integer default 15
- `lat` / `lng` float
- `disabled` boolean default false
- activity 反查：`activities` oneToMany

### activity（活动）— 修改
- 新增 `lecturer` manyToOne → lecturer
- 新增 `venue` manyToOne → venue
- 保留既有 `startTime` / `endTime`
- 保留字符串 `venueName`（兼容历史数据，可作为显示回退，不参与冲突检测）

> 说明：资源缓冲取「资源主档 defaultBufferMin」，不额外在活动上配置，避免参数爆炸。

## 2. 忙闲区间与冲突判定

忙闲区间（占用窗）：
```
window = [startTime - buffer, endTime + buffer]  (buffer = 资源.defaultBufferMin)
```
冲突判定 = 同资源（讲师或场地）另一个活动已占用，且存在区间重叠（`a.start < b.end` 且 `a.end > b.start`），且排除活动自身。

**事务并发安全**：沿用项目「红包」原子写模式——在事务内查询重叠占用、校验为空后写入活动关联，不引入 Redis 锁。对建立关联的活动更新，由事务隔离保证校验-写入原子性。

## 3. 冲突处理

新建活动 / 改期（改 startTime/endTime 或换资源）时，对每个选中的资源执行检测：

1. 有冲突 → 校验失败，返回 `conflicts` 数组：
   ```
   [{ resourceType: 'lecturer'|'venue', resourceId, resourceName,
      conflictStart, conflictEnd, conflictActivityId, conflictActivityTitle, usedWindow }]
   ```
2. 无冲突 → 通过。

**替代建议**：校验失败时，对每个冲突资源，基于冲突活动占用窗返回前后最近 N 个空闲时段（建议 startTime，配 endTime=buffer 默认时长），供运营端快速换选。

## 4. 运营端（web 仓库）能力

- **讲师管理**：列表/新建/编辑/停用（disabled）；停用讲师在活动选择中置灰但仍可回显历史。
- **场地管理**：列表/新建/编辑/停用，含 lat/lng。
- **档期视图**：按讲师或场地查看其未来占用列表（未停用活动），展示 start/end、关联活动标题。
- **活动编辑冲突对照**：保存活动时若冲突，展示"为什么不选"——列出冲突资源、冲突时段、冲突活动，并给出替代时段建议，用户改选后重提。

## 5. 接口契约（zhao-point 插件）

- Admin 权益（沿用现有 admin 权限模式）：
  - CRUD `/admin/adm/lecturers`、`/admin/adm/venues`
  - 档期：`GET /admin/adm/schedules?resourceType=lecturer|venue&resourceId=&from=&to=`
- 冲突检测（活动保存时由 service 内部触发；运营端保存活动接口若冲突返回 400 + `conflicts` + `suggestions`）

## 6. 错误处理

- 冲突 → 400，body 带 `conflicts` 与 `suggestions`。
- 资源已停用但活动仍引用 → 允许展示与改期（仅禁新选），编辑活动不报错。
- 资源不存在 → 400。

## 7. 测试（端到端验收脚本 `accept-activity-resource.cjs`）

1. 创建讲师甲、场地乙（默认缓冲）。
2. 活动 A 绑定甲/乙，start~end 固定。
3. 新建活动 B 绑甲，时段与 A 重叠 → 409/400，返回 conflicts 含甲与 A、时段正确。
4. 新建活动 B 时段避开 → 成功。
5. 改期活动 B 到重叠时段 → 冲突；改期到空闲时段 → 成功。
6. 档期视图按甲返回占用含 A。
7. 场地维度同样验证（乙）。
8. 停用讲师甲 → 档期仍显示历史 A，新活动不可选甲。
9. 清理零残留。

## 边界 / 未纳入

- 仅校验活动自身占用，不引入非活动档期（内训/会议）。
- 不做月/周/日日历可视化，仅列表档期视图（后续可扩展）。
- 资源不参与活动报名、积分、评价链路。
- `venueName` 保留为新字段的展示回退，不迁移历史数据。