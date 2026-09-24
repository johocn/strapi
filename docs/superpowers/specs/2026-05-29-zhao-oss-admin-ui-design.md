# zhao-oss 前端管理界面设计文档

> 版本：1.0.0 | 日期：2026-05-29

---

## 1. 概述

为 zhao-oss 插件添加前端管理界面，提供同步状态可视化、配置管理和操作功能。

### 1.1 目标

- 提供仪表盘概览同步状态
- 支持同步记录查看和管理
- 提供配置管理界面
- 支持手动触发同步操作

### 1.2 技术栈

- React 18
- Ant Design 5.x
- zhao-auth 权限集成
- i18n 国际化（中/英）

---

## 2. 页面结构

### 2.1 路由配置

入口路径：`/plugins/zhao-oss`

**注意**：Admin API 路由已有 `/sync/`、`/settings/` 前缀，前端请求需拼接完整路径：
- `/admin/plugins/zhao-oss/sync/dashboard`
- `/admin/plugins/zhao-oss/sync/records`
- `/admin/plugins/zhao-oss/settings`

### 2.2 组件结构

```
admin/src/
├── index.ts                    # 插件注册
├── pages/
│   └── HomePage.tsx            # 主页面（Tab 容器）
├── components/
│   ├── DashboardTab.tsx        # 仪表盘
│   ├── RecordsTab.tsx          # 同步记录
│   ├── SettingsTab.tsx         # 配置管理
│   └── ActionsTab.tsx          # 操作中心
├── hooks/
│   └── useOssApi.ts            # API 请求封装
├── translations/
│   ├── en.json
│   └── zh-CN.json
└── utils/
    ├── api.ts                  # API 客户端
    └── getTranslation.ts       # i18n 工具
```

---

## 3. 仪表盘 Tab (DashboardTab)

### 3.1 统计卡片

使用 Ant Design `Card` + `Statistic` 组件，显示 4 个指标：

| 指标 | 字段 | 图标 |
|------|------|------|
| 总文件数 | total | FileOutlined |
| 已同步数 | synced | CheckCircleOutlined |
| 同步失败数 | failed | CloseCircleOutlined |
| 待同步数 | pending | ClockCircleOutlined |

### 3.2 健康状态

- 显示主提供者名称
- 连接状态指示灯（绿色/红色）
- 最后检查时间
- 刷新按钮

### 3.3 最近同步记录

- 显示最近 10 条记录
- 表格列：文件 ID、文件名、状态、同步时间
- 状态使用 `Tag` 组件着色

### 3.4 API 调用

```typescript
GET /admin/plugins/zhao-oss/sync/dashboard
```

响应：
```json
{
  "stats": { "total": 100, "synced": 85, "failed": 5, "pending": 10 },
  "health": { "healthy": true, "provider": "aliyun", "lastCheck": "2026-05-29T10:00:00Z" },
  "recentRecords": [...]
}
```

---

## 4. 同步记录 Tab (RecordsTab)

### 4.1 筛选条件

使用 Ant Design `Form` 组件：

| 字段 | 组件 | 说明 |
|------|------|------|
| status | Select | 状态筛选 |
| provider | Select | 提供者筛选 |
| dateRange | RangePicker | 时间范围 |

### 4.2 数据表格

使用 Ant Design `Table` 组件：

| 列 | 字段 | 说明 |
|------|------|------|
| 文件 ID | fileId | - |
| 文件名 | filename | 从关联文件获取 |
| 状态 | status | Tag 着色 |
| 提供者 | provider | - |
| 远程 URL | remoteUrl | 可点击链接 |
| 同步时间 | lastSyncedAt | 格式化显示 |
| 操作 | - | 详情、重试、删除 |

### 4.3 批量操作

- 表格支持多选
- 批量重试按钮
- 批量删除远程文件按钮

### 4.4 API 调用

```typescript
GET /admin/plugins/zhao-oss/sync/records?page=1&pageSize=20&filters[status]=failed
```

---

## 5. 配置管理 Tab (SettingsTab)

### 5.1 配置表单

使用 Ant Design `Form` 组件：

| 字段 | 组件 | 必填 | 说明 |
|------|------|------|------|
| provider | Select | 是 | 提供者选择 |
| accessKeyId | Input.Password | 是 | Access Key |
| accessKeySecret | Input.Password | 是 | Access Secret |
| bucket | Input | 是 | 存储桶名称 |
| region | Input | 是 | 区域 |
| cname | Input | 否 | 自定义域名 |
| basePath | Input | 否 | 存储路径前缀 |
| maxRetries | InputNumber | 否 | 最大重试次数 |
| uploadTimeoutMs | InputNumber | 否 | 上传超时（毫秒） |

