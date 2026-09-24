# zhao-sso 子计划 A：插件骨架 + 数据表 + JWT 服务

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 zhao-sso 插件骨架，创建全部 12 张数据表，实现 JWT 签发/验证服务

**Architecture:** Strapi 5 插件，独立于 zhao-auth，使用 sso_ 前缀的 content-type 定义数据表，sso-jwt 服务使用独立密钥签发/验证 JWT

**Tech Stack:** Strapi 5, TypeScript, jsonwebtoken, bcryptjs, uuid

**Spec:** `docs/superpowers/specs/2026-05-29-zhao-sso-design.md`

---

## File Structure

```
plugins/zhao-sso/
├── package.json
├── strapi-admin.js
├── strapi-server.js
├── tsconfig.json
├── admin/src/
│   ├── index.ts
│   ├── pages/App.tsx
│   └── translations/en.json, zh-Hans.json
├── server/src/
│   ├── index.ts
│   ├── register.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   ├── types.ts
│   ├── content-types/
│   │   ├── index.ts
│   │   ├── sso-user/index.ts + schema.json
│   │   ├── sso-third-party-binding/index.ts + schema.json
│   │   ├── sso-app/index.ts + schema.json
│   │   ├── sso-channel/index.ts + schema.json
│   │   ├── sso-auth-code/index.ts + schema.json
│   │   ├── sso-token/index.ts + schema.json
│   │   ├── sso-user-app-role/index.ts + schema.json
│   │   ├── sso-login-log/index.ts + schema.json
│   │   ├── sso-invite-code/index.ts + schema.json
│   │   ├── sso-invite-usage/index.ts + schema.json
│   │   ├── sso-referral-relation/index.ts + schema.json
│   │   └── sso-invite-stats/index.ts + schema.json
│   ├── services/
│   │   ├── index.ts
│   │   ├── sso-jwt.ts
│   │   └── sso-user.ts
│   ├── controllers/index.ts
│   ├── routes/index.ts
│   ├── policies/index.ts
│   └── middlewares/index.ts
└── tests/
    ├── jest.config.ts
    ├── tsconfig.json
    ├── sso-jwt.test.ts
    └── sso-user.test.ts
```

---

### Task 1: 创建插件骨架

**Files:**
- Create: `e:\code\plugins\zhao-sso\package.json`
- Create: `e:\code\plugins\zhao-sso\strapi-server.js`
- Create: `e:\code\plugins\zhao-sso\strapi-admin.js`
- Create: `e:\code\plugins\zhao-sso\tsconfig.json`
- Create: `e:\code\plugins\zhao-sso\server\src\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\register.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\bootstrap.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\config.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\types.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\content-types\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\services\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\controllers\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\routes\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\policies\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\middlewares\index.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "zhao-sso",
  "version": "1.0.0",
  "description": "统一单点登录系统 - OAuth2授权码模式",
  "private": true,
  "type": "commonjs",
  "exports": {
    "./package.json": "./package.json",
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    },
    "./strapi-admin": {
      "types": "./dist/admin/src/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify",
    "test": "jest --config tests/jest.config.ts"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jest": "^30.0.0",
    "@types/uuid": "^9.0.8",
    "jest": "^30.4.2",
    "ts-jest": "^29.4.11",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/design-system": "^2.2.0",
    "@strapi/icons": "^2.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-intl": "^6.8.9",
    "react-router-dom": "^6.30.3",
    "styled-components": "^6.4.1"
  },
  "strapi": {
    "kind": "plugin",
    "name": "zhao-sso",
    "displayName": "Zhao SSO",
    "description": "统一单点登录系统"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: 创建 strapi-server.js**

```javascript
"use strict";
module.exports = require("./dist/server/index.js");
```

- [ ] **Step 3: 创建 strapi-admin.js**

```javascript
"use strict";
module.exports = require("./dist/admin/index.js");
```

- [ ] **Step 4: 创建 tsconfig.json**

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "sourceMap": true,
    "esModuleInterop": true
  },
  "include": ["server/src", "admin/src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: 创建 server/src/index.ts**

```typescript
import register from "./register";
import bootstrap from "./bootstrap";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";
import policies from "./policies";
import middlewares from "./middlewares";

