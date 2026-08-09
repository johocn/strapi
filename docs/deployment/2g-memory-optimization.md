# 2G 服务器内存调优方案

> 适用环境：总内存 2G 的云服务器，需同时运行 1Panel、PostgreSQL、Redis、Strapi、Vendure 等多服务。
> 更新日期：2026-08-10

---

## 一、内存分配总览

2G（2048MB）内存需精打细算，各服务预估分配如下：

| 服务 | 预估内存 | 说明 |
|------|---------|------|
| 系统（内核 + 文件缓存） | ~200MB | Linux 基础开销，无法压缩 |
| 1Panel 面板 | ~100MB | Go 程序，内存固定 |
| PostgreSQL | ~150MB | 调优后（默认可能 300MB+） |
| Redis | ~50MB | 限制 maxmemory 64MB |
| Vendure (Node.js) | ~350MB | 限制 V8 堆 256MB |
| Strapi (Node.js) | ~400MB | 限制 V8 堆 384MB |
| 剩余 buffer | ~300MB | 系统文件缓存、突发峰值 |
| **合计** | **~1550MB** | 留 ~500MB 余量 |

> 如果不运行 Vendure，可将 Strapi 堆限制提升到 512MB。

---

## 二、Strapi PM2 配置

配置文件：项目根目录 `ecosystem.config.cjs`

```js
module.exports = {
  apps: [
    {
      name: 'strapi',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      // 限制 Node.js V8 堆内存上限为 384MB
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
        // 抑制 pg 模块弃用警告输出到 stderr（非致命，不影响功能）
        NODE_NO_WARNINGS: '1',
        // 数据库连接池保持小而精，减少内存占用
        DATABASE_POOL_MIN: '1',
        DATABASE_POOL_MAX: '3',
      },
      // PM2 内存阈值，超过 500M 自动重启（含 V8 堆 + C++ 层 + 缓存）
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
    },
  ],
};
```

### 参数说明

| 参数 | 值 | 作用 |
|------|---|------|
| `node_args: --max-old-space-size=384` | 384MB | 限制 V8 堆内存，Node.js 会在接近上限时更积极地 GC |
| `DATABASE_POOL_MAX=3` | 3 | 每个连接约 5-10MB，3 个连接最多 30MB |
| `DATABASE_POOL_MIN=1` | 1 | 最小保持 1 个连接，减少空闲连接内存 |
| `max_memory_restart: 500M` | 500MB | PM2 监控的 RSS 内存上限（含堆 + C++ 层） |
| `NODE_NO_WARNINGS=1` | 1 | 抑制 `pg` 模块 `DeprecationWarning` 输出到 stderr |

### 为什么不设更小？

- V8 堆低于 256MB 会导致 Strapi 频繁 GC 甚至 OOM 崩溃
- 连接池低于 2 会导致并发请求排队等待数据库连接
- `max_memory_restart` 需略大于 `--max-old-space-size` + Node.js 基础开销（约 100MB）

### 为什么不用 `pm2 restart` 更新配置？

`pm2 restart` 不会重新加载 `ecosystem.config.cjs` 中的环境变量和 `node_args` 变更。必须用 `pm2 delete` + `pm2 start`。

---

## 三、PostgreSQL 调优

### 3.1 定位配置文件

```bash
# 方法1：通过 psql 查询
sudo -u postgres psql -c 'SHOW config_file;'

# 方法2：常见路径
# CentOS/RHEL: /var/lib/pgsql/data/postgresql.conf
# Ubuntu/Debian: /etc/postgresql/<version>/main/postgresql.conf
# 1Panel 安装: 在 1Panel 面板中编辑
```

### 3.2 推荐配置（2G 服务器）

```ini
# ============ 内存相关 ============
# PostgreSQL 共享缓冲区，建议为总内存的 15%-25%
shared_buffers = 32MB

# 每个查询的排序/哈希内存（按连接分配，不宜过大）
work_mem = 2MB

# 维护操作（VACUUM、CREATE INDEX）的内存
maintenance_work_mem = 16MB

# 查询计划缓存内存
effective_cache_size = 256MB

# ============ 连接数 ============
# 2G 服务器不宜太多连接，每个连接约 5-10MB
max_connections = 30

# ============ WAL 日志 ============
# 减少 WAL 写入量
wal_buffers = 4MB
checkpoint_completion_target = 0.7
max_wal_size = 256MB

# ============ 自动清理 ============
# 保持默认即可，避免过多 autovacuum 进程消耗内存
autovacuum_max_workers = 2
```

### 3.3 应用并重启

