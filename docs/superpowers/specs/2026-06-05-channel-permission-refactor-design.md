# zhao-auth 渠道权限体系重构设计

> 日期：2026-06-05
> 状态：已批准

## 1. 目标

将当前割裂的权限策略体系统一为 Strapi v5 规范的 policies 机制，实现功能权限 × 渠道范围的正交控制，支持各插件资源按渠道隔离数据。

## 2. 核心决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 数据隔离粒度 | 混合模式 | 核心资源绑渠道，辅助资源全局共享 |
| 资源渠道绑定 | channelScope(all/specific) + channelIds 数组 | 支持全渠道可见和指定渠道两种模式 |
| 分销下级范围 | 全链路下级（path 前缀查询） | 支持多级分销统计 |
| 架构方案 | 服务层注入 | 路由层管功能权限，服务层管渠道范围 |
| JWT 方案 | 保持自定义 JWT + auth: false | 多角色数组 Strapi 原生不支持 |
| 策略机制 | 适配 Strapi 原生 policies 签名 | 合规，可维护 |

## 3. 分层架构

```
请求 → is-authenticated → has-permission(action) → has-channel-scope
         认证检查          功能权限检查              渠道范围注入
         ↓                 ↓                        ↓
       user对象          pass/fail              ctx.state.channelScope
```

- 路由层：认证 + 功能权限（Strapi 原生 policies）
- 控制器层：调用 ChannelScopeService 获取渠道范围
- 服务层：各插件根据 channelScope 过滤查询

## 4. 统一策略命名规范

命名规则：`{动作}-{领域}-{限定}`

| 策略名 | 职责 | 参数 | 阻断性 |
|--------|------|------|--------|
| `is-authenticated` | 认证检查 | 无 | 是 |
| `has-permission` | 功能权限 | `action: string` | 是 |
| `has-channel-access` | 特定渠道访问权 | channelId 或从请求提取 | 是 |
| `has-channel-scope` | 解析渠道范围注入 ctx | 无 | 否 |

### 4.1 删除的旧策略

- `has-channel-access-advanced` → 被 `has-permission` + `has-channel-scope` 替代
- `is-channel-admin` → 被 `has-permission(action: "channel.update")` 替代
- `is-channel-owner` → 被 `has-permission(action: "channel.delete")` 替代
- `has-course-permission` → 被 `has-permission(action: "xxx")` 替代
- `has-point-permission` → 同上
- `has-quiz-permission` → 同上
- `has-channel-permission` → 同上
- bootstrap.ts 动态注册逻辑 → 删除

### 4.2 删除的中间件

- `channel-auth`（zhao-channel）→ 被 Strapi 原生 policies 替代
- `authorize`（zhao-auth）→ 同上

## 5. 策略适配层

将自定义 PolicyHandler 适配为 Strapi 原生 PolicyHandler 签名：

```typescript
// zhao-auth/server/src/policies/adapter.ts
const adaptPolicy = (customHandler: PolicyHandler) => {
  return async (policyContext: any, config: any, { strapi }: { strapi: Core.Strapi }) => {
    const authContext = {
      user: policyContext.state.user,
      params: policyContext.params,
      body: policyContext.request?.body,
      query: policyContext.query,
      headers: policyContext.headers,
      method: policyContext.method,
      path: policyContext.path,
    };
    const result = await customHandler(authContext, config);
    if (!result.passed) {
      if (result.code === "UNAUTHENTICATED") {
        policyContext.unauthorized(result.message);
      } else {
        policyContext.forbidden(result.message);
      }
    }
  };
};
```

## 6. ChannelScope 接口

```typescript
interface ChannelScope {
  all: boolean;        // true=全渠道可见（admin）
  channelIds: number[]; // 具体可见渠道ID集合
}
```

## 7. ChannelScopeService（新增，位于 zhao-auth）

