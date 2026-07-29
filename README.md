# 📦 项目构建说明

> **构建策略**：本地构建成功后上传仓库，服务器直接 `git pull` 拉取构建产物。

**原因**：服务器内存不足，无法在服务器上执行 `npm run build`（构建过程中会因内存溢出失败）。

**本地构建流程**：

```bash
# 1. 安装依赖
npm install

# 2. 构建所有插件（zhao-sso、zhao-channel 等）
#    Windows:  powershell -File scripts\build-plugins.ps1
#    Linux/Mac: bash scripts/build-plugins.sh

# 3. 构建 Strapi 主项目（含 Admin 前端）
#    内存充裕时直接构建；内存紧张时调大 Node 堆
NODE_OPTIONS=--max-old-space-size=8192 npm run build

# 4. 提交构建产物到仓库
git add dist/ build/ plugins/*/dist/
git commit -m "build: 构建产物"
git push origin main
```

**服务器部署流程**：

```bash
cd /www/apps/strapi
git pull origin main
npm install --production   # 仅装运行依赖，不重新构建
pm2 restart strapi
pm2 logs strapi --lines 30
```

> 注：`.gitignore` 已放行 `dist/`、`build/`、`plugins/*/dist/`，构建产物会被提交到仓库。

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
