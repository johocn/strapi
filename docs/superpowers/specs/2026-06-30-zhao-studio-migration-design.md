# zhao-studio 插件迁移设计

- **日期**: 2026-06-30
- **类型**: 插件迁移
- **状态**: 设计已确认，待实现
- **范围**: 将 `e:\code\plugins\zhao-studio` 完整迁移至 `e:\code\basic\plugins\zhao-studio`

## 1. 背景与目标

### 1.1 背景

源插件 `e:\code\plugins\zhao-studio` 是完整功能版的内容工作室插件，包含：

- **server 端**：10 个 content-types、7 个 controllers、11 个 services、10 个 utils、完整 register/bootstrap/permissions
- **admin 端**：16 个 components、10 个 hooks、11 个 pages、8 个 utils（使用 `@strapi/design-system v2` + `@strapi/icons v2`）
- **tests**：controllers/services/integration 完整测试套件
- **docs**：API手册、README、使用手册
- **旧构建模式**：`tsc -p tsconfig.build.json` → `./admin/dist` + `./server/dist`

目标位置 `e:\code\basic\plugins\zhao-studio` 当前为空骨架：

- 仅 `server/src/index.ts`（空 register/bootstrap/destroy）
- 现代 v5 package.json（仅 `strapi-server` export，**缺 `strapi-admin` export**）
- 缺 admin 目录、缺 strapi-admin.js、缺真实 server 内容
- 插件已在 `basic/config/plugins.ts` 注册

### 1.2 目标

采用 **AS-IS 迁移**策略（对齐 zhao-wealth 先例）：

- 复制 server+admin 全部内容，适配 v5 插件格式
- 保留原 `@strapi/design-system` admin 技术栈
- Ant Design 重写留作后续独立阶段（admin重构 11-Task 计划）

### 1.3 范围内

- 复制 server/src、admin/src、tests、docs
- 适配 v5 现代 package.json（含 strapi-admin export + peerDeps）
- 新增 admin tsconfig 配置
- 新增 strapi-admin.js
- 启动验证 + Schema 冲突预检

### 1.4 范围外（YAGNI）

- 不重写 admin 为 Ant Design + antd-charts
- 不修改 CSS 选择器
- 不写新单元测试
- 不更新 API 文档
- 不做 Strapi v5 兼容性检查（沿用源代码，启动验证时发现问题再修）
- 不修改 `basic/config/plugins.ts`（已注册）
- 不强制迁移数据库表（Strapi v5 首次启动自动建表）

## 2. Schema 冲突预检结果

源插件 10 张表与 basic 现有表**无命名冲突**：

| 源表名 | 用途 |
|---|---|
| `zhao_article_drafts` | 文章草稿 |
| `zhao_collect_sources` | 采集源 |
| `zhao_collect_tasks` | 采集任务 |
| `zhao_publish_platforms` | 发布平台 |
| `zhao_publish_accounts` | 发布账号 |
| `zhao_publish_records` | 发布记录 |
| `zhao_knowledge_point_indices` | 知识点反向索引 |
| `zhao_ad_slots` | 广告位 |
| `zhao_browser_logs` | 浏览器日志 |
| `zhao_stat_summaries` | 统计汇总 |

**语义重叠提示**：`knowledge-point-index`（表 `zhao_knowledge_point_indices`）与 `zhao-course` 的 knowledge-point 概念有重叠，但表名不冲突。源插件中它是知识点的反向索引表，独立于 zhao-course 的知识点主表，迁移后需确认是否会被 zhao-course 的服务误用。

## 3. 目标文件结构

迁移后 `basic/plugins/zhao-studio/` 结构：