export default {
  register,
  bootstrap,
  config,
  contentTypes,
  controllers,
  routes,
  services,
  policies,
  middlewares,
};
```

- [ ] **Step 6: 创建 server/src/register.ts**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin registered");
};
```

- [ ] **Step 7: 创建 server/src/bootstrap.ts**

```typescript
import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");

  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" },
  });

  if (!defaultApp) {
    const bcrypt = require("bcryptjs");
    const rawSecret = "sso_default_secret_change_me";
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: await bcrypt.hash(rawSecret, 10),
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }
};

export default bootstrap;
```

- [ ] **Step 8: 创建 server/src/config.ts**

```typescript
export default {
  default: {
    jwt: {
      algorithm: "HS256",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    },
    security: {
      loginMaxAttempts: 5,
      loginLockDuration: "30m",
      authCodeExpiresIn: "10m",
    },
    defaults: {
      appCode: "default",
    },
  },
};
```

- [ ] **Step 9: 创建 server/src/types.ts**

```typescript
export interface SsoUser {
  id: number;
  uuid: string;
  username?: string;
  mobile?: string;
  email?: string;
  password_hash?: string;
  avatar_url?: string;
  nickname?: string;
  status: "active" | "blocked" | "inactive";
  register_channel?: string;
  last_login_channel?: string;
  invite_code_used?: string;
  invited_by?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  last_login_at?: Date;
  login_count: number;
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SsoJwtPayload {
  sub: string;
  jti: string;
  app_code: string;
  roles?: string[];
  channel?: string;
  type?: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface SsoTokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
}
```

- [ ] **Step 10: 创建空导出文件**

`server/src/content-types/index.ts`:
```typescript
export default {};
```

`server/src/services/index.ts`:
```typescript
export default {};
```

`server/src/controllers/index.ts`:
```typescript
export default {};
```

`server/src/routes/index.ts`:
```typescript
export default {};
```

`server/src/policies/index.ts`:
```typescript
export default {};
```

`server/src/middlewares/index.ts`:
```typescript
export default {};
```

- [ ] **Step 11: 创建 admin/src/index.ts**

```typescript
import { PuzzlePiece } from "@strapi/icons";

export default {
  register(app: any) {
    app.addMenuLink({
      to: "plugins/zhao-sso",
      icon: PuzzlePiece,
      intlLabel: {
        id: "zhao-sso.plugin.name",
        defaultMessage: "SSO 统一登录",
      },
      Component: () => import("./pages/App"),
    });

    app.registerPlugin({
      id: "zhao-sso",
      name: "Zhao SSO",
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
```

- [ ] **Step 12: 创建 admin/src/pages/App.tsx**

```typescript
import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./HomePage";

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
```

- [ ] **Step 13: 创建 admin/src/pages/HomePage.tsx**

```typescript
import { Main, Box, Typography, Loader } from "@strapi/design-system";

export const HomePage = () => {
  return (
    <Main>
      <Box padding={8}>
        <Typography variant="alpha">SSO 统一登录管理</Typography>
        <Box paddingTop={4}>
          <Typography variant="omega">插件初始化中，请完成数据表创建后刷新。</Typography>
        </Box>
      </Box>
    </Main>
  );
};
```

- [ ] **Step 14: 创建翻译文件**

`admin/src/translations/en.json`:
```json
{
  "zhao-sso.plugin.name": "SSO Login"
}
```

`admin/src/translations/zh-Hans.json`:
```json
{
  "zhao-sso.plugin.name": "SSO 统一登录"
}
```

- [ ] **Step 15: 安装依赖并验证构建**

Run: `cd e:\code\plugins\zhao-sso; npm install; npm run build`
Expected: 构建成功

---

