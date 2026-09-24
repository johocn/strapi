# strapi-site Next.js C 端官网开发环境搭建 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `e:\code\strapi-site` 手工搭建 Next.js（App Router + TS + 纯 CSS）最小工程，并打通本地开发链路：`next dev :3000` → 代理 `/api/*` → 本机 basic（`:1337`）zhao-website content-api → postgres。

**Architecture:** Next 侧请求同源路径 `/api/zhao-website/v1/*`，由 `next.config.ts` rewrites 代理到 `localhost:1337/api/*`（对齐 dsite 的 devProxy 模式）。站点识别走 zhao-common 的 site-resolver：Host 剥离端口后匹配 `zhao_site_configs.domain`，本地 seed `domain=localhost` 记录。SEO 文件 `sitemap.xml`/`robots.txt`/`llms.txt` 由 Strapi 生成，Next 反代。

**Tech Stack:** Next.js（App Router）、TypeScript、纯 CSS（无 Tailwind/组件库）、npm、Strapi 5（basic）、PostgreSQL 16（本机）。

**参考文档：**
- Spec: `e:\code\docs\superpowers\specs\2026-09-06-strapi-site-next-cend-env-design.md`
- dsite 代理模式: `e:\code\dsite\nuxt.config.ts`（devProxy `/api` → `localhost:1337/api`，routeRules 反代 sitemap/robots/llms）
- 站点识别: `e:\code\basic\plugins\zhao-common\server\src\middlewares\site-resolver.ts`（query.domain → x-site-domain → host，端口剥离后匹配 domain）
- site-config 表: `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`（collectionName `zhao_site_configs`，draftAndPublish=false）
- content-api: `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\article.ts`（featured 返回数组或 `{results}`）

---

### Task 1: 启动本机 postgres

**Files:** 无

- [ ] **Step 1: 启动 postgres 服务并确认 5432 监听**

PowerShell（可能需管理员权限；若拒绝，用管理员终端执行同一命令）:

```powershell
Start-Service postgresql-x64-16
Get-Service postgresql-x64-16 | Select-Object Name, Status
```

Expected: `Status = Running`

若 `Start-Service` 报 access denied（服务启动需要提权），改用管理员 PowerShell 执行，或手动在 services.msc 启动 `postgresql-x64-16`，然后继续。

- [ ] **Step 2: 确认 5432 端口可达**

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 | Select-Object TcpTestSucceeded
```

Expected: `TcpTestSucceeded = True`

- [ ] **Step 3: 确认本地 strapi 库存在**

```powershell
$env:PGPASSWORD='admin'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres -h 127.0.0.1 -d strapi -c '\l' | Select-String 'strapi'
```

Expected: 输出包含 `strapi` 库。若库不存在，`createdb` 建库后继续。

---

### Task 2: 初始化 strapi-site 最小 Next.js 工程

**Files:**
- Create: `e:\code\strapi-site\package.json`
- Create: `e:\code\strapi-site\tsconfig.json`
- Create: `e:\code\strapi-site\next-env.d.ts`
- Create: `e:\code\strapi-site\next.config.ts`
- Create: `e:\code\strapi-site\.env.local`
- Create: `e:\code\strapi-site\.gitignore`
- Create: `e:\code\strapi-site\app\layout.tsx`
- Create: `e:\code\strapi-site\app\page.tsx`
- Create: `e:\code\strapi-site\app\globals.css`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "strapi-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

（依赖通过 `npm install` 步骤写入，避免版本号拍脑袋。）

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 写 next-env.d.ts**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 4: 写 next.config.ts（dev 代理）**

```ts
import type { NextConfig } from "next";

