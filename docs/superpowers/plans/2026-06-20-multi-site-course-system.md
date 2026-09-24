# 多站点课程系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在同一 Strapi 实例上支持两个子域名的课程系统，按域名隔离站点配置和课程数据

**Architecture:** 站点识别中间件根据请求 Host 头查 site-config 表，注入 ctx.state.siteId/siteChannelId；site-config 从单例改为多实例新增 domain+channel 字段；课程数据通过已有 channelScope 机制隔离

**Tech Stack:** Strapi 5, Koa middleware, PostgreSQL, Nginx

---

### Task 1: site-config schema 新增 domain + channel 字段

**Files:**
- Modify: `e:/code/basic/plugins/zhao-common/server/src/content-types/site-config/schema.json`

- [ ] **Step 1: 在 schema.json 中新增 domain 和 channel 字段**

在 `attributes` 中 `extraConfig` 之前添加：

```json
"domain": {
  "type": "string",
  "maxLength": 255
},
"channel": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-channel.channel"
},
```

- [ ] **Step 2: Build zhao-common**

Run: `cd e:\code\basic\plugins\zhao-common && npm run build`

- [ ] **Step 3: 重启 Strapi 让 schema 同步到数据库**

Run: `cd e:\code\basic && npx strapi develop`

确认启动日志无 schema 相关错误。

- [ ] **Step 4: 给现有 site-config 记录补充 domain 字段**

通过 SQL 或 Strapi Admin 将现有记录的 `domain` 设为当前域名（如 `localhost`）。

- [ ] **Step 5: Commit**

```bash
git add basic/plugins/zhao-common/server/src/content-types/site-config/schema.json
git commit -m "feat: add domain and channel fields to site-config schema"
```

---

### Task 2: 创建站点识别中间件

**Files:**
- Create: `e:/code/basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts`

- [ ] **Step 1: 编写 site-resolver 中间件**

```typescript
import type { Core } from "@strapi/strapi";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

/**
 * 站点识别中间件
 * 根据请求 Host 头查询 site-config，注入 ctx.state.siteId / siteChannelId
 */
const siteResolver: Core.MiddlewareFactory = (config, { strapi }) => {
  return async (ctx, next) => {
    const host = ctx.request.header.host?.replace(/:\d+$/, "") || "";

    try {
      const records = await strapi.documents(SITE_CONFIG_UID).findMany({
        filters: { domain: host },
        populate: ["channel"],
      });

      if (Array.isArray(records) && records.length > 0) {
        const site = records[0];
        ctx.state.siteId = site.documentId;
        ctx.state.siteChannelId = (site as any).channel?.id || null;
      } else {
        // 未匹配域名：使用第一条记录作为默认站点
        const allRecords = await strapi.documents(SITE_CONFIG_UID).findMany({
          populate: ["channel"],
        });
        if (Array.isArray(allRecords) && allRecords.length > 0) {
          const site = allRecords[0];
          ctx.state.siteId = site.documentId;
          ctx.state.siteChannelId = (site as any).channel?.id || null;
        }
      }
    } catch {
      // site-config 不可用时静默跳过
    }

    await next();
  };
};

export default siteResolver;
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts
git commit -m "feat: add site-resolver middleware for multi-site domain routing"
```

---

### Task 3: 注册站点识别中间件

**Files:**
- Modify: `e:/code/basic/plugins/zhao-common/server/src/bootstrap.ts`

- [ ] **Step 1: 在 bootstrap.ts 中注册中间件**

在 `const bootstrap = async ({ strapi }) => {` 开头、站点配置初始化之前添加：

```typescript
  // 注册站点识别中间件（在认证之前）
  strapi.server.use(async (ctx: any, next: any) => {
    const host = ctx.request.header.host?.replace(/:\d+$/, "") || "";
    try {
      const records = await strapi.documents(SITE_CONFIG_UID).findMany({
        filters: { domain: host },
        populate: ["channel"],
      });
      if (Array.isArray(records) && records.length > 0) {
        const site = records[0];
        ctx.state.siteId = site.documentId;
        ctx.state.siteChannelId = (site as any).channel?.id || null;
      } else {
        const allRecords = await strapi.documents(SITE_CONFIG_UID).findMany({
          populate: ["channel"],
        });
        if (Array.isArray(allRecords) && allRecords.length > 0) {
          const site = allRecords[0];
          ctx.state.siteId = site.documentId;
          ctx.state.siteChannelId = (site as any).channel?.id || null;
        }
      }
    } catch {
      // 静默跳过
    }
    await next();
  });
```

