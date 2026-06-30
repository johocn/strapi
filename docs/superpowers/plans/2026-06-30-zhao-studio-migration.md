# zhao-studio 插件迁移实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `e:\code\plugins\zhao-studio` 完整 AS-IS 迁移至 `e:\code\basic\plugins\zhao-studio`，适配 Strapi v5 现代插件格式。

**Architecture:** 增量替换骨架方案——保留骨架已有的现代 package.json/tsconfig.json/strapi-server.js，复制 server/src、admin/src、tests、docs 全部内容，补全 strapi-admin export + peerDeps + admin tsconfig + strapi-admin.js。对齐 zhao-wealth 先例。

**Tech Stack:** Strapi v5、TypeScript、React 18、@strapi/design-system v2、@strapi/icons v2、styled-components v6、Jest

**Spec:** `e:\code\basic\docs\superpowers\specs\2026-06-30-zhao-studio-migration-design.md`

---

## 文件结构总览

**复制源（`e:\code\plugins\zhao-studio\`）→ 目标（`e:\code\basic\plugins\zhao-studio\`）**

| 路径 | 处理 | 数量 |
|---|---|---|
| `admin/src/components/` | 新增 | 16 文件 |
| `admin/src/hooks/` | 新增 | 10 文件 |
| `admin/src/pages/` | 新增 | 11 文件 |
| `admin/src/utils/` | 新增 | 8 文件 |
| `admin/src/index.ts` | 新增 | 1 |
| `admin/src/pluginId.ts` | 新增 | 1 |
| `admin/custom.d.ts` | 新增 | 1 |
| `server/src/config/index.ts` | 覆盖骨架 | 1 |
| `server/src/content-types/` | 覆盖骨架 | 10 子目录 × 2 文件 |
| `server/src/controllers/` | 覆盖骨架 | 7 文件 |
| `server/src/middlewares/index.ts` | 覆盖骨架 | 1 |
| `server/src/policies/index.ts` | 覆盖骨架 | 1 |
| `server/src/routes/` | 覆盖骨架 | 3 文件 |
| `server/src/services/` | 覆盖骨架 | 11 文件 |
| `server/src/utils/` | 覆盖骨架 | 10 文件 |
| `server/src/bootstrap.ts` | 覆盖骨架 | 1 |
| `server/src/destroy.ts` | 覆盖骨架 | 1 |
| `server/src/index.ts` | 覆盖骨架 | 1 |
| `server/src/permissions.ts` | 覆盖骨架 | 1 |
| `server/src/register.ts` | 覆盖骨架 | 1 |
| `tests/` | 新增 | 完整目录 |
| `docs/` | 新增 | 3 文件 |
| `.editorconfig` `.eslintignore` `.prettierignore` `.prettierrc` | 新增 | 4 |
| `README.md` | 新增 | 1 |
| `package.json` | 修改骨架 | 补 3 处 |
| `admin/tsconfig.json` | 新增 | 1 |
| `admin/tsconfig.build.json` | 新增 | 1 |
| `strapi-admin.js` | 新增 | 1 |

**排除项**：`dist/`、`node_modules/`、所有 `package-lock.json`、`admin/package.json`、`server/package.json`

---

## Task 1: 复制 server 端源码

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\config\index.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\content-types\` (10 子目录)
- Create: `e:\code\basic\plugins\zhao-studio\server\src\controllers\` (7 文件)
- Create: `e:\code\basic\plugins\zhao-studio\server\src\middlewares\index.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\policies\index.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\routes\` (3 文件)
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\` (11 文件)
- Create: `e:\code\basic\plugins\zhao-studio\server\src\utils\` (10 文件)
- Create: `e:\code\basic\plugins\zhao-studio\server\src\bootstrap.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\destroy.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\permissions.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\register.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\index.ts` (覆盖空骨架)

- [ ] **Step 1: 复制 server/src 全部内容**

PowerShell 命令（在 `e:\code` 下执行）：

```powershell
$src = "e:\code\plugins\zhao-studio\server\src"
$dst = "e:\code\basic\plugins\zhao-studio\server\src"
# 先清空骨架的空 index.ts（若存在子目录会一并被覆盖）
Remove-Item -Path $dst -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path $src -Destination $dst -Recurse -Force
```

- [ ] **Step 2: 验证 server 文件清单**

```powershell
Get-ChildItem -Path "e:\code\basic\plugins\zhao-studio\server\src" -Recurse -File | Measure-Object
```

Expected: 约 44 个文件（10 content-types × 2 + 7 controllers + 1 middlewares + 1 policies + 3 routes + 11 services + 10 utils + 6 根 ts 文件）

- [ ] **Step 3: 确认 server/src/index.ts 已被覆盖**

Run: Read `e:\code\basic\plugins\zhao-studio\server\src\index.ts`
Expected: 内容为完整导入（register/bootstrap/destroy/config/controllers/routes/services/policies/middlewares/contentTypes），不再是空函数骨架。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/server/src
git commit -m "feat(zhao-studio): 复制 server 端源码（10 content-types, 7 controllers, 11 services）"
```