```typescript
// zhao-auth/server/src/services/channel-scope.service.ts
export default ({ strapi }) => ({
  async resolve(user): Promise<ChannelScope> {
    // admin → 全渠道
    if (user.roles.includes('admin')) {
      return { all: true, channelIds: [] };
    }

    // 复用 zhao-channel 的 channel-permission.getUserAllChannels
    const channelPermService = strapi.plugin("zhao-channel").service("channel-permission");
    const channelIds = await channelPermService.getUserAllChannels(user.id);

    return { all: false, channelIds };
  }
});
```

关键：复用 zhao-channel 已有的 `getUserAllChannels`（含 user-channel + role-channel + channel-member + path 下级扩展 + Redis 缓存）。

## 8. has-channel-scope 策略

```typescript
// 非阻断策略，仅注入 channelScope
async (context, config) => {
  const channelScopeService = strapi.plugin("zhao-auth").service("channel-scope");
  const scope = await channelScopeService.resolve(context.user);
  context.channelScope = scope;
  return { passed: true };
}
```

## 9. has-permission 策略

统一入口，复用现有 permission.service.ts：

```typescript
async (context, config) => {
  const action = config.action;
  const permissionService = strapi.plugin("zhao-auth").service("permission");
  const result = await permissionService.getMyPermissions(context.user.id);
  // admin 直接放行
  // 查数据库 permission 记录
  // 回退权限树常量
};
```

## 10. 路由配置规范

```typescript
// 标准管理端路由
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

// 需要渠道范围的路由
const channelScopeRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
    ],
  },
});

// 需要特定渠道访问权的路由
const channelAccessRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-access",
    ],
  },
});
```

## 11. 资源渠道字段变更

### 混合模式字段（课程、题库等可跨渠道共享的资源）

```json
{
  "channelScope": {
    "type": "enumeration",
    "enum": ["all", "specific"],
    "default": "all"
  },
  "channelIds": {
    "type": "json",
    "default": "[]"
  }
}
```

### 单渠道字段（积分记录、兑换记录等归属单一渠道的资源）

```json
{
  "channel": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::zhao-channel.channel"
  }
}
```

### 各 Content-Type 渠道字段规划

| 插件 | Content-Type | 渠道字段类型 | 说明 |
|------|-------------|------------|------|
| zhao-course | course | 混合 | 课程可跨渠道共享 |
| zhao-course | course-category | 混合 | 分类可跨渠道 |
| zhao-course | course-tag | 无 | 全局共享 |
| zhao-course | user-course-auth | 单渠道 | 授权归属渠道 |
| zhao-quiz | quiz | 混合 | 题目可跨渠道 |
| zhao-quiz | quiz-exam | 混合 | 考试可跨渠道 |
| zhao-quiz | knowledge-point | 无 | 全局共享 |
| zhao-point | point-rule | 无 | 全局共享 |
| zhao-point | point-record | 单渠道 | 记录归属渠道 |
| zhao-point | point-redemption | 单渠道 | 兑换归属渠道 |
| zhao-common | feature-flag | 无 | 全局共享 |

### 服务层查询过滤

```typescript
// 混合模式过滤
if (!channelScope.all) {
  filters.$or = [
    { channelScope: 'all' },
    { channelIds: { $containsAny: channelScope.channelIds } },
  ];
}

// 单渠道过滤
if (!channelScope.all) {
  filters.channel = { id: { $in: channelScope.channelIds } };
}
```

## 12. 权限树扩展

在 zhao-auth 的 permissions.ts 中补全渠道维度按钮权限：

```typescript
"menu.marketing-center": {
  label: "营销运营",
  type: "menu",
  children: {
    "menu.channel": {
      label: "渠道管理",
      type: "menu",
      children: {
        "channel.create": { label: "创建渠道", type: "button" },
        "channel.read":   { label: "查看渠道", type: "button" },
        "channel.update": { label: "编辑渠道", type: "button" },
        "channel.delete": { label: "删除渠道", type: "button" },
      },
    },
    "menu.members": {
      label: "成员管理",
      type: "menu",
      children: {
        "channel-member.add":    { label: "添加成员", type: "button" },
        "channel-member.remove": { label: "移除成员", type: "button" },
        "channel-member.read":   { label: "查看成员", type: "button" },
      },
    },
    "menu.invite": {
      label: "分销邀请",
      type: "menu",
      children: {
        "user-invite.send":     { label: "发送邀请", type: "button" },
        "user-invite.validate": { label: "验证邀请", type: "button" },
      },
    },
    "menu.network": { label: "渠道网络", type: "menu" },
  },
},
```