- [ ] **Step 2: Build + 重启验证**

Run: `cd e:\code\basic\plugins\zhao-common && npm run build`

重启 Strapi，确认启动无错误。

- [ ] **Step 3: Commit**

```bash
git add basic/plugins/zhao-common/server/src/bootstrap.ts
git commit -m "feat: register site-resolver middleware in bootstrap"
```

---

### Task 4: site-config service 支持按 siteId 查询

**Files:**
- Modify: `e:/code/basic/plugins/zhao-common/server/src/services/site-config.ts`

- [ ] **Step 1: 改造 getConfig 和 getPublicConfig 支持 siteId 参数**

将 `site-config.ts` 改为：

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-common.site-config";

const DEFAULT_CONFIG = {
  siteName: "",
  siteDescription: "",
  seoKeywords: "",
  seoDescription: "",
  tencentMapKey: "",
  shareTitle: "",
  shareDescription: "",
  customerServiceUrl: "",
  icpNumber: "",
  domain: "",
  extraConfig: null,
};

const PUBLIC_FIELDS = [
  "siteName", "siteDescription", "seoKeywords", "seoDescription",
  "tencentMapKey", "shareTitle", "shareDescription", "icpNumber",
  "customerServiceUrl", "domain",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取站点配置，支持按 documentId 查询
   */
  async getConfig(siteId?: string) {
    if (siteId) {
      const record = await strapi.documents(UID).findOne({ documentId: siteId, populate: "*" });
      if (record) return record;
    }
    // 兜底：返回第一条
    const records = await strapi.documents(UID).findMany({ populate: "*" });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return { ...DEFAULT_CONFIG };
  },

  /**
   * 按 domain 查询站点配置
   */
  async getConfigByDomain(domain: string) {
    const records = await strapi.documents(UID).findMany({
      filters: { domain },
      populate: "*",
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    return null;
  },

  /**
   * 更新站点配置
   */
  async updateConfig(documentId: string, data: any) {
    return strapi.documents(UID).update({ documentId, data });
  },

  /**
   * 创建站点配置
   */
  async createConfig(data: any) {
    return strapi.documents(UID).create({ data });
  },

  /**
   * 获取公开配置（不含敏感字段）
   */
  async getPublicConfig(siteId?: string) {
    const config: any = await this.getConfig(siteId);
    const result: any = {};
    for (const key of PUBLIC_FIELDS) {
      result[key] = config[key] ?? DEFAULT_CONFIG[key];
    }
    if (config.logo) result.logo = config.logo;
    if (config.favicon) result.favicon = config.favicon;
    if (config.shareImage) result.shareImage = config.shareImage;
    return result;
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add basic/plugins/zhao-common/server/src/services/site-config.ts
git commit -m "feat: site-config service supports siteId and domain lookup"
```

---

### Task 5: config service + controller 按站点返回配置

**Files:**
- Modify: `e:/code/basic/plugins/zhao-common/server/src/services/config.ts`
- Modify: `e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts`

- [ ] **Step 1: 改造 config service 的 getSiteConfig / getPublicConfig**

在 `config.ts` service 中，修改 `getSiteConfig` 和 `getPublicConfig` 方法接受 `siteId` 参数：

```typescript
  async getSiteConfig(siteId?: string) {
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getConfig === "function") {
        return await service.getConfig(siteId);
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] getSiteConfig failed:", (error as Error).message);
      return null;
    }
  },

  async updateSiteConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.updateConfig === "function") {
        // data 中包含 documentId 时按 ID 更新，否则走旧逻辑
        if (data.documentId) {
          const { documentId, ...updateData } = data;
          return await service.updateConfig(documentId, updateData);
        }
        // 兼容旧逻辑：更新第一条
        const current = await service.getConfig();
        if (current?.documentId) {
          return await service.updateConfig(current.documentId, data);
        }
        return await service.createConfig(data);
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] updateSiteConfig failed:", (error as Error).message);
      return null;
    }
  },