---

## Task 2: 复制 admin 端源码

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\components\` (16 文件)
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\hooks\` (10 文件)
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\pages\` (11 文件)
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\utils\` (8 文件)
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\index.ts`
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\pluginId.ts`
- Create: `e:\code\basic\plugins\zhao-studio\admin\custom.d.ts`

- [ ] **Step 1: 复制 admin/src 与 custom.d.ts**

```powershell
$src = "e:\code\plugins\zhao-studio\admin\src"
$dst = "e:\code\basic\plugins\zhao-studio\admin\src"
New-Item -ItemType Directory -Path "e:\code\basic\plugins\zhao-studio\admin" -Force | Out-Null
Copy-Item -Path $src -Destination $dst -Recurse -Force
Copy-Item -Path "e:\code\plugins\zhao-studio\admin\custom.d.ts" -Destination "e:\code\basic\plugins\zhao-studio\admin\custom.d.ts" -Force
```

- [ ] **Step 2: 验证 admin 文件清单**

```powershell
Get-ChildItem -Path "e:\code\basic\plugins\zhao-studio\admin\src" -Recurse -File | Measure-Object
```

Expected: 约 48 个文件（16 components + 10 hooks + 11 pages + 8 utils + index.ts + pluginId.ts）

- [ ] **Step 3: 确认 admin/src/index.ts 包含 addMenuLink 注册**

Run: Read `e:\code\basic\plugins\zhao-studio\admin\src\index.ts`
Expected: 包含 `app.addMenuLink({ to: '/plugins/zhao-studio', ... })` 和 `app.registerPlugin({ id: pluginId, ... })`

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin
git commit -m "feat(zhao-studio): 复制 admin 端源码（16 components, 10 hooks, 11 pages）"
```

---

## Task 3: 复制 tests 与 docs 与根配置文件

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\tests\` (完整目录)
- Create: `e:\code\basic\plugins\zhao-studio\docs\API手册.md`
- Create: `e:\code\basic\plugins\zhao-studio\docs\README.md`
- Create: `e:\code\basic\plugins\zhao-studio\docs\使用手册.md`
- Create: `e:\code\basic\plugins\zhao-studio\.editorconfig`
- Create: `e:\code\basic\plugins\zhao-studio\.eslintignore`
- Create: `e:\code\basic\plugins\zhao-studio\.prettierignore`
- Create: `e:\code\basic\plugins\zhao-studio\.prettierrc`
- Create: `e:\code\basic\plugins\zhao-studio\README.md`

- [ ] **Step 1: 复制 tests、docs、根配置文件**

```powershell
$pluginSrc = "e:\code\plugins\zhao-studio"
$pluginDst = "e:\code\basic\plugins\zhao-studio"
Copy-Item -Path "$pluginSrc\tests" -Destination "$pluginDst\tests" -Recurse -Force
Copy-Item -Path "$pluginSrc\docs" -Destination "$pluginDst\docs" -Recurse -Force
Copy-Item -Path "$pluginSrc\.editorconfig" -Destination "$pluginDst\.editorconfig" -Force
Copy-Item -Path "$pluginSrc\.eslintignore" -Destination "$pluginDst\.eslintignore" -Force
Copy-Item -Path "$pluginSrc\.prettierignore" -Destination "$pluginDst\.prettierignore" -Force
Copy-Item -Path "$pluginSrc\.prettierrc" -Destination "$pluginDst\.prettierrc" -Force
Copy-Item -Path "$pluginSrc\README.md" -Destination "$pluginDst\README.md" -Force
```

- [ ] **Step 2: 验证文件存在**

```powershell
Test-Path "e:\code\basic\plugins\zhao-studio\tests\jest.config.ts"
Test-Path "e:\code\basic\plugins\zhao-studio\docs\API手册.md"
Test-Path "e:\code\basic\plugins\zhao-studio\.prettierrc"
Test-Path "e:\code\basic\plugins\zhao-studio\README.md"
```

Expected: 全部 `True`

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/tests plugins/zhao-studio/docs plugins/zhao-studio/.editorconfig plugins/zhao-studio/.eslintignore plugins/zhao-studio/.prettierignore plugins/zhao-studio/.prettierrc plugins/zhao-studio/README.md
git commit -m "feat(zhao-studio): 复制 tests、docs、根 lint 配置文件"
```