### 5.2 操作按钮

- 保存配置：`PUT /admin/plugins/zhao-oss/settings`
- 测试连接：`POST /admin/plugins/zhao-oss/settings/test-provider`
- 重置默认：清空表单重新加载

### 5.3 测试连接结果

显示测试结果：
- 成功：绿色提示 + 延迟信息
- 失败：红色提示 + 错误信息

---

## 6. 操作 Tab (ActionsTab)

### 6.1 手动同步

**单个文件同步**：
- 输入文件 ID
- 点击同步按钮
- 显示同步结果

**批量同步**：
- 设置 limit（每次数量）
- 设置 offset（起始偏移）
- 点击批量同步按钮
- 显示进度和结果

API：
```typescript
POST /admin/plugins/zhao-oss/sync/trigger
Body: { fileId: number }

POST /admin/plugins/zhao-oss/sync/batch
Body: { limit: number, offset: number }
```

### 6.2 批量操作

- 重试所有失败记录
- 清理无效记录（status=deleted）

---

## 7. API 客户端封装

### 7.1 api.ts

```typescript
const api = {
  // Dashboard
  getDashboard: () => request.get('/sync/dashboard'),
  
  // Sync Records
  getSyncRecords: (params) => request.get('/sync/records', { params }),
  triggerSync: (fileId) => request.post('/sync/trigger', { fileId }),
  batchSync: (limit, offset) => request.post('/sync/batch', { limit, offset }),
  deleteRemote: (recordId) => request.delete(`/sync/remote/${recordId}`),
  checkHealth: () => request.get('/sync/health'),
  
  // Settings
  getConfig: () => request.get('/settings'),
  updateConfig: (data) => request.put('/settings', data),
  testProvider: (data) => request.post('/settings/test-provider', data),
};
```

### 7.2 useOssApi Hook

封装请求状态管理：
- loading 状态
- error 处理
- 数据缓存

---

## 8. 国际化

### 8.1 翻译文件

**zh-CN.json**：
```json
{
  "dashboard.title": "仪表盘",
  "dashboard.total": "总文件数",
  "dashboard.synced": "已同步",
  "dashboard.failed": "同步失败",
  "dashboard.pending": "待同步",
  "records.title": "同步记录",
  "settings.title": "配置管理",
  "actions.title": "操作中心"
}
```

**en.json**：
```json
{
  "dashboard.title": "Dashboard",
  "dashboard.total": "Total Files",
  "dashboard.synced": "Synced",
  "dashboard.failed": "Failed",
  "dashboard.pending": "Pending",
  "records.title": "Sync Records",
  "settings.title": "Settings",
  "actions.title": "Actions"
}
```

### 8.2 使用方式

```typescript
import { useTranslation } from '../utils/getTranslation';
const { t } = useTranslation();
```

---

## 9. 权限集成

### 9.1 权限键

| 权限 | 说明 |
|------|------|
| oss.sync.read | 查看同步状态 |
| oss.sync.trigger | 触发同步操作 |
| oss.settings.read | 查看配置 |
| oss.settings.update | 修改配置 |

### 9.2 菜单注册

```typescript
app.addMenuLink({
  label: { id: 'zhao-oss.menu.label', defaultMessage: 'OSS Backup' },
  to: '/plugins/zhao-oss',
  icon: 'CloudUpload',
  permissions: [
    { action: 'plugin::zhao-oss.oss.sync.read', subject: null },
  ],
});
```

---

## 10. 状态着色规则

| 状态 | 颜色 | Tag |
|------|------|-----|
| success | green | 成功 |
| failed | red | 失败 |
| pending | blue | 待同步 |
| syncing | orange | 同步中 |
| deleted | default | 已删除 |

---

## 11. 错误处理

- API 请求失败显示 Ant Design `message.error`
- 网络错误显示重试按钮
- 权限不足显示 403 提示

---

## 12. 实现顺序

1. 创建组件目录结构
2. 实现 api.ts 和 useOssApi hook
3. 实现 DashboardTab
4. 实现 RecordsTab
5. 实现 SettingsTab
6. 实现 ActionsTab
7. 组装 HomePage（Tab 容器）
8. 更新 index.ts 注册
9. 添加国际化文件
10. 测试权限集成