各插件的 `permissions.ts` 逐步废弃，权限定义收归 zhao-auth。

## 13. 渠道统计服务

```typescript
// zhao-channel/server/src/services/channel-stats.service.ts
{
  async getCourseStats(channelIds: number[]): Promise<StatsResult>;
  async getPointStats(channelIds: number[]): Promise<StatsResult>;
  async getQuizStats(channelIds: number[]): Promise<StatsResult>;
  async getUserStats(channelIds: number[]): Promise<StatsResult>;
  async getDashboard(channelScope: ChannelScope): Promise<DashboardResult>;
}
```

各插件暴露统计接口，zhao-channel 聚合调用。

## 14. C 端渠道解析

C 端 `has-channel-scope` 行为与管理端不同：
- 管理端：合并 user-channel + role-channel + member + 下级
- C 端：仅取 channel-member(isCurrent=true) 对应渠道

通过策略 config 区分：`{ name: "has-channel-scope", config: { mode: "c-end" } }`

## 15. 前端集成

- 新增 `/my/channel-scope` 获取渠道范围
- 管理端页面增加渠道筛选器组件
- 前端根据 channelScope 决定渠道选择器可选项

## 16. 性能与缓存

- ChannelScopeService 复用 zhao-channel 的 Redis 缓存（getUserAllChannelsCache）
- 缓存失效时机：用户渠道变更 / 角色渠道变更（已有机制）
- has-channel-scope 策略内部不重复计算

## 17. 数据迁移

- 新增渠道字段后默认 `channelScope: "all"`，存量数据不受影响
- 新创建的资源根据用户渠道范围自动填充

## 18. zhao-auth index.ts 修复

添加 `policies` 导出，与 Strapi 插件规范一致：

```typescript
import policies from "./policies";

export default {
  // ... 其他导出
  policies,
};
```

## 19. 实施拆分

按耦合度从低到高、依赖从少到多的顺序：

### 阶段 1：策略体系重构（zhao-auth 核心）

1. 创建策略适配层 `policies/adapter.ts`
2. 重写 `is-authenticated` 适配 Strapi 原生签名
3. 重写 `has-permission` 适配 Strapi 原生签名（复用 permission.service）
4. 重写 `has-channel-access` 适配 Strapi 原生签名
5. 新增 `has-channel-scope` 策略
6. 新增 `ChannelScopeService`
7. zhao-auth index.ts 添加 policies 导出
8. 更新 policies/index.ts 导出所有策略
9. 删除 `authorize` 中间件
10. 删除 bootstrap.ts 动态注册逻辑
11. 更新 zhao-auth 自身路由使用 config.policies

### 阶段 2：zhao-channel 路由迁移

1. 删除 `channel-auth` 中间件
2. 重写 content-api 路由使用 config.policies
3. 更新控制器读取 ctx.state.channelScope
4. 新增 channel-stats.service
5. 清理旧策略注册

### 阶段 3：其他插件路由迁移

1. zhao-course 路由迁移 + content-type 加渠道字段
2. zhao-point 路由迁移 + content-type 加渠道字段
3. zhao-quiz 路由迁移 + content-type 加渠道字段
4. zhao-common 路由迁移
5. 各插件删除自身 permissions.ts（权限收归 zhao-auth）

### 阶段 4：前端适配

1. 新增 /my/channel-scope API
2. 管理端页面增加渠道筛选器
3. 前端权限控制适配新策略

### 阶段 5：数据迁移与验证

1. 存量数据 channelScope 默认 "all"
2. 端到端测试
3. 性能验证