---

## Task 4: 补全根 package.json（strapi-admin export + peerDeps + scripts）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\package.json`

- [ ] **Step 1: 读取当前 package.json 确认骨架内容**

Run: Read `e:\code\basic\plugins\zhao-studio\package.json`
Expected: 骨架已有 `exports` 仅含 `./package.json` 和 `./strapi-server`，无 `./strapi-admin`，无 `peerDependencies`。

- [ ] **Step 2: 在 exports 中新增 `./strapi-admin`**

使用 Edit 工具，将：

```json
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    }
  },
```

替换为：

```json
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
```

- [ ] **Step 3: 在 scripts 中新增 `watch:link`**

使用 Edit 工具，将：

```json
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "verify": "strapi-plugin verify"
  },
```

替换为：

```json
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify"
  },
```

- [ ] **Step 4: 在 devDependencies 后新增 peerDependencies**

使用 Edit 工具，将：

```json
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/strapi": "^5.45.0"
  },
```

替换为：

```json
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/design-system": "^2.2.0",
    "@strapi/icons": "^2.2.0",
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.3",
    "styled-components": "^6.4.1"
  },
```

- [ ] **Step 5: 验证 package.json JSON 合法性**

```powershell
Get-Content "e:\code\basic\plugins\zhao-studio\package.json" -Raw | ConvertFrom-Json | Out-Null
Write-Host "JSON valid"
```

Expected: 输出 `JSON valid`

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/package.json
git commit -m "feat(zhao-studio): 补全 package.json（strapi-admin export + peerDeps + watch:link）"
```

---

## Task 5: 新增 admin tsconfig 配置

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\admin\tsconfig.json`
- Create: `e:\code\basic\plugins\zhao-studio\admin\tsconfig.build.json`

- [ ] **Step 1: 创建 admin/tsconfig.json**