```bash
# 重启 PostgreSQL
sudo systemctl restart postgresql

# 验证配置生效
sudo -u postgres psql -c 'SHOW shared_buffers; SHOW work_mem; SHOW max_connections;'
```

---

## 四、Redis 调优

### 4.1 定位配置文件

```bash
# 常见路径
# /etc/redis/redis.conf
# 1Panel 安装: 在 1Panel 面板中编辑
```

### 4.2 推荐配置

```ini
# 限制 Redis 最大内存为 64MB
maxmemory 64mb

# 内存满时淘汰策略：LRU 淘汰最少使用的 key
maxmemory-policy allkeys-lru

# 关闭 RDB 持久化（减少磁盘 IO 和内存开销，如不需要持久化）
# save ""

# 如需持久化，仅保留一条规则
save 3600 1

# 关闭 AOF（减少磁盘写入）
appendonly no
```

### 4.3 应用并重启

```bash
sudo systemctl restart redis

# 验证
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
```

---

## 五、Vendure 调优

如果 Vendure 也通过 PM2 管理，在其 `ecosystem.config.cjs` 中添加：

```js
module.exports = {
  apps: [
    {
      name: 'vendure',
      script: 'node',
      args: 'dist/index.js',
      cwd: '/home/admin/vendure',
      // 限制 V8 堆 256MB
      node_args: '--max-old-space-size=256',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
    },
  ],
};
```

---

## 六、Swap 交换分区（强烈建议）

2G 物理内存紧张，建议创建 2G Swap 作为兜底，防止 OOM 杀死进程：

```bash
# 检查是否已有 swap
swapon --show

# 如没有，创建 2G swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 开机自动挂载
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 调低 swappiness（优先用物理内存，仅在紧张时用 swap）
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# 验证
free -h
```

---

## 七、验证与监控

### 7.1 应用所有配置后重启服务

```bash
# 重启 PostgreSQL
sudo systemctl restart postgresql

# 重启 Redis
sudo systemctl restart redis

# 重启 Strapi（必须 delete + start 才能加载新配置）
cd /home/admin/strapi
git pull origin main
pm2 delete strapi
pm2 start ecosystem.config.cjs
pm2 save

# 重启 Vendure（如有）
pm2 delete vendure
pm2 start <vendure的ecosystem路径>
pm2 save
```

### 7.2 查看内存占用

```bash
# 总览
free -h

# 各进程内存占用排序
ps aux --sort=-%mem | head -15

# PM2 进程状态
pm2 status

# PM2 各进程内存详情
pm2 monit
```

### 7.3 预期输出示例

```
$ free -h
              total        used        free      shared  buff/cache   available
Mem:           1.8G        1.2G        150M         45M        450M        350M
Swap:          2.0G          0B        2.0G
```

### 7.4 持续监控

```bash
# 实时监控内存变化（每 5 秒刷新）
watch -n 5 'free -h && echo "---" && pm2 status'

# 查看 PM2 日志（确认无 OOM 重启）
pm2 logs strapi --lines 50
```

---

## 八、pg 弃用警告说明

### 警告内容

```
DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated
and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.
```

### 原因

- `pg` 模块 8.x 版本引入的弃用警告
- Strapi 底层的 Knex.js 查询构建器在同一个数据库连接上发起并发查询时触发
- 这是 **警告**，不是错误，不影响任何功能

### 处理方式

- `NODE_NO_WARNINGS=1` 环境变量抑制所有 Node.js 弃用警告输出到 stderr
- PM2 的 `error.log` 将不再被这些警告刷屏
- 升级到 `pg@9.0`（未来版本）后此警告将消失，但 Strapi 5.47.0 目前依赖 `pg@8.x`

---

## 九、故障排查

### Strapi 频繁重启（PM2 restart 次数高）

```bash
# 查看 PM2 重启次数
pm2 list

# 查看错误日志
pm2 logs strapi --err --lines 50

# 如果是 OOM：
# 1. 检查 max_memory_restart 是否太低（应 > --max-old-space-size + 100M）
# 2. 检查是否有内存泄漏（某个插件未释放资源）
# 3. 临时调高 max_memory_restart 到 600M 观察
```

### 数据库连接超时

```bash
# 检查 PostgreSQL 连接数
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 如果连接数接近 max_connections (30)，调大 DATABASE_POOL_MAX 或 max_connections
```

### 内存不足导致进程被 OOM Killer 杀死

```bash
# 查看系统日志
dmesg | grep -i "out of memory"
dmesg | grep -i "oom"

# 解决方案：
# 1. 确认 Swap 已启用（swapon --show）
# 2. 降低各服务内存限制
# 3. 考虑升级服务器内存到 4G
```