const API_UPSTREAM = "http://localhost:1337/api";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_UPSTREAM}/:path*` },
      { source: "/sitemap.xml", destination: `${API_UPSTREAM}/zhao-website/v1/sitemap.xml` },
      { source: "/robots.txt", destination: `${API_UPSTREAM}/zhao-website/v1/robots.txt` },
      { source: "/llms.txt", destination: `${API_UPSTREAM}/zhao-website/v1/llms.txt` },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 5: 写 .env.local**

```
NEXT_PUBLIC_API_BASE=/api/zhao-website/v1
```

- [ ] **Step 6: 写 .gitignore**

```
node_modules/
.next/
out/
*.tsbuildinfo
.env*.local
```

- [ ] **Step 7: 写 app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "strapi-site",
    template: "%s | strapi-site",
  },
  description: "zhao-site C 端官网（Next.js）",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: 写 app/globals.css**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  color: #1f2937;
  background: #ffffff;
  line-height: 1.6;
}

.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
}

.hero {
  padding: 48px 0 32px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 32px;
}

.hero h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.hero p {
  color: #6b7280;
}

.articles h2 {
  font-size: 20px;
  margin-bottom: 16px;
}

.articles ul {
  list-style: none;
}

.articles li {
  padding: 8px 0;
  border-bottom: 1px dashed #e5e7eb;
}

.articles a {
  color: #2563eb;
  text-decoration: none;
}

.articles a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 9: 写 app/page.tsx（环境验证首页）**

```tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

type SiteInfo = {
  siteName: string;
  siteDescription: string;
  domain: string;
};

