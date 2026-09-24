# 服务器 Swap 扩容修复 Strapi Build OOM 设计

## 背景

阿里云 ECS 服务器物理内存 2G，执行 `npm run build`（strapi build）时，Vite 构建 admin panel 阶段内存消耗超过 2G，触发 Linux OOM Killer，进程被 Killed。

服务器部署方式：服务器直接 git pull + npm run build + strapi start。

## 目标

通过创建 2G swap 文件，将虚拟内存扩展到 4G（2G 物理内存 + 2G swap），使 `npm run build` 能正常完成。

## 操作步骤

### 一、创建 2G Swap

若 `/swapfile` 已存在（报 `Text file busy`），先关闭再重建：

```bash
# 关闭已有 swap（如存在）
sudo swapoff /swapfile
sudo rm -f /swapfile

# 创建 2G swap 文件
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048

# 设置权限（仅 root 可读写）
sudo chmod 600 /swapfile

# 格式化并启用
sudo mkswap /swapfile
sudo swapon /swapfile

# 验证 Swap 生效
free -h
# 预期 Swap 行显示 2.0Gi

# 持久化（重启后自动挂载）
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### 二、优化内核交换策略（低配服务器编译必备）

```bash
# 临时生效：优先用物理内存，不够才用 swap
sudo sysctl vm.swappiness=10

# 永久生效
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 三、构建与部署

```bash
cd ~/strapi

# 构建
npm run build

# 数据库结构迁移（表结构有变动时必执行）
npm run strapi migrate:run

# 重启服务
pm2 restart strapi

# 查看启动日志确认正常
pm2 logs strapi --lines 50
```

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `dd: writing '/swapfile': Text file busy` | swap 文件已存在且正在使用 | 先 `sudo swapoff /swapfile` 再 `sudo rm -f /swapfile` |
| 构建时内存仍紧张 | 系统缓存占用 | `sync && sudo sysctl -w vm.drop_caches=3` 清理缓存 |

## 验证标准

1. `free -h` 显示 Swap 2.0Gi
2. `npm run build` 不再被 Killed，完整输出构建成功
3. 重启服务器后 `free -h` 仍显示 Swap 2.0Gi（持久化生效）

## 回滚

```bash
sudo swapoff /swapfile
sudo rm -f /swapfile
# 删除 /etc/fstab 中的 swap 行
sudo sed -i '/swapfile/d' /etc/fstab
```