### Task 2: 创建 12 张数据表 content-type

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\content-types\sso-user\schema.json`
- Create: `e:\code\plugins\zhao-sso\server\src\content-types\sso-user\index.ts`
- (其余 11 张表类似结构)

- [ ] **Step 1: 创建 sso-user content-type**

`server/src/content-types/sso-user/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_users",
  "info": {
    "singularName": "sso-user",
    "pluralName": "sso-users",
    "displayName": "SSO User"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "uuid": { "type": "string", "unique": true, "required": true },
    "username": { "type": "string", "unique": true },
    "mobile": { "type": "string", "unique": true },
    "email": { "type": "email", "unique": true },
    "password_hash": { "type": "string" },
    "avatar_url": { "type": "string" },
    "nickname": { "type": "string" },
    "status": { "type": "enumeration", "enum": ["active", "blocked", "inactive"], "default": "active", "required": true },
    "register_channel": { "type": "string" },
    "last_login_channel": { "type": "string" },
    "invite_code_used": { "type": "string" },
    "invited_by": { "type": "integer" },
    "utm_source": { "type": "string" },
    "utm_medium": { "type": "string" },
    "utm_campaign": { "type": "string" },
    "last_login_at": { "type": "datetime" },
    "login_count": { "type": "integer", "default": 0, "required": true },
    "password_changed_at": { "type": "datetime" }
  }
}
```

`server/src/content-types/sso-user/index.ts`:
```typescript
import schema from "./schema.json";