type Article = {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/zhao-website/v1";

async function getSiteInfo(): Promise<SiteInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/site-info`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getFeaturedArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/articles/featured`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [site, articles] = await Promise.all([
    getSiteInfo(),
    getFeaturedArticles(),
  ]);

  return (
    <main className="home">
      <header className="hero">
        <h1>{site?.siteName ?? "strapi-site"}</h1>
        <p>{site?.siteDescription ?? "环境验证页：未获取到站点配置"}</p>
      </header>
      <section className="articles">
        <h2>精选资讯</h2>
        {articles.length === 0 ? (
          <p>暂无精选文章（或本地库未录入内容）</p>
        ) : (
          <ul>
            {articles.map((a) => (
              <li key={a.id ?? a.documentId}>
                <Link href={`/articles/${a.slug}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 10: npm install（取当前 stable，React 19 配套）**

Run（cwd = `e:\code\strapi-site`）:

```bash
npm install next react react-dom
npm install -D typescript @types/node @types/react @types/react-dom
```

Expected: `added <n> packages`，无 error。此时 `package.json` 的 dependencies/devDependencies 已写入真实版本。

- [ ] **Step 11: 类型校验**

Run: `npx tsc --noEmit`
Expected: 退出码 0，无报错（若 `next-env.d.ts` 与 `next` 类型有歧义，可先 `npx next build` 生成 `.next/types` 后再跑一次）。

- [ ] **Step 12: 构建校验（不依赖 API 也能成功）**

Run: `npm run build`
Expected: 编译通过，`/` 路由成功 prerender（首页请求时拉 API，构建时 fetch 失败返回 null/[]，属预期）。

- [ ] **Step 13: 提交**

```bash
git add strapi-site
git commit -m "feat(strapi-site): Next.js 最小工程（App Router+TS+纯CSS）与 /api 开发代理"
```

---

### Task 3: 启动 basic dev（:1337）并确认 site-config

**Files:** 无（可能临时 seed SQL）

- [ ] **Step 1: 后台启动 basic dev**

Run（cwd = `e:\code\basic`，后台运行）:

```bash
npm run develop
```

Expected: 日志出现 `Server started` / `http://localhost:1337`，后台持续运行。

- [ ] **Step 2: 确认 :1337 健康检查**

```bash
Invoke-WebRequest -Uri http://localhost:1337/_health -UseBasicParsing -TimeoutSec 10
```

Expected: 200（body 为 `{"status":"ok"}`）。首次启动构建较慢，等待即可。

- [ ] **Step 3: 检查 zhao_site_configs 表是否有 domain=localhost**

```powershell
$env:PGPASSWORD='admin'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres -h 127.0.0.1 -d strapi -c "SELECT document_id, site_name, domain FROM zhao_site_configs WHERE domain = 'localhost';"
```

Expected 任一：
- 有记录 → 跳过 Step 4。
- 无输出/表不存在 → 执行 Step 4（表应在 basic 首次启动时由插件 schema 创建）。

- [ ] **Step 4: seed domain=localhost 站点记录（仅当上一步无命中）**

```powershell
$env:PGPASSWORD='admin'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres -h 127.0.0.1 -d strapi -c "INSERT INTO zhao_site_configs (document_id, site_name, site_description, domain, channel_usage, feature_flags, module_visibility, extra_config, theme_config, speed_privileged_roles, created_at, updated_at) VALUES ('localhost', '圣麟教育', '本地开发环境验证站点', 'localhost', 'site_cross_user', '{\"sso\":false,\"points\":true,\"quiz\":true,\"course\":true,\"channel\":true,\"thirdParty\":true,\"oss\":false,\"website\":true,\"logistics\":true,\"studio\":true}', '{}', NULL, '{}', '[\"admin\"]', now(), now()) ON CONFLICT (document_id) DO NOTHING;"
```

Expected: `INSERT 0 1`（或 `INSERT 0 0` 表示已存在）。

- [ ] **Step 5: 直连验证 content-api**

```powershell
Invoke-WebRequest -Uri "http://localhost:1337/api/zhao-website/v1/site-info" -UseBasicParsing -TimeoutSec 10 | Select-Object -ExpandProperty Content
```

Expected: JSON 包含 `"siteName":"圣麟教育"`。

---

### Task 4: next dev（:3000）端到端验证并收尾

**Files:** 无

- [ ] **Step 1: 后台启动 next dev**

Run（cwd = `e:\code\strapi-site`，后台运行）:

```bash
npm run dev
```

Expected: 日志出现 `Ready in <s>` 与 `Local: http://localhost:3000`。

- [ ] **Step 2: 验证代理链路**

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/zhao-website/v1/site-info" -UseBasicParsing -TimeoutSec 10 | Select-Object -ExpandProperty Content
```

Expected: 与 Task 3 Step 5 相同 JSON（`"siteName":"圣麟教育"`），证明 rewrites 代理通。

- [ ] **Step 3: 验证首页渲染**

```powershell
(Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10).Content | Select-String '圣麟教育'
```

Expected: 命中 `圣麟教育`（站点标题已注入 HTML）。

- [ ] **Step 4: 收尾确认三个端均在运行**

```powershell
Get-Service postgresql-x64-16 | Select-Object Status
(Invoke-WebRequest -Uri http://localhost:1337/_health -UseBasicParsing -TimeoutSec 5).StatusCode
(Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 5).StatusCode
```

Expected: `Running` / `200` / `200`。

---

## Self-Review

**1. Spec 覆盖：**
- 启动 postgres → Task 1 ✓
- seed site-config(domain=localhost) → Task 3 Step 3/4 ✓
- basic dev(:1337) → Task 3 ✓
- strapi-site 最小工程（package/tsconfig/next-env/next.config/layout/page/globals/.env.local/.gitignore）→ Task 2 ✓
- rewrites 代理 /api/* + sitemap/robots/llms → Task 2 Step 4 ✓
- 验证标准（_health 200 / 代理 JSON / 首页渲染站点标题）→ Task 3 Step 2+5、Task 4 Step 2+3 ✓

**2. 占位符扫描：** 全部步骤含具体命令与完整代码，无 TBD/TODO。seed SQL 使用显式 JSON 值避免依赖列默认值。

**3. 类型一致性：** `API_BASE`（page.tsx 内）与 `.env.local` 的 `NEXT_PUBLIC_API_BASE=/api/zhao-website/v1` 一致；`SiteInfo` 字段与 site-info 控制器输出（siteName/siteDescription/domain）一致；`Article` 兼容 service 返回的数组或 `{results}` 两种形态。
