# 快速安装指引

## 前置条件

- 阿里云服务器 2G 内存 / 40G 磁盘
- 已安装 1Panel，通过 1Panel 应用商店安装 PostgreSQL 和 Redis
- 服务器已安装 Node.js >= 20（通过 nvm 或 1Panel 应用商店）
- 能够访问 GitHub（git@github.com:johocn/ 仓库需要 SSH 密钥）
- 已购买域名并解析到服务器 IP（api/shop-api/www/shop/cross/course 共 6 个子域名）

## 快速安装

```bash
# 1. 将 install.sh 上传到服务器
scp scripts/install.sh root@你的服务器IP:/opt/joho/

# 2. 登录服务器执行
ssh root@你的服务器IP
cd /opt/joho
chmod +x install.sh
./install.sh
```

脚本会依次：
1. 检查 Node.js/npm/Git/Docker 环境
2. 创建目录 /opt/joho/
3. 提示配置 SSH 密钥（如果未配置）
4. 克隆 6 个仓库（strapi/vendure/vshop/shop/site/dsite）
5. 安装生产依赖（npm ci --production）
6. 生成 .env 模板（需要手动编辑填写密钥）
7. PM2 启动 Strapi 和 Vendure

## 1Panel 网站配置

安装脚本执行完毕后，在 1Panel 面板中创建 6 个网站站点：

| 域名 | 类型 | 目标 |
|------|------|------|
| api.joho.cn | 反向代理 | http://127.0.0.1:1337 |
| shop-api.joho.cn | 反向代理 | http://127.0.0.1:3000 |
| www.joho.cn | 静态文件 | /opt/joho/dsite/dist/ |
| shop.joho.cn | 静态文件 | /opt/joho/shop/dist/ |
| cross.joho.cn | 静态文件 | /opt/joho/vshop/dist/ |
| course.joho.cn | 静态文件 | /opt/joho/site/dist/ |

创建步骤：
1. 打开 1Panel → 网站 → 创建网站
2. 选择对应类型（反向代理 或 静态文件）
3. 填写域名
4. 静态文件选择根目录
5. 反向代理填写目标地址
6. 1Panel 自动申请 SSL 证书

## 日常维护

### 更新代码

```bash
# Strapi
cd /opt/joho/strapi && git pull && npm ci --production --ignore-scripts && pm2 restart strapi

# Vendure
cd /opt/joho/vendure && git pull && npm ci --production --ignore-scripts && pm2 restart vendure

# 前端（需要先本地构建）
cd /opt/joho/vshop && git pull && pm2 restart vshop   # 如果前端用 PM2
# 或通过 1Panel 上传 dist 文件
```

### 查看运行状态

```bash
pm2 status                    # 查看所有进程状态
pm2 logs strapi --lines 50    # 查看 Strapi 日志
pm2 monit                     # 实时监控内存/CPU
```

### 日志路径

```
/var/log/joho/strapi-error.log
/var/log/joho/strapi-out.log
/var/log/joho/vendure-error.log
/var/log/joho/vendure-out.log
```

### 本地构建后部署（Strapi 后端）

```bash
# 本地执行（Windows 环境 E:\code\basic\）
build-prod.bat

# 构建成功后推送
git add -A .
git commit -m "build: rebuild for deploy"
git push strapi main

# 服务器更新
ssh root@服务器
cd /opt/joho/strapi && git pull && npm ci --production --ignore-scripts && pm2 restart strapi
```

## 注意事项

- 2G 内存限制：Strapi 配置了 --max-old-space-size=800，Vendure 配置了 600，勿调大
- 数据库连接池已优化为 min:1 max:5，生产环境足够
- Docker 仅用于 PostgreSQL 和 Redis，Strapi 和 Vendure 通过 PM2 直接运行
- 首次启动如果访问慢属正常，Node.js 需要预热