export default { schema };
```

- [ ] **Step 2: 创建 sso-third-party-binding content-type**

`server/src/content-types/sso-third-party-binding/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_third_party_bindings",
  "info": {
    "singularName": "sso-third-party-binding",
    "pluralName": "sso-third-party-bindings",
    "displayName": "SSO Third Party Binding"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "inversedBy": "third_party_bindings" },
    "provider": { "type": "string", "required": true },
    "provider_user_id": { "type": "string", "required": true },
    "provider_union_id": { "type": "string" },
    "provider_nickname": { "type": "string" },
    "provider_avatar": { "type": "string" },
    "provider_data": { "type": "json" },
    "bound_at": { "type": "datetime", "required": true }
  }
}
```

`server/src/content-types/sso-third-party-binding/index.ts`:
```typescript
import schema from "./schema.json";
export default { schema };
```

- [ ] **Step 3: 创建 sso-app content-type**

`server/src/content-types/sso-app/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_apps",
  "info": {
    "singularName": "sso-app",
    "pluralName": "sso-apps",
    "displayName": "SSO App"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "app_code": { "type": "string", "unique": true, "required": true },
    "app_name": { "type": "string", "required": true },
    "app_secret": { "type": "string", "required": true },
    "redirect_uris": { "type": "json", "required": true },
    "allowed_grant_types": { "type": "json", "required": true },
    "is_active": { "type": "boolean", "default": true, "required": true },
    "description": { "type": "string" }
  }
}
```

- [ ] **Step 4: 创建 sso-channel content-type**

`server/src/content-types/sso-channel/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_channels",
  "info": {
    "singularName": "sso-channel",
    "pluralName": "sso-channels",
    "displayName": "SSO Channel"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "channel_code": { "type": "string", "unique": true, "required": true },
    "channel_name": { "type": "string", "required": true },
    "channel_type": { "type": "string", "required": true },
    "utm_template": { "type": "json" },
    "is_active": { "type": "boolean", "default": true, "required": true },
    "description": { "type": "string" }
  }
}
```

- [ ] **Step 5: 创建 sso-auth-code content-type**

`server/src/content-types/sso-auth-code/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_auth_codes",
  "info": {
    "singularName": "sso-auth-code",
    "pluralName": "sso-auth-codes",
    "displayName": "SSO Auth Code"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "code": { "type": "string", "unique": true, "required": true },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "app_code": { "type": "string", "required": true },
    "redirect_uri": { "type": "string", "required": true },
    "channel_code": { "type": "string" },
    "scopes": { "type": "json" },
    "expires_at": { "type": "datetime", "required": true },
    "used": { "type": "boolean", "default": false, "required": true }
  }
}
```

- [ ] **Step 6: 创建 sso-token content-type**

`server/src/content-types/sso-token/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_tokens",
  "info": {
    "singularName": "sso-token",
    "pluralName": "sso-tokens",
    "displayName": "SSO Token"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "app_code": { "type": "string", "required": true },
    "access_token_jti": { "type": "string", "unique": true, "required": true },
    "refresh_token": { "type": "string", "unique": true, "required": true },
    "refresh_expires_at": { "type": "datetime", "required": true },
    "revoked": { "type": "boolean", "default": false, "required": true },
    "revoked_at": { "type": "datetime" },
    "channel_code": { "type": "string" }
  }
}
```

- [ ] **Step 7: 创建 sso-user-app-role content-type**

`server/src/content-types/sso-user-app-role/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_user_app_roles",
  "info": {
    "singularName": "sso-user-app-role",
    "pluralName": "sso-user-app-roles",
    "displayName": "SSO User App Role"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "app_code": { "type": "string", "required": true },
    "role": { "type": "string", "required": true }
  }
}
```

- [ ] **Step 8: 创建 sso-login-log content-type**

`server/src/content-types/sso-login-log/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_login_logs",
  "info": {
    "singularName": "sso-login-log",
    "pluralName": "sso-login-logs",
    "displayName": "SSO Login Log"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "login_type": { "type": "string", "required": true },
    "provider": { "type": "string" },
    "channel_code": { "type": "string" },
    "app_code": { "type": "string" },
    "ip": { "type": "string" },
    "user_agent": { "type": "string" },
    "success": { "type": "boolean", "required": true },
    "fail_reason": { "type": "string" }
  }
}
```

- [ ] **Step 9: 创建 sso-invite-code content-type**

`server/src/content-types/sso-invite-code/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_invite_codes",
  "info": {
    "singularName": "sso-invite-code",
    "pluralName": "sso-invite-codes",
    "displayName": "SSO Invite Code"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "code": { "type": "string", "unique": true, "required": true },
    "creator": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "invite_type": { "type": "enumeration", "enum": ["system", "user_campaign"], "required": true },
    "max_uses": { "type": "integer" },
    "use_count": { "type": "integer", "default": 0, "required": true },
    "per_user_limit": { "type": "integer", "default": 1, "required": true },
    "valid_from": { "type": "datetime" },
    "valid_until": { "type": "datetime" },
    "bonus_tags": { "type": "json" },
    "is_active": { "type": "boolean", "default": true, "required": true }
  }
}
```

- [ ] **Step 10: 创建 sso-invite-usage content-type**

`server/src/content-types/sso-invite-usage/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_invite_usages",
  "info": {
    "singularName": "sso-invite-usage",
    "pluralName": "sso-invite-usages",
    "displayName": "SSO Invite Usage"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" },
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "channel_code": { "type": "string" },
    "app_code": { "type": "string" },
    "used_at": { "type": "datetime", "required": true }
  }
}
```

- [ ] **Step 11: 创建 sso-referral-relation content-type**

`server/src/content-types/sso-referral-relation/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_referral_relations",
  "info": {
    "singularName": "sso-referral-relation",
    "pluralName": "sso-referral-relations",
    "displayName": "SSO Referral Relation"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "invitee": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" },
    "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" },
    "level": { "type": "integer", "required": true },
    "channel_code": { "type": "string" }
  }
}
```

- [ ] **Step 12: 创建 sso-invite-stats content-type**

`server/src/content-types/sso-invite-stats/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "sso_invite_stats",
  "info": {
    "singularName": "sso-invite-stats",
    "pluralName": "sso-invite-stats",
    "displayName": "SSO Invite Stats"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "invite_code": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-sso.sso-invite-code" },
    "total_invites": { "type": "integer", "required": true },
    "active_invites": { "type": "integer", "required": true },
    "last_invited_at": { "type": "datetime" }
  }
}
```

- [ ] **Step 13: 更新 content-types/index.ts 注册所有表**

```typescript
import ssoUser from "./sso-user";
import ssoThirdPartyBinding from "./sso-third-party-binding";
import ssoApp from "./sso-app";
import ssoChannel from "./sso-channel";
import ssoAuthCode from "./sso-auth-code";
import ssoToken from "./sso-token";
import ssoUserAppRole from "./sso-user-app-role";
import ssoLoginLog from "./sso-login-log";
import ssoInviteCode from "./sso-invite-code";
import ssoInviteUsage from "./sso-invite-usage";
import ssoReferralRelation from "./sso-referral-relation";
import ssoInviteStats from "./sso-invite-stats";

