# 配置页面重构实施计划（第一部分：后端路由统一）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一后端配置路由，将分散在各插件的配置接口统一到zhao-common插件。

**Architecture:** 在zhao-common插件中创建统一的config控制器和服务，代理调用各插件的配置接口，保持现有插件功能不变。

**Tech Stack:** Strapi 5 + TypeScript

---

## 文件结构

### 新建文件
- `E:\code\basic\plugins\zhao-common\server\src\controllers\config.ts` - 统一配置控制器
- `E:\code\basic\plugins\zhao-common\server\src\services\config.ts` - 统一配置服务

### 修改文件
- `E:\code\basic\plugins\zhao-common\server\src\routes\admin.ts` - 统一配置路由
- `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts` - 公开配置路由
- `E:\code\basic\plugins\zhao-common\server\src\controllers\index.ts` - 注册config控制器
- `E:\code\basic\plugins\zhao-common\server\src\services\index.ts` - 注册config服务

---

### Task 1: 创建统一配置服务

**Files:**
- Create: `E:\code\basic\plugins\zhao-common\server\src\services\config.ts`

- [ ] **Step 1: 创建config.ts服务文件**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // 站点配置
  async getSiteConfig() {
    return await strapi.documents("plugin::zhao-common.site-config").findFirst();
  },

  async updateSiteConfig(data: any) {
    const existing = await this.getSiteConfig();
    if (existing) {
      return await strapi.documents("plugin::zhao-common.site-config").update({
        documentId: existing.documentId,
        data,
      });
    }
    return await strapi.documents("plugin::zhao-common.site-config").create({ data });
  },

  // 三方配置（代理zhao-third）
  async getThirdPartyConfigs() {
    try {
      const service = strapi.plugin("zhao-third").service("third-party-config");
      return await service.find();
    } catch {
      return [];
    }
  },

  async getThirdPartyConfig(documentId: string) {
    try {
      const service = strapi.plugin("zhao-third").service("third-party-config");
      return await service.findOne(documentId);
    } catch {
      return null;
    }
  },

  async createThirdPartyConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-third").service("third-party-config");
      return await service.create(data);
    } catch (e: any) {
      throw new Error(`创建三方配置失败: ${e.message}`);
    }
  },

  async updateThirdPartyConfig(documentId: string, data: any) {
    try {
      const service = strapi.plugin("zhao-third").service("third-party-config");
      return await service.update(documentId, data);
    } catch (e: any) {
      throw new Error(`更新三方配置失败: ${e.message}`);
    }
  },

  async deleteThirdPartyConfig(documentId: string) {
    try {
      const service = strapi.plugin("zhao-third").service("third-party-config");
      return await service.delete(documentId);
    } catch (e: any) {
      throw new Error(`删除三方配置失败: ${e.message}`);
    }
  },

  // 积分配置（代理zhao-points）
  async getPointsConfig() {
    try {
      const service = strapi.plugin("zhao-points").service("config");
      return await service.get();
    } catch {
      return null;
    }
  },

  async updatePointsConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-points").service("config");
      return await service.update(data);
    } catch (e: any) {
      throw new Error(`更新积分配置失败: ${e.message}`);
    }
  },

  // OSS配置（代理zhao-oss）
  async getOssConfig() {
    try {
      const service = strapi.plugin("zhao-oss").service("config");
      return await service.get();
    } catch {
      return null;
    }
  },

  async updateOssConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-oss").service("config");
      return await service.update(data);
    } catch (e: any) {
      throw new Error(`更新OSS配置失败: ${e.message}`);
    }
  },

  // SSO应用（代理zhao-sso）
  async getSsoApps() {
    try {
      const service = strapi.plugin("zhao-sso").service("app");
      return await service.find();
    } catch {
      return [];
    }
  },

  async getSsoApp(documentId: string) {
    try {
      const service = strapi.plugin("zhao-sso").service("app");
      return await service.findOne(documentId);
    } catch {
      return null;
    }
  },

  async createSsoApp(data: any) {
    try {
      const service = strapi.plugin("zhao-sso").service("app");
      return await service.create(data);
    } catch (e: any) {
      throw new Error(`创建SSO应用失败: ${e.message}`);
    }
  },

  async updateSsoApp(documentId: string, data: any) {
    try {
      const service = strapi.plugin("zhao-sso").service("app");
      return await service.update(documentId, data);
    } catch (e: any) {
      throw new Error(`更新SSO应用失败: ${e.message}`);
    }
  },

  async deleteSsoApp(documentId: string) {
    try {
      const service = strapi.plugin("zhao-sso").service("app");
      return await service.delete(documentId);
    } catch (e: any) {
      throw new Error(`删除SSO应用失败: ${e.message}`);
    }
  },

  // 功能开关
  async getFeatureFlags() {
    return await strapi.documents("plugin::zhao-common.feature-flag").findMany();
  },

  async getFeatureFlag(documentId: string) {
    return await strapi.documents("plugin::zhao-common.feature-flag").findOne({
      documentId,
    });
  },

  async createFeatureFlag(data: any) {
    return await strapi.documents("plugin::zhao-common.feature-flag").create({ data });
  },

  async updateFeatureFlag(documentId: string, data: any) {
    return await strapi.documents("plugin::zhao-common.feature-flag").update({
      documentId,
      data,
    });
  },

  async deleteFeatureFlag(documentId: string) {
    return await strapi.documents("plugin::zhao-common.feature-flag").delete({
      documentId,
    });
  },

  // 公开配置
  async getPublicConfig() {
    const config = await this.getSiteConfig();
    if (!config) return null;

    // 只返回公开字段
    return {
      siteName: config.siteName,
      siteDescription: config.siteDescription,
      logo: config.logo,
      favicon: config.favicon,
      shareTitle: config.shareTitle,
      shareDescription: config.shareDescription,
      shareImage: config.shareImage,
      sharePath: config.sharePath,
      authMode: config.extraConfig?.authMode || "local",
      thirdPartyEnabled: config.extraConfig?.thirdPartyEnabled || false,
      ssoEnabled: config.extraConfig?.ssoEnabled || false,
      ssoLoginUrl: config.extraConfig?.ssoLoginUrl || null,
      registerEnabled: config.extraConfig?.registerEnabled !== false,
      pointsEnabled: config.extraConfig?.pointsEnabled !== false,
      signInPoints: config.extraConfig?.signInPoints || 10,
      coursePreviewEnabled: config.extraConfig?.coursePreviewEnabled !== false,
    };
  },
});
```

- [ ] **Step 2: 注册config服务**

修改 `E:\code\basic\plugins\zhao-common\server\src\services\index.ts`：

```typescript
import config from "./config";
import siteConfig from "./site-config";
import featureFlag from "./feature-flag";