```
zhao-studio/
├── admin/                          [新增]
│   ├── src/
│   │   ├── components/            (16 文件)
│   │   ├── hooks/                 (10 文件)
│   │   ├── pages/                 (11 文件)
│   │   ├── utils/                 (8 文件)
│   │   ├── index.ts               [源: 注册 PluginIcon + addMenuLink]
│   │   └── pluginId.ts
│   ├── custom.d.ts
│   ├── tsconfig.build.json        [新增]
│   └── tsconfig.json              [新增]
├── docs/                           [新增]
│   ├── API手册.md
│   ├── README.md
│   └── 使用手册.md
├── server/
│   └── src/                       [覆盖空骨架]
│       ├── config/index.ts
│       ├── content-types/         (10 子目录, schema.json + index.ts)
│       ├── controllers/           (7 文件)
│       ├── middlewares/index.ts
│       ├── policies/index.ts
│       ├── routes/                (admin.ts, content-api.ts, index.ts)
│       ├── services/              (11 文件)
│       ├── utils/                 (10 文件)
│       ├── bootstrap.ts           [源为空, 保持]
│       ├── destroy.ts
│       ├── index.ts               [覆盖空骨架]
│       ├── permissions.ts
│       └── register.ts
├── tests/                          [新增]
│   ├── controllers/
│   ├── helpers/
│   ├── integration/
│   ├── services/
│   ├── content-types.test.ts
│   ├── jest.config.ts
│   ├── permissions.test.ts
│   └── tsconfig.json
├── .editorconfig                   [新增]
├── .eslintignore                   [新增]
├── .prettierignore                 [新增]
├── .prettierrc                     [新增]
├── README.md                       [新增]
├── package.json                    [保留骨架, 补全 strapi-admin export + peerDeps]
├── strapi-admin.js                 [新增]
├── strapi-server.js                [保留骨架]
└── tsconfig.json                   [保留骨架]
```

### 关键决策

1. **保留骨架的 `package.json` / `tsconfig.json` / `strapi-server.js`**：已对齐 v5 现代格式，仅增量补全
2. **覆盖骨架的 `server/src/index.ts`**：从空 `register/bootstrap/destroy` 替换为完整导入
3. **排除项**：`dist/`、`node_modules/`、`package-lock.json`、`admin/package-lock.json`、`server/package-lock.json`
4. **不复制 `admin/package.json` 和 `server/package.json`**：源用旧构建模式，basic 用根 package.json 统一管理依赖

## 4. package.json 与构建配置适配

### 4.1 package.json 变更（基于骨架补全）

骨架已有现代 `exports`，需补三处：

**1. 新增 `./strapi-admin` export**（项目记忆：缺失会导致 ESM 解析错误）

```json
"./strapi-admin": {
  "types": "./dist/admin/src/index.d.ts",
  "source": "./admin/src/index.ts",
  "import": "./dist/admin/index.mjs",
  "require": "./dist/admin/index.js",
  "default": "./dist/admin/index.js"
}
```

**2. 新增 peerDependencies**（对齐 zhao-wealth 先例 + 源 admin/package.json 依赖）

```json
"peerDependencies": {
  "@strapi/design-system": "^2.2.0",
  "@strapi/icons": "^2.2.0",
  "@strapi/sdk-plugin": "^6.1.0",
  "@strapi/strapi": "^5.45.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.3",
  "styled-components": "^6.4.1"
}
```

**3. 补全 scripts**（加 `watch:link`）

```json
"scripts": {
  "build": "strapi-plugin build",
  "watch": "strapi-plugin watch",
  "watch:link": "strapi-plugin watch:link",
  "verify": "strapi-plugin verify"
}
```

**4. 不引入 dependencies**：源 admin/package.json 仅含 `@strapi/design-system`/`@strapi/icons`/`react` 等，均已在 basic 根 package.json 提供；源 server 无外部依赖（scraper/ai 等服务使用 strapi 内置 + Node 原生模块）。

### 4.2 新增 admin/tsconfig.json

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

### 4.3 新增 admin/tsconfig.build.json

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

### 4.4 新增 strapi-admin.js（根目录）

```js
'use strict';
module.exports = require('./dist/admin');
```

### 4.5 保留骨架 tsconfig.json

骨架的 `tsconfig.json` 仅配置 server（`rootDir: ./server/src`），已是正确格式，**不修改**。

### 4.6 不修改 basic/config/plugins.ts

`zhao-studio` 已在 `basic/config/plugins.ts` 第 113-116 行注册，无需改动。

## 5. 迁移步骤

### 步骤 1：复制目录与文件

排除 `dist/`、`node_modules/`、所有 `package-lock.json`。

| 源（`code/plugins/zhao-studio/`）| 目标（`basic/plugins/zhao-studio/`）| 处理 |
|---|---|---|
| `admin/src/` | `admin/src/` | 全量复制（16+10+11+8 文件 + index.ts + pluginId.ts）|
| `admin/custom.d.ts` | `admin/custom.d.ts` | 复制 |
| `server/src/` | `server/src/` | **覆盖空骨架** |
| `tests/` | `tests/` | 全量复制 |
| `docs/` | `docs/` | 全量复制 |
| `.editorconfig`/`.eslintignore`/`.prettierignore`/`.prettierrc` | 同名 | 复制 |
| `README.md` | `README.md` | 复制 |