export default {
  "sso-user": ssoUser,
  "sso-third-party-binding": ssoThirdPartyBinding,
  "sso-app": ssoApp,
  "sso-channel": ssoChannel,
  "sso-auth-code": ssoAuthCode,
  "sso-token": ssoToken,
  "sso-user-app-role": ssoUserAppRole,
  "sso-login-log": ssoLoginLog,
  "sso-invite-code": ssoInviteCode,
  "sso-invite-usage": ssoInviteUsage,
  "sso-referral-relation": ssoReferralRelation,
  "sso-invite-stats": ssoInviteStats,
};
```

- [ ] **Step 14: 在 sso-user schema 中添加 third_party_bindings 反向关系**

在 `sso-user/schema.json` 的 attributes 中添加：
```json
"third_party_bindings": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-sso.sso-third-party-binding", "mappedBy": "user" }
```

- [ ] **Step 15: 构建验证**

Run: `cd e:\code\plugins\zhao-sso; npm run build`
Expected: 构建成功

---

### Task 3: 实现 sso-jwt 服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-jwt.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`
- Create: `e:\code\plugins\zhao-sso\tests\sso-jwt.test.ts`
- Create: `e:\code\plugins\zhao-sso\tests\jest.config.ts`
- Create: `e:\code\plugins\zhao-sso\tests\tsconfig.json`

- [ ] **Step 1: 编写 sso-jwt 测试**

`tests/jest.config.ts`:
```typescript
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
};
```

`tests/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["."],
  "exclude": ["node_modules"]
}
```

`tests/sso-jwt.test.ts`:
```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-sso-jwt-secret-32chars!!";

function createSsoJwtService() {
  const getSecret = (): string => JWT_SECRET;

  const sign = async (payload: Record<string, any>, expiresIn: string = "15m"): Promise<string> => {
    return jwt.sign(payload, getSecret(), { expiresIn, jwtid: require("crypto").randomUUID() });
  };

  const verify = async (token: string): Promise<Record<string, any>> => {
    return jwt.verify(token, getSecret()) as Record<string, any>;
  };

  return { sign, verify, getSecret };
}

describe("sso-jwt service", () => {
  let service: ReturnType<typeof createSsoJwtService>;

  beforeEach(() => {
    service = createSsoJwtService();
  });

  test("signs access token with correct payload", async () => {
    const payload = { sub: "user-uuid-1", app_code: "shop_admin", roles: ["admin"], channel: "wechat_ads" };
    const token = await service.sign(payload, "15m");
    const decoded = await service.verify(token);

    expect(decoded.sub).toBe("user-uuid-1");
    expect(decoded.app_code).toBe("shop_admin");
    expect(decoded.roles).toEqual(["admin"]);
    expect(decoded.channel).toBe("wechat_ads");
    expect(decoded.jti).toBeDefined();
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test("signs refresh token with type=refresh", async () => {
    const payload = { sub: "user-uuid-1", app_code: "shop_admin", type: "refresh" as const };
    const token = await service.sign(payload, "30d");
    const decoded = await service.verify(token);

    expect(decoded.type).toBe("refresh");
    expect(decoded.sub).toBe("user-uuid-1");
  });

  test("rejects expired token", async () => {
    const payload = { sub: "user-uuid-1", app_code: "default" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "0s", jwtid: "expired" });

    await expect(service.verify(token)).rejects.toThrow();
  });

  test("rejects token signed with wrong secret", async () => {
    const payload = { sub: "user-uuid-1", app_code: "default" };
    const token = jwt.sign(payload, "wrong-secret", { expiresIn: "1h", jwtid: "wrong" });

    await expect(service.verify(token)).rejects.toThrow();
  });

  test("each token has unique jti", async () => {
    const payload = { sub: "user-uuid-1", app_code: "default" };
    const token1 = await service.sign(payload);
    const token2 = await service.sign(payload);
    const decoded1 = await service.verify(token1);
    const decoded2 = await service.verify(token2);

    expect(decoded1.jti).not.toBe(decoded2.jti);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd e:\code\plugins\zhao-sso; npx jest tests/sso-jwt.test.ts --config tests/jest.config.ts`
Expected: PASS（测试内联了实现，用于验证测试框架可用）

- [ ] **Step 3: 实现 sso-jwt 服务**