```

修改 `getPublicConfig`：

```typescript
  async getPublicConfig(siteId?: string) {
    const result: Record<string, any> = {};

    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getPublicConfig === "function") {
        result.site = await service.getPublicConfig(siteId);
      }
    } catch (error) {
      strapi.log.warn("[config] getPublicConfig site failed:", (error as Error).message);
    }

    try {
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      if (siteConfigService) {
        const fullConfig: any = await siteConfigService.getConfig(siteId);
        const ec = fullConfig?.extraConfig || {};

        result.auth = {
          mode: ec.authMode || "local",
          methods: ["password", "sms"],
          wechatEnabled: ec.thirdPartyEnabled ?? ec.wechatMiniProgramEnabled ?? false,
          thirdPartyEnabled: ec.thirdPartyEnabled ?? false,
          ssoEnabled: ec.ssoEnabled ?? false,
          ssoLoginUrl: ec.ssoLoginUrl || null,
          registerEnabled: ec.registerEnabled ?? true,
          inviteCodeRequired: ec.inviteCodeRequired ?? false,
        };

        result.featureFlags = {
          pointsEnabled: ec.pointsEnabled ?? true,
          coursePreviewEnabled: ec.coursePreviewEnabled ?? true,
          lessonProgressEnabled: ec.lessonProgressEnabled ?? true,
          courseEnrollEnabled: ec.courseEnrollEnabled ?? true,
          channelInviteEnabled: ec.channelInviteEnabled ?? true,
          allowCrossChannel: ec.allowCrossChannel ?? false,
          redemptionEnabled: ec.redemptionEnabled ?? false,
          courseCommentEnabled: ec.courseCommentEnabled ?? false,
          courseRatingEnabled: ec.courseRatingEnabled ?? false,
          paymentEnabled: ec.paymentEnabled ?? false,
          smsEnabled: ec.smsEnabled ?? false,
          emailEnabled: ec.emailEnabled ?? false,
          captchaEnabled: ec.captchaEnabled ?? false,
          rateLimitEnabled: ec.rateLimitEnabled ?? true,
          maintenanceMode: ec.maintenanceMode ?? false,
          debugMode: ec.debugMode ?? false,
        };

        result.points = {
          moduleEnabled: ec.pointsEnabled ?? true,
          earnEnabled: true,
          redeemEnabled: ec.redemptionEnabled ?? false,
          signInEnabled: true,
          tasksEnabled: true,
          signInPoints: ec.signInPoints ?? 10,
          maxPointsPerDay: ec.maxPointsPerDay ?? 100,
        };
      }
    } catch (error) {
      strapi.log.warn("[config] getPublicConfig extraConfig failed:", (error as Error).message);
    }

    return result;
  },
```

- [ ] **Step 2: 改造 config controller 从 ctx.state.siteId 取值**

在 `config.ts` controller 中，修改 `getSite`、`getPublic`、`updateSite` 方法：

`getSite` — 传入 siteId：
```typescript
  async getSite(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      const service = strapi.plugin("zhao-common").service("config");
      const siteConfig: any = await service.getSiteConfig(siteId) || {};
      // ... 其余不变
```

`updateSite` — 传入 siteId：
```typescript
  async updateSite(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      // ... 拆分逻辑不变 ...
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const currentConfig: any = await siteConfigService.getConfig(siteId);
      const mergedExtra = { ...(currentConfig?.extraConfig || {}), ...extraData };
      const data = await service.updateSiteConfig({
        documentId: siteId,
        ...siteData,
        extraConfig: mergedExtra,
      });
      ctx.body = { data };
    } catch (error: any) { ... }
  },
```

`getPublic` — 传入 siteId：
```typescript
  async getPublic(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getPublicConfig(siteId);
      ctx.body = { data };
    } catch (error: any) { ... }
  },
```

- [ ] **Step 3: Build + 重启验证**

Run: `cd e:\code\basic\plugins\zhao-common && npm run build`

- [ ] **Step 4: Commit**

```bash
git add basic/plugins/zhao-common/server/src/services/config.ts basic/plugins/zhao-common/server/src/controllers/config.ts
git commit -m "feat: config service and controller support multi-site by siteId"
```

---

### Task 6: third-party-config 按站点隔离

**Files:**
- Modify: `e:/code/plugins/zhao-third/server/src/content-types/third-party-config/schema.json`

- [ ] **Step 1: 在 third-party-config schema 新增 site 字段**

在 `attributes` 中添加：

```json
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config"
},
```

- [ ] **Step 2: 修改 third-party-config controller 查询时按 siteId 过滤**

在 `e:/code/plugins/zhao-third/server/src/controllers/third-party-config.ts` 的 `find` 方法中：

```typescript
  async find(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      const filters: any = {};
      if (siteId) {
        filters.site = { documentId: siteId };
      }
      const entries = await strapi.documents("plugin::zhao-third.third-party-config").findMany({
        filters,
        populate: "*",
      });
      ctx.body = entries;
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: err.message }; return;
    }
  },