export default {
  config,
  "site-config": siteConfig,
  "feature-flag": featureFlag,
};
```

---

### Task 2: 创建统一配置控制器

**Files:**
- Create: `E:\code\basic\plugins\zhao-common\server\src\controllers\config.ts`

- [ ] **Step 1: 创建config.ts控制器文件**

```typescript
import type { Core } from "@strapi/strapi";

const wrap = (data: any) => ({ data });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // 站点配置
  async getSite(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const config = await service.getSiteConfig();
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updateSite(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const config = await service.updateSiteConfig(data);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // 三方配置
  async getThird(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const list = await service.getThirdPartyConfigs();
      ctx.body = { data: list };
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async getThirdOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const config = await service.getThirdPartyConfig(documentId);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async createThird(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const config = await service.createThirdPartyConfig(data);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updateThird(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const config = await service.updateThirdPartyConfig(documentId, data);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async deleteThird(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      await service.deleteThirdPartyConfig(documentId);
      ctx.body = wrap({ success: true });
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // 积分配置
  async getPoints(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const config = await service.getPointsConfig();
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updatePoints(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const config = await service.updatePointsConfig(data);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // OSS配置
  async getOss(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const config = await service.getOssConfig();
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updateOss(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const config = await service.updateOssConfig(data);
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // SSO应用
  async getSso(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const list = await service.getSsoApps();
      ctx.body = { data: list };
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async getSsoOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const app = await service.getSsoApp(documentId);
      ctx.body = wrap(app);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async createSso(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const app = await service.createSsoApp(data);
      ctx.body = wrap(app);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updateSso(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const app = await service.updateSsoApp(documentId, data);
      ctx.body = wrap(app);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async deleteSso(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      await service.deleteSsoApp(documentId);
      ctx.body = wrap({ success: true });
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // 功能开关
  async getFlags(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const list = await service.getFeatureFlags();
      ctx.body = { data: list };
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async getFlagOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const flag = await service.getFeatureFlag(documentId);
      ctx.body = wrap(flag);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async createFlag(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const flag = await service.createFeatureFlag(data);
      ctx.body = wrap(flag);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async updateFlag(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = ctx.request.body?.data || ctx.request.body;
      const flag = await service.updateFeatureFlag(documentId, data);
      ctx.body = wrap(flag);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async deleteFlag(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      await service.deleteFeatureFlag(documentId);
      ctx.body = wrap({ success: true });
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  // 公开配置
  async getPublic(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const config = await service.getPublicConfig();
      ctx.body = wrap(config);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 注册config控制器**

修改 `E:\code\basic\plugins\zhao-common\server\src\controllers\index.ts`：

```typescript
import config from "./config";
import siteConfig from "./site-config";
import featureFlag from "./feature-flag";

export default {
  config,
  "site-config": siteConfig,
  "feature-flag": featureFlag,
};
```

---

### Task 3: 创建统一配置路由

**Files:**
- Modify: `E:\code\basic\plugins\zhao-common\server\src\routes\admin.ts`

- [ ] **Step 1: 读取当前admin.ts**

Read: `E:\code\basic\plugins\zhao-common\server\src\routes\admin.ts`

- [ ] **Step 2: 添加统一配置路由**

在admin.ts中添加以下路由：

```typescript
// 统一配置路由
const configRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1/admin/config${path}`,
  handler: `config.${handler}`,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

// 在routes数组中添加
configRoute("GET", "/site", "getSite"),
configRoute("PUT", "/site", "updateSite"),
configRoute("GET", "/third", "getThird"),
configRoute("GET", "/third/:documentId", "getThirdOne"),
configRoute("POST", "/third", "createThird"),
configRoute("PUT", "/third/:documentId", "updateThird"),
configRoute("DELETE", "/third/:documentId", "deleteThird"),
configRoute("GET", "/points", "getPoints"),
configRoute("PUT", "/points", "updatePoints"),
configRoute("GET", "/oss", "getOss"),
configRoute("PUT", "/oss", "updateOss"),
configRoute("GET", "/sso", "getSso"),
configRoute("GET", "/sso/:documentId", "getSsoOne"),
configRoute("POST", "/sso", "createSso"),
configRoute("PUT", "/sso/:documentId", "updateSso"),
configRoute("DELETE", "/sso/:documentId", "deleteSso"),
configRoute("GET", "/flags", "getFlags"),
configRoute("GET", "/flags/:documentId", "getFlagOne"),
configRoute("POST", "/flags", "createFlag"),
configRoute("PUT", "/flags/:documentId", "updateFlag"),
configRoute("DELETE", "/flags/:documentId", "deleteFlag"),
```

---

### Task 4: 创建公开配置路由

**Files:**
- Modify: `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts`

- [ ] **Step 1: 读取当前content-api.ts**

Read: `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts`

- [ ] **Step 2: 添加公开配置路由**

```typescript
{
  method: "GET",
  path: "/v1/public/config",
  handler: "config.getPublic",
  config: { auth: false },
}
```

---

### Task 5: 测试后端路由

- [ ] **Step 1: 启动后端服务**

```bash
cd E:\code\basic
npm run develop
```

- [ ] **Step 2: 测试站点配置路由**

```bash
curl -X GET http://localhost:1337/zhao-common/v1/admin/config/site -H "Authorization: Bearer <token>"
```

预期：返回站点配置数据

- [ ] **Step 3: 测试公开配置路由**

```bash
curl -X GET http://localhost:1337/zhao-common/v1/public/config
```

预期：返回公开配置数据（不含敏感信息）

- [ ] **Step 4: 测试三方配置路由**

```bash
curl -X GET http://localhost:1337/zhao-common/v1/admin/config/third -H "Authorization: Bearer <token>"
```

预期：返回三方配置列表

---

## 自审检查

**1. Spec覆盖：**
- ✓ 站点配置路由：Task 3
- ✓ 三方配置路由：Task 3
- ✓ 积分配置路由：Task 3
- ✓ OSS配置路由：Task 3
- ✓ SSO配置路由：Task 3
- ✓ 功能开关路由：Task 3
- ✓ 公开配置路由：Task 4
- ✓ 测试：Task 5

**2. Placeholder扫描：**
- 无TBD、TODO等占位符
- 所有代码步骤都有完整代码

**3. 类型一致性：**
- 所有服务方法使用统一的命名规范
- 所有控制器方法使用统一的命名规范

---

Plan complete and saved to `docs/superpowers/plans/2026-06-17-config-backend-routes.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?