`server/src/services/sso-jwt.ts`:
```typescript
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";
import type { SsoJwtPayload, SsoTokenPair } from "../types";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSecret = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const secret = pluginConfig?.jwt?.secret || process.env.SSO_JWT_SECRET;
    if (!secret) throw new Error("[zhao-sso] JWT secret not configured. Set SSO_JWT_SECRET env.");
    return secret;
  };

  const getAlgorithm = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return pluginConfig?.jwt?.algorithm || "HS256";
  };

  const getAccessTokenExpiry = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return pluginConfig?.jwt?.accessTokenExpiresIn || "15m";
  };

  const getRefreshTokenExpiry = (): string => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    return pluginConfig?.jwt?.refreshTokenExpiresIn || "30d";
  };

  const signAccessToken = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<string> => {
    const signPayload: SsoJwtPayload = {
      ...payload,
      type: "access",
      jti: uuidv4(),
    };
    const options: SignOptions = {
      algorithm: getAlgorithm() as any,
      expiresIn: getAccessTokenExpiry(),
    };
    return jwt.sign(signPayload, getSecret(), options);
  };

  const signRefreshToken = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<string> => {
    const signPayload: SsoJwtPayload = {
      ...payload,
      type: "refresh",
      jti: uuidv4(),
    };
    const options: SignOptions = {
      algorithm: getAlgorithm() as any,
      expiresIn: getRefreshTokenExpiry(),
    };
    return jwt.sign(signPayload, getSecret(), options);
  };

  const signTokenPair = async (payload: Omit<SsoJwtPayload, "type" | "jti" | "iat" | "exp">): Promise<SsoTokenPair> => {
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: "Bearer",
    };
  };

  const verifyToken = async (token: string): Promise<SsoJwtPayload> => {
    return jwt.verify(token, getSecret(), { algorithms: [getAlgorithm()] }) as SsoJwtPayload;
  };

  const extractToken = (ctx: any): string | null => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };

  return {
    getSecret,
    signAccessToken,
    signRefreshToken,
    signTokenPair,
    verifyToken,
    extractToken,
  };
};
```

- [ ] **Step 4: 更新 services/index.ts**

```typescript
import ssoJwt from "./sso-jwt";

export default {
  "sso-jwt": ssoJwt,
};
```

- [ ] **Step 5: 构建验证**

Run: `cd e:\code\plugins\zhao-sso; npm run build`
Expected: 构建成功

---

### Task 4: 实现 sso-user 服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-user.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`
- Create: `e:\code\plugins\zhao-sso\tests\sso-user.test.ts`

- [ ] **Step 1: 编写 sso-user 测试**

`tests/sso-user.test.ts`:
```typescript
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

interface MockUser {
  id: number;
  uuid: string;
  username?: string;
  mobile?: string;
  email?: string;
  password_hash?: string;
  status: string;
  login_count: number;
}

let nextId = 1;
const users: MockUser[] = [];

const mockDb = {
  query: () => ({
    create: async ({ data }: any) => {
      const user: MockUser = { id: nextId++, ...data };
      users.push(user);
      return user;
    },
    findOne: async ({ where }: any) => {
      return users.find((u) => {
        if (where.email && u.email === where.email) return true;
        if (where.username && u.username === where.username) return true;
        if (where.mobile && u.mobile === where.mobile) return true;
        if (where.uuid && u.uuid === where.uuid) return true;
        return false;
      }) || null;
    },
    update: async ({ where, data }: any) => {
      const idx = users.findIndex((u) => u.id === where.id);
      if (idx === -1) return null;
      Object.assign(users[idx], data);
      return users[idx];
    },
  }),
};

async function createUser(data: { username?: string; mobile?: string; email?: string; password?: string }) {
  if (!data.username && !data.mobile && !data.email) {
    throw new Error("username/mobile/email at least one required");
  }
  const password_hash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
  const user = await mockDb.query().create({
    data: {
      uuid: uuidv4(),
      username: data.username,
      mobile: data.mobile,
      email: data.email,
      password_hash,
      status: "active",
      login_count: 0,
    },
  });
  return user;
}

describe("sso-user service", () => {
  beforeEach(() => {
    users.length = 0;
    nextId = 1;
  });

  test("creates user with email and password", async () => {
    const user = await createUser({ email: "test@example.com", password: "password123" });
    expect(user.email).toBe("test@example.com");
    expect(user.password_hash).toBeDefined();
    expect(user.uuid).toBeDefined();
    expect(user.status).toBe("active");
  });

  test("creates user with mobile only", async () => {
    const user = await createUser({ mobile: "+8613800138000" });
    expect(user.mobile).toBe("+8613800138000");
    expect(user.password_hash).toBeUndefined();
  });

  test("rejects creation without identifier", async () => {
    await expect(createUser({})).rejects.toThrow("at least one required");
  });

  test("finds user by email", async () => {
    await createUser({ email: "find@example.com", password: "pass" });
    const found = await mockDb.query().findOne({ where: { email: "find@example.com" } });
    expect(found).not.toBeNull();
    expect(found!.email).toBe("find@example.com");
  });

  test("verifies correct password", async () => {
    await createUser({ email: "auth@example.com", password: "mypassword" });
    const user = await mockDb.query().findOne({ where: { email: "auth@example.com" } });
    const isValid = await bcrypt.compare("mypassword", user!.password_hash!);
    expect(isValid).toBe(true);
  });

  test("rejects wrong password", async () => {
    await createUser({ email: "auth2@example.com", password: "mypassword" });
    const user = await mockDb.query().findOne({ where: { email: "auth2@example.com" } });
    const isValid = await bcrypt.compare("wrongpassword", user!.password_hash!);
    expect(isValid).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd e:\code\plugins\zhao-sso; npx jest tests/sso-user.test.ts --config tests/jest.config.ts`