使用 Write 工具创建文件 `e:\code\basic\plugins\zhao-studio\admin\tsconfig.json`，内容：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleDetection": "force",
    "baseUrl": ".",
    "paths": {
      "@strapi/strapi": ["../../../node_modules/@strapi/strapi"],
      "@strapi/design-system": ["../../../node_modules/@strapi/design-system"],
      "@strapi/icons": ["../../../node_modules/@strapi/icons"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: 创建 admin/tsconfig.build.json**

使用 Write 工具创建文件 `e:\code\basic\plugins\zhao-studio\admin\tsconfig.build.json`，内容：

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "../dist/admin",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/tsconfig.json plugins/zhao-studio/admin/tsconfig.build.json
git commit -m "feat(zhao-studio): 新增 admin tsconfig 与 build 配置"
```

---

## Task 6: 新增根 strapi-admin.js

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\strapi-admin.js`

- [ ] **Step 1: 创建 strapi-admin.js**

使用 Write 工具创建文件 `e:\code\basic\plugins\zhao-studio\strapi-admin.js`，内容：

```js
'use strict';
module.exports = require('./dist/admin');
```

- [ ] **Step 2: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/strapi-admin.js
git commit -m "feat(zhao-studio): 新增 strapi-admin.js 入口"
```

---

## Task 7: 启动验证 - 插件加载与表创建

**Files:** 无文件变更，仅运行验证

- [ ] **Step 1: 安装 basic 依赖（若 peerDeps 提示缺失）**

```powershell
cd e:\code\basic
npm install
```

Expected: 无报错。若提示 `@strapi/design-system` 等缺失，basic 根 package.json 已有这些依赖（间接通过 @strapi/strapi），可忽略 peerDeps 警告。

- [ ] **Step 2: 启动 Strapi develop 模式**

```powershell
cd e:\code\basic
npm run develop
```

非阻塞运行，等待启动日志。

- [ ] **Step 3: 验证插件加载无错误**

观察启动日志，Expected:
- 无 `zhao-studio` 相关 error
- 出现 `[info] Time: ... ms` 表示启动成功
- 出现 `Bootstrap function` 执行日志

若出现 `Cannot find module './dist/admin'` 或 ESM 解析错误 → 检查 strapi-admin.js 是否创建、package.json 是否含 `./strapi-admin` export。

- [ ] **Step 4: 验证 10 张表已创建**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'zhao_article_drafts', 'zhao_collect_sources', 'zhao_collect_tasks',
    'zhao_publish_platforms', 'zhao_publish_accounts', 'zhao_publish_records',
    'zhao_knowledge_point_indices', 'zhao_ad_slots', 'zhao_browser_logs',
    'zhao_stat_summaries'
  );
```

Expected: 返回 10 行。

若返回行数 < 10 → 删除 `strapi_database_schema` 表中 `zhao-studio` 相关记录，重启 Strapi 强制重建 schema：

```sql
DELETE FROM strapi_database_schema WHERE plugin = 'zhao-studio';
```

- [ ] **Step 5: Commit（仅记录验证完成，无文件变更）**

无 commit，仅记录验证结果。

---

## Task 8: 启动验证 - 路由与权限注册

**Files:** 无文件变更，仅运行验证

- [ ] **Step 1: 验证路由注册**

在 Strapi 启动状态下，访问：

```
GET http://localhost:1337/api/zhao-studio/v1/admin/collect-sources
```

Expected: 返回 401（未授权）或 403（无权限），**不是** 404（路由不存在）。

若返回 404 → 检查 `server/src/routes/index.ts` 是否含 `type: 'content-api'` 字段（项目记忆：缺失会导致路由不可访问）。

- [ ] **Step 2: 验证权限 action 已注册**

访问 admin 后台 `Settings > Administration panel > Roles > Author`，编辑任意角色，检查 plugin 列表中是否出现 `Zhao Studio` 与 4 个 action（Read/Create/Update/Delete）。

或通过 SQL：

```sql
SELECT action_id FROM strapi_admin_permissions WHERE action_id LIKE 'plugin::zhao-studio%';
```

Expected: 返回 4 行（read/create/update/delete）。

若未注册 → 检查 `server/src/register.ts` 是否调用 `permissionProvider.registerMany(permissions.actions)`。

- [ ] **Step 3: Commit（仅记录验证完成）**

无 commit。

---

## Task 9: 启动验证 - admin 前端可访问

**Files:** 无文件变更，仅运行验证

- [ ] **Step 1: 访问 admin 入口**

浏览器打开 `http://localhost:1337/admin/plugins/zhao-studio`

Expected: 显示"内容工作室"首页（HomePage.tsx 渲染内容），无白屏、无控制台错误。

- [ ] **Step 2: 验证左侧菜单入口**

在 admin 首页（`http://localhost:1337/admin`）左侧导航栏，Expected: 出现"内容工作室"菜单项，icon 为 Information 图标。

若菜单项缺失 → 检查 `admin/src/index.ts` 是否调用 `app.addMenuLink({ to: '/plugins/zhao-studio', ... })`。

- [ ] **Step 3: 验证 admin 子页面可切换**

依次点击菜单进入各页面（采集、发布、统计、AI 配置、账号配置等），Expected: 各页面均可加载，无路由错误。

- [ ] **Step 4: Commit（仅记录验证完成）**

无 commit。

---

## Task 10: 清理遗留 debug log

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\**` (若发现 debug log)

- [ ] **Step 1: 扫描 debug log 标记**

使用 Grep 工具搜索 `e:\code\basic\plugins\zhao-studio\server\src`：

```
pattern: "\[getAuthUrl\]|\[debug\]|TODO-cleanup|console\.log\(.*debug"
```

- [ ] **Step 2: 清理发现的 debug log**

对每个匹配文件，使用 Edit 工具删除或注释 debug log 行。注意保留业务逻辑日志（如 `strapi.log.info`、`strapi.log.error`）。

- [ ] **Step 3: 重新扫描确认无遗留**

```
pattern: "\[getAuthUrl\]|\[debug\]|TODO-cleanup"
```

Expected: 无匹配。

- [ ] **Step 4: Commit（仅当有清理时）**

```bash
cd e:/code/basic
git add plugins/zhao-studio/server/src
git commit -m "chore(zhao-studio): 清理遗留 debug log"
```

若无清理，跳过 commit。

---

## Task 11: 最终验收

**Files:** 无文件变更，验收记录

- [ ] **Step 1: 核对启动验证清单 1-6 项必须通过**

| 项 | 状态 |
|---|---|
| 1. 插件加载无错误 | ✅/❌ |
| 2. 10 张表已创建 | ✅/❌ |
| 3. 路由可访问（非 404） | ✅/❌ |
| 4. 4 个权限 action 已注册 | ✅/❌ |
| 5. /admin/plugins/zhao-studio 可访问 | ✅/❌ |
| 6. 左侧菜单显示"内容工作室" | ✅/❌ |

1-6 项必须全 ✅ 才算通过。

- [ ] **Step 2: 核对 7-8 项功能验证（手动触发一次）**

| 项 | 状态 |
|---|---|
| 7. collect/publish/analytics/ai 服务可调用 | ✅/❌ |
| 8. publish-platform 与 publish-account manyToMany 可读写 | ✅/❌ |

若 8 失败（manyToMany 写入失败）→ 参考 project_memory：改用 knex 直写 `_lnk` 表（命名 `{owner_table}_{inverse_attribute}_lnk`）。

- [ ] **Step 3: 核对第 9 项 debug log 清理**

预期：源码无 `[getAuthUrl]`、`TODO-cleanup` 标记。

- [ ] **Step 4: 核对第 10 项 tests（软性指标）**

```powershell
cd e:\code\basic\plugins\zhao-studio
npx --yes jest --config tests/jest.config.ts
```

允许集成测试因 basic 环境差异跳过；主流程单测应通过。

- [ ] **Step 5: 输出最终验收报告**

总结：迁移完成，X 项通过 / Y 项需后续修复（列出具体问题）。

- [ ] **Step 6: 最终 Commit（若有未提交变更）**

```bash
cd e:/code/basic
git add -A plugins/zhao-studio
git commit -m "feat(zhao-studio): 完成插件迁移与启动验证"
```

---

## Self-Review 结果

**1. Spec coverage 检查**：
- ✅ Spec 第 1.3 节范围内项 → Task 1-6 覆盖
- ✅ Spec 第 2 节 Schema 冲突预检 → brainstorming 阶段已完成，无需 Task
- ✅ Spec 第 3 节文件结构 → Task 1-3 实现
- ✅ Spec 第 4 节 package.json/构建配置 → Task 4-6 实现
- ✅ Spec 第 5 节迁移步骤 → Task 1-6 对应
- ✅ Spec 第 6 节风险点 → Task 7-10 验证环节体现
- ✅ Spec 第 7 节启动验证清单 10 项 → Task 7-11 覆盖（1-6 → Task 7-9；7-8 → Task 11；9 → Task 10；10 → Task 11）

**2. Placeholder 扫描**：
- 无 TBD/TODO/未实现段落
- 每个步骤都含具体命令或代码

**3. Type 一致性**：
- package.json `./strapi-admin` export 路径 `./dist/admin/index.js` 与 strapi-admin.js 中 `require('./dist/admin')` 一致
- admin/tsconfig.build.json `outDir: ../dist/admin` 与 package.json `./dist/admin/index.js` 一致
- 10 张表名在 Task 7 Step 4、Task 11 验收清单中一致

**4. 命令可执行性**：
- PowerShell 命令已使用 Windows 路径
- SQL 命令假设 PostgreSQL（basic 已使用 pg）
- git commit 命令使用 `cd e:/code/basic`（git 仓库根）

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-06-30-zhao-studio-migration.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派 fresh subagent 执行，Task 间 review，快速迭代
2. **Inline Execution** - 当前会话批量执行，checkpoint 处 review

Which approach?
