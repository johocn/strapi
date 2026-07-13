# Strapi 本地构建 + Git 部署设计

## 背景

Strapi 项目部署在内存不足的服务器上，`npm run build` 和插件构建会触发 OOM Killer 导致进程被杀。服务器可以正常 `npm install`，仅构建步骤会 OOM。

需要一种部署方案：本地完成所有构建，通过 Git 提交构建产物，服务器拉取后直接运行，完全避免在服务器上执行构建。

## 目标

- 服务器零构建：`git pull` → `npm install` → `pm2 restart`，不执行任何 build 命令
- 本地一键构建：运行一个脚本完成依赖检查、插件构建、Strapi 构建
- 构建产物通过 Git 提交，服务器拉取后直接可用
- 保持现有 `.gitignore` 配置（已允许构建产物提交）

## 架构

```
本地 (Windows)                          服务器 (Linux)
┌───────────────────────────┐          ┌───────────────────────────┐
│ 1. npm install (如需要)    │          │ 1. git pull origin main    │
│ 2. build-prod.bat          │   Git    │ 2. npm install --legacy-   │
│    ├─ 构建所有插件         │ ──────> │    peer-deps               │
│    └─ 构建 Strapi          │  push    │ 3. pm2 restart strapi      │
│ 3. git add 构建产物        │  pull    │    (无构建步骤)             │
│ 4. git commit + push      │          │                            │
└───────────────────────────┘          └───────────────────────────┘
```

## 组件设计

### 1. 本地构建脚本 `build-prod.bat`

优化现有脚本，增加依赖自动检查：

**职责**：检查 node_modules 是否存在 → 构建所有插件 → 构建 Strapi 主项目 → 提示 git 提交命令

**输入**：无（自动检测依赖）

**输出**：`dist/`、`build/`、`plugins/zhao-*/dist/` 目录填充构建产物

**依赖**：Node.js >= 20、npm、项目 package.json 中的依赖

**关键逻辑**：
- 检查 `node_modules` 目录是否存在，不存在则先执行 `npm install --legacy-peer-deps`
- 设置 `NODE_OPTIONS=--max-old-space-size=8192` 确保构建内存充足
- 调用 `scripts\build-plugins.ps1` 构建所有 zhao-* 插件
- 调用 `npm run build` 构建 Strapi 主项目（TypeScript 编译 + Admin 面板）
- 构建失败时退出码非 0，阻止后续提交

### 2. 服务器部署脚本 `deploy.sh`

简化现有脚本，移除所有构建步骤：

**职责**：拉取最新代码 → 安装/更新依赖 → 重启 PM2 进程

**输入**：无（从 Git 远程拉取）

**输出**：Strapi 服务重启完成

**依赖**：Git、npm、PM2、已配置的 `.env` 文件

**关键逻辑**：
- `git pull origin main` 拉取最新代码（含构建产物）
- `npm install --legacy-peer-deps` 安装/更新依赖
- `pm2 restart strapi` 重启服务
- 任何步骤失败则立即退出（`set -e`）

**对比旧流程**：
| 步骤 | 旧流程 | 新流程 |
|------|--------|--------|
| git pull | 有 | 有 |
| npm install | 有 | 有 |
| build-plugins.sh | 有（OOM） | 移除 |
| npm run build | 有（OOM） | 移除 |
| pm2 restart | 有 | 有 |

### 3. 服务器首次部署流程

```bash
cd /home/admin
git clone -b main git@github.com:johocn/strapi.git strapi
cd strapi
cp .env.example .env  # 编辑 .env：配置数据库、Redis、secrets
npm install --legacy-peer-deps
pm2 start npm --name "strapi" -- start
pm2 save && pm2 startup
```

### 4. `.gitignore` 配置

当前配置已正确，无需修改：

```gitignore
# Strapi 默认忽略构建产物
build/

# 服务器内存不足，允许构建产物提交
!dist/
!build/
!plugins/*/dist/
```

### 5. 文档更新

#### `INSTALL.md` 更新点

- "服务器部署完整流程"部分：移除步骤 5（构建插件）和步骤 6（构建 Strapi），替换为说明"构建产物已包含在仓库中，服务器无需构建"
- Q2 "构建产物缺失"：更新解答为"构建产物已提交到仓库，git pull 后即可直接使用"
- Q7 "npm install 被杀死"：保留但补充说明"构建已在本地完成，服务器只需安装依赖"

#### `DEPLOYMENT.md` 更新点

- "4.2 构建 Strapi"部分：移除，替换为"构建产物已包含在 Git 仓库中，无需服务器构建"

## 构建产物清单

| 目录 | 内容 | 来源脚本 | 说明 |
|------|------|----------|------|
| `dist/` | TypeScript 编译输出 | `npm run build` | Strapi 服务端代码 |
| `build/` | Admin 面板前端 | `npm run build` | 管理后台 UI |
| `plugins/zhao-*/dist/` | 插件编译输出 | `build-plugins.ps1` | 14 个自定义插件 |

## 日常工作流

### 发布更新

```bash
# 本地（Windows）
cd d:\zhao\strapi
build-prod.bat                    # 构建所有产物
git add dist build plugins/*/dist
git commit -m "build: production build"
git push origin main

# 服务器（Linux）
cd /home/admin/strapi
./deploy.sh                       # pull + install + restart
```

### 服务器操作

```bash
# 查看日志
pm2 logs strapi --lines 100

# 手动重启
pm2 restart strapi

# 查看状态
pm2 status
```

## 验证方案

1. **本地构建验证**：构建完成后，检查 `dist/`、`build/`、`plugins/zhao-*/dist/` 目录非空
2. **Git 提交验证**：`git status` 确认构建产物已被跟踪
3. **服务器拉取验证**：`git pull` 后检查构建产物目录存在且有内容
4. **服务启动验证**：`pm2 logs strapi` 无报错，访问 `http://localhost:1337/admin` Admin 面板正常加载
5. **插件加载验证**：检查启动日志中各插件正常加载（zhao-auth、zhao-channel 等）

## 回滚方案

- 服务器执行 `git checkout HEAD~1` 回到上个版本
- 执行 `pm2 restart strapi` 重启服务
- 如需回滚依赖：`npm install --legacy-peer-deps` 重新安装

## 需要修改的文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `build-prod.bat` | 优化 | 增加依赖自动检查，构建失败时阻止提交 |
| `deploy.sh` | 简化 | 移除 build-plugins.sh 和 npm run build 步骤 |
| `INSTALL.md` | 更新 | 服务器部署部分移除构建步骤，更新 FAQ |
| `DEPLOYMENT.md` | 更新 | 同步更新部署说明 |

## 约束与假设

- 本地 Windows 环境有足够的内存（>= 8GB）完成构建
- 服务器已安装 Node.js >= 20、npm、PM2、Git
- 服务器已配置 PostgreSQL 和 Redis
- 服务器已配置 SSH 密钥访问 GitHub 仓库
- `.env` 文件已在服务器上配置完成（不提交到仓库）