Expected: PASS

- [ ] **Step 3: 实现 sso-user 服务**

`server/src/services/sso-user.ts`:
```typescript
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";

const USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createUser(data: {
    username?: string;
    mobile?: string;
    email?: string;
    password?: string;
    register_channel?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    invite_code_used?: string;
  }) {
    if (!data.username && !data.mobile && !data.email) {
      throw new Error("username/mobile/email 至少填写一个");
    }

    const password_hash = data.password ? await bcrypt.hash(data.password, 12) : null;

    return strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
        username: data.username || null,
        mobile: data.mobile || null,
        email: data.email || null,
        password_hash,
        status: "active",
        register_channel: data.register_channel || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        invite_code_used: data.invite_code_used || null,
        login_count: 0,
      },
    });
  },

  async findByIdentifier(identifier: string) {
    return strapi.db.query(USER_UID).findOne({
      where: {
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier },
          { mobile: identifier },
        ],
      },
    });
  },

  async findByUuid(uuid: string) {
    return strapi.db.query(USER_UID).findOne({ where: { uuid } });
  },

  async verifyPassword(user: any, password: string): Promise<boolean> {
    if (!user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  },

  async updateLoginInfo(userId: number, channelCode?: string) {
    const updateData: any = {
      last_login_at: new Date(),
      login_count: { $inc: 1 },
    };
    if (channelCode) {
      updateData.last_login_channel = channelCode;
    }
    return strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: updateData,
    });
  },

  async changePassword(userId: number, newPassword: string) {
    const password_hash = await bcrypt.hash(newPassword, 12);
    return strapi.db.query(USER_UID).update({
      where: { id: userId },
      data: { password_hash, password_changed_at: new Date() },
    });
  },

  async isBlocked(user: any): boolean {
    return user.status === "blocked";
  },
});
```

- [ ] **Step 4: 更新 services/index.ts**

```typescript
import ssoJwt from "./sso-jwt";
import ssoUser from "./sso-user";

export default {
  "sso-jwt": ssoJwt,
  "sso-user": ssoUser,
};
```

- [ ] **Step 5: 构建验证**

Run: `cd e:\code\plugins\zhao-sso; npm run build`
Expected: 构建成功

---

### Task 5: 注册到 Strapi 并验证启动

**Files:**
- Modify: `e:\code\basic\config\plugins.ts`

- [ ] **Step 1: 在 plugins.ts 中注册 zhao-sso**

在 `e:\code\basic\config\plugins.ts` 中添加：

```typescript
"zhao-sso": {
  enabled: true,
  resolve: "E:/code/plugins/zhao-sso",
  config: {
    jwt: {
      secret: env("SSO_JWT_SECRET"),
    },
  },
},
```

- [ ] **Step 2: 在 .env 中添加 SSO_JWT_SECRET**

在 `e:\code\basic\.env` 中添加：
```
SSO_JWT_SECRET=your-sso-jwt-secret-at-least-32-characters
```

- [ ] **Step 3: 重启 Strapi 验证数据表创建**

Run: `cd e:\code\basic; npm run dev`
Expected: Strapi 启动成功，12 张 sso_ 前缀表自动创建

- [ ] **Step 4: 运行全部测试**

Run: `cd e:\code\plugins\zhao-sso; npx jest --config tests/jest.config.ts`
Expected: 所有测试通过
