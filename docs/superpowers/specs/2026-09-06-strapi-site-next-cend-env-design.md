# strapi-site Next.js C 端官网开发环境搭建设计

> 日期：2026-09-06
> 范围：仅环境+框架搭通；只做 zhao-website 插件（zhao-site）的 C 端官网；其余事项等待决策

***

## 一、背景与目标

### 1.1 现状

- **C 端官网现状**：`e:\code\dsite`（Nuxt 3 SSR，16 个页面：首页/产品/文章/案例/FAQ/教程/合规/下载/关于/联系），纯 CSS 极简依赖，数据源为 basic 的 zhao-website 插件公开 API `/api/zhao-website/v1/*`，多租户按域名识别（`site-config.domain` 匹配 Host）。

- **后端**：`e:\code\basic`（Strapi 5），本机依赖已装（`node_modules`、`dist` 存在），本机 postgres `postgresql-x64-16` 服务存在但当前 Stopped，`:1337` 未运行。

- **`e:\code\strapi-site`**：空目录，属于 `e:\code` 主仓库，无独立 package.json。

- **本机环境**：Node v20.19.6、npm 10.8.2；根目录 `e:\code` 的 package.json 声明 `packageManager=yarn@1.22.22`（corepack 会拦截 strapi-site 外的 pnpm/yarn 指令）。

### 1.2 目标

在 `e:\code\strapi-site` 用 Next.js（App Router + TypeScript + 纯 CSS）手工搭建最小工程，完成本地开发环境：`next dev :3000` 可运行、可连通本地 basic（`:1337`）的 zhao-website content-api。本次不做页面迁移。

### 1.3 已确认决策

| 项      | 决策                                      |
| ------ | --------------------------------------- |
| 范围     | 仅环境+框架搭通                                |
| API 目标 | 本地 basic（`localhost:1337`）              |
| 工程形态   | App Router + TS + 纯 CSS（无 Tailwind/组件库） |
| 脚手架    | 手工最小工程（方案 B）                            |
| 包管理器   | npm                                     |

***

## 二、环境拓扑

```
浏览器 → next dev :3000（App Router + TS + 纯 CSS）
           └─ next.config rewrites  /api/*  →  http://localhost:1337/api/*
                                                     ↓
        basic（Strapi dev）:1337  ←── postgres（本机 strapi 库）
                                                     └─ zhao-website content-api：/api/zhao-website/v1/*
```

- Next 侧请求 `/api/zhao-website/v1/*`（同源路径，与 dsite 的 `apiBase` 一致），由 `next.config.ts` 的 rewrites 代理到 `localhost:1337/api/*`，同源免 CORS。

- SEO 静态文件 `sitemap.xml`、`robots.txt`、`llms.txt` 由 Strapi 生成，Next 通过 rewrites 反代（对齐 dsite 的 routeRules 代理）。

***

## 三、工程骨架（strapi-site）

| 文件                | 内容                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`    | 7 个依赖：`next`、`react`、`react-dom`、`typescript`、`@types/node`、`@types/react`、`@types/react-dom`；scripts：`dev`、`build`、`start`、`lint`（可选去掉） |
| `tsconfig.json`   | 引用 `next-env.d.ts`，`@/*` 路径别名指向根目录                                                                                                       |
| `next-env.d.ts`   | Next 自动生成的类型声明（tsc/dev 首启生成，随仓库提交）                                                                                                       |
| `next.config.ts`  | dev rewrites：`/api/:path*` → `localhost:1337/api/:path*`；`/sitemap.xml`、`/robots.txt`、`/llms.txt` → Strapi 对应端点                          |
| `app/layout.tsx`  | `lang="zh-CN"`、viewport、charset meta                                                                                                     |
| `app/page.tsx`    | 最小验证页：拉取 `site-info` + 精选文章（`articles/featured`）并渲染，用于验证链路                                                                               |
| `app/globals.css` | 最小全局样式（延续 dsite 的简洁风格，不引入框架）                                                                                                             |
| `.env.local`      | `NEXT_PUBLIC_API_BASE=/api/zhao-website/v1`（同源路径）                                                                                        |
| `.gitignore`      | `node_modules/`、`.next/`、`.env*.local` 等                                                                                                 |

**依赖版本约束**：取 npm 当前 stable 的 `next@latest`（React 19 配套），Node 20 兼容。

***

## 四、联调链路（4 步）

1. 启动本机 `postgresql-x64-16` 服务。
2. 检查本地 strapi 库 `site-config` 表是否有 `domain=localhost` 记录；无则 seed 一条（供域名识别）。
3. 在 `e:\code\basic` 启动 Strapi dev（`:1337`）。
4. 在 `e:\code\strapi-site` 启动 `next dev`（`:3000`），首页验证通过。

### 验证标准

- `GET localhost:1337/_health` → 200

- `GET localhost:3000/api/zhao-website/v1/site-info` → JSON（代理链路通）

- `GET localhost:3000` → 首页渲染出站点标题与精选文章列表

***

## 五、风险点与对策

| 风险                                              | 对策                                                   |
| ----------------------------------------------- | ---------------------------------------------------- |
| 本地 strapi 库为空或缺 `site-config(domain=localhost)` | 启动 basic 前确认/seed site-config，否则 site-info 404       |
| basic dev 首次启动构建较慢                              | 属正常现象，等待即可                                           |
| redis 未启动                                       | zhao-channel 的 redis 仅在队列任务内使用，非启动硬依赖，不阻塞本环境         |
| corepack 干扰（根目录 yarn packageManager）            | strapi-site 自建 `package.json` 后用 npm，不触发 corepack 冲突 |

***

## 六、后续（本次不做）

- 16 个页面的逐个迁移（以 dsite 页面结构与 composables 为输入）

- 生产部署形态（Node SSR/pm2 或静态导出，域名归属）

- 多租户域名的生产映射