```

- [ ] **Step 3: Build zhao-third**

Run: `cd e:\code\plugins\zhao-third && npm run build`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-third/server/src/content-types/third-party-config/schema.json plugins/zhao-third/server/src/controllers/third-party-config.ts
git commit -m "feat: third-party-config supports site isolation"
```

---

### Task 7: 课程公开查询按站点 channel 过滤

**Files:**
- Modify: `e:/code/basic/plugins/zhao-course/server/src/services/course.ts` (find 方法)

- [ ] **Step 1: 在课程公开 find 方法中注入 siteChannelId 过滤**

找到课程公开查询的 `find` 方法，在 filters 构建处增加站点 channel 过滤：

```typescript
  // 在构建 filters 的位置添加
  const siteChannelId = ctx?.state?.siteChannelId;
  if (siteChannelId) {
    filters.channelScope = "specific";
    filters.channelIds = { $contains: siteChannelId };
  }
```

注意：具体实现取决于课程 service 的 find 方法签名。如果 find 方法没有 ctx 参数，需要在 controller 层传入。

- [ ] **Step 2: Build zhao-course**

Run: `cd e:\code\basic\plugins\zhao-course && npm run build`

- [ ] **Step 3: Commit**

```bash
git add basic/plugins/zhao-course/server/src/
git commit -m "feat: course public query filters by site channel"
```

---

### Task 8: 数据初始化 + 验证

**Files:** 无代码文件，纯数据操作

- [ ] **Step 1: 创建两个 root channel**

通过 Strapi Admin 或 API：
- 站点A channel: name="站点A", code="site-a", channelTier="root"
- 站点B channel: name="站点B", code="site-b", channelTier="root"

- [ ] **Step 2: 给现有 site-config 记录设置 domain**

将现有记录的 domain 设为 `localhost`（开发环境默认站点）

- [ ] **Step 3: 创建第二个 site-config 记录**

domain 设为第二个子域名，channel 关联到 site-b channel，extraConfig 按需配置

- [ ] **Step 4: 验证中间件注入**

用 curl 测试：
```bash
# 默认站点（localhost）
curl -H "Host: localhost" http://localhost:1337/api/zhao-common/v1/public/config

# 第二站点
curl -H "Host: b.example.com" http://localhost:1337/api/zhao-common/v1/public/config
```

确认返回不同的站点配置。

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: multi-site data initialization"
```

---

### Task 9: Nginx 配置

**Files:**
- Create: `e:/code/deploy/nginx/multi-site.conf`

- [ ] **Step 1: 编写 Nginx 配置文件**

```nginx
server {
    listen 80;
    server_name a.example.com b.example.com;

    # Strapi API
    location /api/ {
        proxy_pass http://127.0.0.1:1337/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Strapi Admin 后台
    location /admin/ {
        proxy_pass http://127.0.0.1:1337/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # C端前端 (shao)
    location / {
        root /var/www/shao;
        try_files $uri $uri/ /index.html;
    }

    # 后台管理前端 (web)
    location /manage/ {
        alias /var/www/web/;
        try_files $uri $uri/ /manage/index.html;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/nginx/multi-site.conf
git commit -m "feat: add nginx multi-site configuration"
```

---

### Task 10: 前端 BASE_URL 改为动态

**Files:**
- Modify: `e:/code/shao/services/api.ts` (BASE_URL)
- Modify: `e:/code/web/src/utils/request.js` (BASE_API)

- [ ] **Step 1: shao 的 BASE_URL 改为相对路径**

将 `const BASE_URL = 'http://localhost:1337/api'` 改为：

```typescript
const BASE_URL = '/api'
```

这样前端请求会自动使用当前域名，Nginx 反代到 Strapi。

- [ ] **Step 2: web 的 BASE_API 改为相对路径**

将 `BASE_API = 'http://localhost:1337/api'` 改为：

```javascript
const BASE_API = '/api'
```

将 `ADMIN_BASE_URL = 'http://localhost:1337'` 改为：

```javascript
const ADMIN_BASE_URL = ''
```

- [ ] **Step 3: Commit**

```bash
git add shao/services/api.ts web/src/utils/request.js web/src/config/env.js
git commit -m "feat: frontend BASE_URL uses relative path for multi-site support"
```