### 步骤 2：补全根 `package.json`

- 新增 `./strapi-admin` export
- 新增 `peerDependencies`
- 补全 `scripts`（加 `watch:link`）

### 步骤 3：新增 admin 构建配置

- 新增 `admin/tsconfig.json`
- 新增 `admin/tsconfig.build.json`

### 步骤 4：新增根 `strapi-admin.js`

### 步骤 5：清理源 `server/src/bootstrap.ts`

源为空函数，符合 v5 现代格式，保持不动。

## 6. 风险点与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| **Strapi v5 schema 重建问题** | 启动后表未创建或字段缺失 | 删除 `strapi_database_schema` 表中 `zhao-studio` 相关记录，强制重建 |
| **manyToMany 关系语法不稳定** | 源代码可能用 `{ set: [...] }` 写入 inverse side 失败 | 启动验证时检查 publish-platform/publish-account 关联；若失败，参考项目记忆改用 knex 直写 `_lnk` 表 |
| **db.query manyToMany 过滤不稳定** | service.find 查询失败 | 启动验证时检查 `collect.ts`/`publish.ts` 的关联查询；若失败改用 knex 查中间表 + `$in` |
| **knowledge-point-index 语义重叠** | zhao-course 服务可能误用 | 启动后确认该表独立于 zhao-course 的 knowledge-point；不主动改 zhao-course 代码 |
| **admin ESM 解析失败** | 缺 `strapi-admin` export 报错 | 步骤 4.1 已补全该 export |
| **源代码使用 debug log** | 生产环境打印调试日志 | 启动验证后扫描 `[getAuthUrl]`、`TODO-cleanup` 标记并清理（参考项目记忆 lessons）|
| **tests 依赖 jest 配置** | tests 无法运行 | tests/jest.config.ts 复制后验证；若依赖 basic 根 jest 配置，调整路径 |

## 7. 启动验证清单

执行 `cd basic && npm run develop` 后验证：

1. **插件加载**：日志无 `zhao-studio` 加载错误
2. **表创建**：10 张表（`zhao_article_drafts`/`zhao_collect_sources`/`zhao_collect_tasks`/`zhao_publish_platforms`/`zhao_publish_accounts`/`zhao_publish_records`/`zhao_knowledge_point_indices`/`zhao_ad_slots`/`zhao_browser_logs`/`zhao_stat_summaries`）存在
3. **路由注册**：`GET /api/zhao-studio/v1/admin/...` 与 `content-api` 路由可访问
4. **权限注册**：`plugin::zhao-studio.read/create/update/delete` 4 个 action 已注册
5. **admin 入口**：访问 `/admin/plugins/zhao-studio` 显示内容工作室首页
6. **admin 菜单**：左侧菜单出现"内容工作室"入口
7. **核心服务可用**：
   - `collect.ts` 可创建采集任务
   - `publish.ts` 可创建发布记录
   - `analytics.ts` 可查询统计数据
   - `ai.ts` AI 助手接口可调用（需配置 AI provider）
8. **关联关系**：publish-platform 与 publish-account 的 manyToMany 可正常读写
9. **debug log 清理**：grep 源码无 `[getAuthUrl]` 等遗留 debug 日志
10. **tests 通过**：`cd basic/plugins/zhao-studio && npx jest` 主流程测试通过（允许部分集成测试因环境差异跳过）。注意：basic 根 package.json 无 jest 依赖，需先在插件目录通过 tests/jest.config.ts 自带配置或 `npx --yes jest` 拉取一次性运行；正式集成测试留待后续阶段

### 验收口径

- 启动验证清单 1-6 项必须通过（核心可用性）
- 7-8 项需手动触发一次操作确认（功能验证）
- 9 项是代码质量检查
- 10 项 tests 是软性指标，允许集成测试因 basic 环境差异（如数据库表名、其他插件依赖）跳过

## 8. 后续阶段（不在本次范围）

- **Ant Design 重写**：admin 重构 11-Task 计划中的 zhao-studio 部分，将 `@strapi/design-system` 替换为 Ant Design + antd-charts
- **Strapi v5 兼容性修复**：启动验证阶段发现的问题，按项目记忆中的 v5 适配模式逐项修复
- **数据库迁移脚本**：若 schema 变更需要，按 `server/database/migrations/` + 3 位版本前缀 + zhao-common bootstrap 执行模式
