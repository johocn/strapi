# 📦 项目构建说明

> **构建策略**：本地构建成功 → 上传 → 服务器 `pm2 restart`。**绝不在服务器构建/安装依赖**（服务器内存 2G 不足，构建/安装会失败或 OOM）。

**产物分两类、两种交付路径**：

| 产物 | 内容 | 交付方式 |
|---|---|---|
| 根 `dist/` | 后端编译（config/plugins/src）+ Admin 前端（build/~80MB） | `scripts/deploy.mjs` scp 上传 |
| `plugins/*/dist/` | 插件编译产物（zhao-sso 等，体积小） | git 提交 → 服务器 `git pull` |

> `.gitignore`：根 `dist/`、`build/` 忽略（上传流程单发，不入库）；`!plugins/*/dist/` 放行（插件产物随 git 拉取）。

**一次完整部署**：

```bash
# 1. 构建插件（改到 zhao-sso 等插件源码后）：Windows 用 build-plugins.ps1，Linux/Mac 用 build-plugins.sh
powershell -File scripts\build-plugins.ps1      # Windows

# 2. 构建 Strapi 主项目（含 Admin 前端）+ 提交插件产物
npm install
NODE_OPTIONS=--max-old-space-size=8192 npm run build
git add plugins/*/dist/                        # 只提交插件产物，根 dist/ 不入库
git commit -m "build: 插件构建产物"
git push origin main

# 3. 一键部署（构建 + 上传根 dist/ + 服务器重启，见 scripts/deploy.mjs 头部环境变量说明）
node scripts/deploy.mjs
```

**只看存量/不想重新构建时**（复用本地已有 dist）：

```bash
SKIP_BUILD=1 node scripts/deploy.mjs   # 仅上传 + 重启
SKIP_RESTART=1 node scripts/deploy.mjs # 仅构建 + 上传，不重启
```

> 部署参数从 `.env` 底部「部署配置」段读取（`SERVER_HOST=qing` 等，qing 为 ssh 别名，含 User/Port/IdentityFile）。服务器进程由 `ecosystem.config.cjs` 管理（`npm run start`，堆 384MB）。

---

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
