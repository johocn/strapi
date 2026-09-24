# zhao-studio 第二阶段设计文档：浏览器信息与广告点击统计

**日期**: 2026-06-16
**插件名称**: zhao-studio
**模块**: 模块5 - 浏览器信息与广告点击统计

---

## 一、需求概述

### 1.1 功能范围

**浏览器信息采集：**
- 页面加载时采集：userAgent、platform、screenResolution、ip、referrer
- 阅读行为采集：readDuration、scrollDepth
- 用户身份追踪：sessionId、userId、isRegistered、registeredAt

**广告点击统计：**
- 统计所有广告位点击（首页、列表页、详情页、侧边栏、底部等）
- 广告位配置管理
- 点击率、转化率计算

**统计看板：**
- 基础版：广告点击统计
- 进阶版：广告点击 + 文章浏览统计
- 高级版：完整统计 + 浏览器信息分析 + 用户转化分析

### 1.2 数据存储策略

采用混合模式：
- 原始日志存储（browser-log）：保留30天，支持详细分析
- 定期聚合汇总（stat-summary）：长期保留，查询高效

---

## 二、数据模型设计

### 2.1 ad-slot（广告位配置）

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_ad_slots",
  "info": {
    "singularName": "ad-slot",
    "pluralName": "ad-slots",
    "displayName": "广告位",
    "description": "广告位配置管理"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "code": { "type": "string", "required": true, "unique": true },
    "position": {
      "type": "enumeration",
      "enum": ["article-content", "sidebar", "footer", "header", "list-page", "home-page"],
      "default": "article-content"
    },
    "type": {
      "type": "enumeration",
      "enum": ["product-link", "banner", "popup", "native"],
      "default": "product-link"
    },
    "targetUrl": { "type": "string" },
    "productId": { "type": "string" },
    "imageUrl": { "type": "string" },
    "isActive": { "type": "boolean", "default": true },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

### 2.2 browser-log（浏览器日志）

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_browser_logs",
  "info": {
    "singularName": "browser-log",
    "pluralName": "browser-logs",
    "displayName": "浏览器日志",
    "description": "用户浏览器信息和行为日志"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "eventType": {
      "type": "enumeration",
      "enum": ["page-view", "ad-click", "scroll", "read-duration", "user-register"],
      "required": true
    },
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft"
    },
    "adSlot": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.ad-slot"
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "userId": { "type": "string" },
    "sessionId": { "type": "string", "required": true },
    "isRegistered": { "type": "boolean", "default": false },
    "registeredAt": { "type": "datetime" },
    "userAgent": { "type": "string" },
    "platform": { "type": "string" },
    "browser": { "type": "string" },
    "browserVersion": { "type": "string" },
    "os": { "type": "string" },
    "osVersion": { "type": "string" },
    "deviceType": {
      "type": "enumeration",
      "enum": ["desktop", "mobile", "tablet"],
      "default": "desktop"
    },
    "screenWidth": { "type": "integer" },
    "screenHeight": { "type": "integer" },
    "language": { "type": "string" },
    "ip": { "type": "string" },
    "country": { "type": "string" },
    "city": { "type": "string" },
    "referrer": { "type": "string" },
    "referrerDomain": { "type": "string" },
    "readDuration": { "type": "integer", "default": 0 },
    "scrollDepth": { "type": "integer", "default": 0 },
    "timestamp": { "type": "datetime", "required": true },
    "createdAt": { "type": "datetime" }
  }
}
```

### 2.3 stat-summary（统计汇总）

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_stat_summaries",
  "info": {
    "singularName": "stat-summary",
    "pluralName": "stat-summaries",
    "displayName": "统计汇总",
    "description": "按日期聚合的统计数据"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "date": { "type": "date", "required": true },
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft"
    },
    "adSlot": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.ad-slot"
    },
    "summaryType": {
      "type": "enumeration",
      "enum": ["article-daily", "ad-slot-daily", "global-daily", "device-daily", "region-daily"],
      "required": true
    },
    "pv": { "type": "integer", "default": 0 },
    "uv": { "type": "integer", "default": 0 },
    "clickCount": { "type": "integer", "default": 0 },
    "clickRate": { "type": "float", "default": 0 },
    "avgReadDuration": { "type": "float", "default": 0 },
    "avgScrollDepth": { "type": "float", "default": 0 },
    "deviceStats": { "type": "json" },
    "regionStats": { "type": "json" },
    "referrerStats": { "type": "json" },
    "createdAt": { "type": "datetime" }
  }
}
```

---

## 三、服务设计

### 3.1 analytics 服务（统计服务）

**职责：**
- 接收前端上报数据
- 解析浏览器信息（userAgent、IP地理位置）
- 创建 browser-log 记录

**核心方法：**

```typescript
// server/src/services/analytics.ts
export default ({ strapi }) => ({
  // 记录页面浏览
  async trackPageView(data: {
    articleId: string;
    sessionId: string;
    userId?: string;
    userAgent: string;
    ip: string;
    referrer: string;
    screen: { width: number; height: number };
    language: string;
  }) {},

  // 记录广告点击
  async trackAdClick(data: {
    adSlotId: string;
    articleId?: string;
    sessionId: string;
    userId?: string;
    userAgent: string;
    ip: string;
  }) {},

  // 记录阅读行为
  async trackReadBehavior(data: {
    articleId: string;
    sessionId: string;
    readDuration: number;
    scrollDepth: number;
  }) {},

  // 记录用户注册
  async trackUserRegister(data: {
    sessionId: string;
    userId: string;
    registeredAt: Date;
  }) {},

  // 解析浏览器信息
  parseUserAgent(userAgent: string): {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    deviceType: string;
    platform: string;
  },

  // 解析IP地理位置
  async parseIpLocation(ip: string): {
    country: string;
    city: string;
  },

  // 广告位管理
  async listAdSlots() {},
  async createAdSlot(data: any) {},
  async updateAdSlot(id: string, data: any) {},
  async deleteAdSlot(id: string) {},
  async toggleAdSlot(id: string, isActive: boolean) {},

  // 统计查询
  async getOverview(params: { startDate: Date; endDate: Date }) {},
  async getArticleStats(params: { articleId?: string; startDate: Date; endDate: Date }) {},
  async getAdSlotStats(params: { adSlotId?: string; startDate: Date; endDate: Date }) {},
  async getDeviceStats(params: { startDate: Date; endDate: Date }) {},
  async getRegionStats(params: { startDate: Date; endDate: Date }) {},
  async getUserStats(params: { startDate: Date; endDate: Date }) {},

  // 清理旧日志
  async cleanupOldLogs(days: number) {},
});
```

### 3.2 aggregation 服务（聚合服务）

**职责：**
- 定时聚合前一天数据
- 按文章/广告位/日期生成汇总记录
- 计算PV、UV、点击率、平均阅读时长等

**核心方法：**

```typescript
// server/src/services/aggregation.ts
export default ({ strapi }) => ({
  // 聚合文章日统计
  async aggregateArticleDaily(date: Date) {
    // 1. 查询当天所有 page-view 事件
    // 2. 按 article 分组，计算 PV、UV
    // 3. 计算平均阅读时长、平均滚动深度
    // 4. 创建 stat-summary 记录
  },

  // 聚合广告位日统计
  async aggregateAdSlotDaily(date: Date) {
    // 1. 查询当天所有 ad-click 事件
    // 2. 按 adSlot 分组，计算点击量
    // 3. 计算点击率（点击量 / PV）
    // 4. 创建 stat-summary 记录
  },

  // 聚合全局日统计
  async aggregateGlobalDaily(date: Date) {
    // 1. 查询当天所有事件
    // 2. 计算全局 PV、UV、点击量
    // 3. 创建 stat-summary 记录
  },

  // 聚合设备分布统计
  async aggregateDeviceDaily(date: Date) {
    // 1. 查询当天所有 page-view 事件
    // 2. 按 deviceType 分组统计
    // 3. 创建 stat-summary 记录（deviceStats）
  },

  // 聚合地域分布统计
  async aggregateRegionDaily(date: Date) {
    // 1. 查询当天所有 page-view 事件
    // 2. 按 country/city 分组统计
    // 3. 创建 stat-summary 记录（regionStats）
  },

  // 执行所有聚合任务
  async runDailyAggregation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await this.aggregateArticleDaily(yesterday);
    await this.aggregateAdSlotDaily(yesterday);
    await this.aggregateGlobalDaily(yesterday);
    await this.aggregateDeviceDaily(yesterday);
    await this.aggregateRegionDaily(yesterday);
  },
});
```

### 3.3 定时任务配置

```typescript
// config/server.ts
module.exports = ({ env }) => ({
  cron: {
    enabled: true,
    tasks: {
      // 每天凌晨 2 点执行聚合
      '0 2 * * *': async () => {
        const aggregation = strapi.plugin('zhao-studio').service('aggregation');
        await aggregation.runDailyAggregation();
      },
      // 每周凌晨 3 点清理 30 天前的原始日志
      '0 3 * * 0': async () => {
        const analytics = strapi.plugin('zhao-studio').service('analytics');
        await analytics.cleanupOldLogs(30);
      },
    },
  },
});
```

---

## 四、API设计

### 4.1 Content API 路由（公开访问）

```typescript
// server/src/routes/content-api.ts 新增路由
{
  method: 'POST',
  path: '/v1/analytics/page-view',
  handler: 'analytics.trackPageView',
  config: { auth: false },
},
{
  method: 'POST',
  path: '/v1/analytics/ad-click',
  handler: 'analytics.trackAdClick',
  config: { auth: false },
},
{
  method: 'POST',
  path: '/v1/analytics/read-behavior',
  handler: 'analytics.trackReadBehavior',
  config: { auth: false },
},
{
  method: 'POST',
  path: '/v1/analytics/user-register',
  handler: 'analytics.trackUserRegister',
  config: { auth: false },
},
```

### 4.2 Admin API 路由（需要权限）

**广告位管理接口：**

```typescript
// server/src/routes/admin.ts 新增路由
{
  method: 'GET',
  path: '/v1/ad-slots',
  handler: 'analytics.listAdSlots',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'POST',
  path: '/v1/ad-slots',
  handler: 'analytics.createAdSlot',
  config: { auth: { scope: ['plugin::zhao-studio.create'] } },
},
{
  method: 'PUT',
  path: '/v1/ad-slots/:id',
  handler: 'analytics.updateAdSlot',
  config: { auth: { scope: ['plugin::zhao-studio.update'] } },
},
{
  method: 'DELETE',
  path: '/v1/ad-slots/:id',
  handler: 'analytics.deleteAdSlot',
  config: { auth: { scope: ['plugin::zhao-studio.delete'] } },
},
```

**统计查询接口：**

```typescript
{
  method: 'GET',
  path: '/v1/stats/overview',
  handler: 'analytics.getOverview',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'GET',
  path: '/v1/stats/articles',
  handler: 'analytics.getArticleStats',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'GET',
  path: '/v1/stats/ad-slots',
  handler: 'analytics.getAdSlotStats',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'GET',
  path: '/v1/stats/devices',
  handler: 'analytics.getDeviceStats',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'GET',
  path: '/v1/stats/regions',
  handler: 'analytics.getRegionStats',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
{
  method: 'GET',
  path: '/v1/stats/users',
  handler: 'analytics.getUserStats',
  config: { auth: { scope: ['plugin::zhao-studio.read'] } },
},
```

### 4.3 前端上报数据格式

**页面浏览上报：**

```json
{
  "articleId": "abc123",
  "sessionId": "sess_xyz",
  "userId": "user_123",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1",
  "referrer": "https://example.com",
  "screen": { "width": 1920, "height": 1080 },
  "language": "zh-CN"
}
```

**广告点击上报：**

```json
{
  "adSlotId": "slot_001",
  "articleId": "abc123",
  "sessionId": "sess_xyz",
  "userId": "user_123",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

**阅读行为上报：**

```json
{
  "articleId": "abc123",
  "sessionId": "sess_xyz",
  "readDuration": 120,
  "scrollDepth": 80
}
```

**用户注册上报：**

```json
{
  "sessionId": "sess_xyz",
  "userId": "user_123",
  "registeredAt": "2026-06-16T10:00:00Z"
}
```

---

## 五、前端页面设计

### 5.1 广告位配置页面

**页面：** `AdSlotConfigPage.tsx`

**功能：**
- 广告位列表展示（名称、位置、类型、状态）
- 新建/编辑/删除广告位
- 广告位启用/禁用控制

**组件结构：**

```typescript
// admin/src/pages/AdSlotConfigPage.tsx
<Box padding={4}>
  <Flex justifyContent="space-between">
    <Typography variant="delta">广告位配置</Typography>
    <Button onClick={handleCreate}>新建广告位</Button>
  </Flex>

  {/* 广告位列表 */}
  <Flex marginTop={4} gap={4} direction="column">
    {adSlots.map(slot => (
      <Box key={slot.documentId} padding={3} background="neutral100">
        <Flex justifyContent="space-between">
          <Flex gap={2}>
            <Typography variant="pi">{slot.name}</Typography>
            <Badge>{slot.position}</Badge>
            <Badge>{slot.type}</Badge>
            {!slot.isActive && <Badge variant="warning">已禁用</Badge>}
          </Flex>
          <Flex gap={2}>
            <Button variant="secondary" onClick={() => handleEdit(slot)}>编辑</Button>
            <Button variant="danger" onClick={() => handleDelete(slot)}>删除</Button>
          </Flex>
        </Flex>
      </Box>
    ))}
  </Flex>

  {/* 表单弹窗 */}
  {showForm && <AdSlotForm ... />}
</Box>
```

### 5.2 统计看板页面（分层设计）

**基础版看板：** `StatsBasicPage.tsx`
- 广告点击量（今日/昨日/本周/本月）
- 点击率趋势图
- Top 10 广告位点击排行

**进阶版看板：** `StatsAdvancedPage.tsx`
- 基础版内容 + 文章浏览统计（PV、UV）
- 阅读时长分布
- 滚动深度分布
- 文章浏览排行

**高级版看板：** `StatsProPage.tsx`
- 进阶版内容 + 浏览器信息分析
- 设备类型分布（桌面/移动/平板）
- 地域分布（国家/城市）
- 来源分析（referrer域名分布）
- 用户转化分析（注册用户占比、转化路径）

### 5.3 统计看板组件

**OverviewCard 组件：**

```typescript
// admin/src/components/OverviewCard.tsx
interface OverviewCardProps {
  title: string;
  value: number;
  change: number;  // 相比昨日变化
  unit: string;    // 单位（次、%、秒）
}

<Box padding={3} background="neutral100" hasRadius>
  <Typography variant="pi">{title}</Typography>
  <Typography variant="delta">{value} {unit}</Typography>
  <Flex gap={2}>
    {change > 0 ? (
      <Badge variant="success">↑ {change}%</Badge>
    ) : (
      <Badge variant="danger">↓ {Math.abs(change)}%</Badge>
    )}
  </Flex>
</Box>
```

**StatsChart 组件：**

```typescript
// admin/src/components/StatsChart.tsx
interface StatsChartProps {
  type: 'line' | 'bar' | 'pie';
  data: { label: string; value: number }[];
  title: string;
}

// 使用简化方案：数据表格替代图表
<Box padding={3} background="neutral100">
  <Typography variant="delta">{title}</Typography>
  <Flex marginTop={2} gap={2} direction="column">
    {data.map(item => (
      <Flex key={item.label} justifyContent="space-between">
        <Typography variant="pi">{item.label}</Typography>
        <Badge>{item.value}</Badge>
      </Flex>
    ))}
  </Flex>
</Box>
```

**StatsTable 组件：**

```typescript
// admin/src/components/StatsTable.tsx
interface StatsTableProps {
  columns: string[];
  data: any[];
  title: string;
}

<Box padding={3} background="neutral100">
  <Typography variant="delta">{title}</Typography>
  <Flex marginTop={2} gap={2} direction="column">
    {/* 表头 */}
    <Flex gap={2} background="neutral200" padding={2}>
      {columns.map(col => <Typography variant="pi">{col}</Typography>)}
    </Flex>
    {/* 数据行 */}
    {data.map(row => (
      <Flex key={row.id} gap={2} padding={2}>
        {columns.map(col => <Typography variant="pi">{row[col]}</Typography>)}
      </Flex>
    ))}
  </Flex>
</Box>
```

### 5.4 前端 Hooks

**useAdSlots Hook：**

```typescript
// admin/src/hooks/useAdSlots.ts
export function useAdSlots() {
  const [adSlots, setAdSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdSlots = async () => {};
  const createAdSlot = async (data) => {};
  const updateAdSlot = async (id, data) => {};
  const deleteAdSlot = async (id) => {};

  return { adSlots, loading, error, fetchAdSlots, createAdSlot, updateAdSlot, deleteAdSlot };
}
```

**useStats Hook：**

```typescript
// admin/src/hooks/useStats.ts
export function useStats(type: 'basic' | 'advanced' | 'pro') {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {};
  const fetchArticleStats = async (params) => {};
  const fetchAdSlotStats = async (params) => {};
  const fetchDeviceStats = async () => {};
  const fetchRegionStats = async () => {};
  const fetchUserStats = async () => {};

  return { stats, loading, error, fetchOverview, fetchArticleStats, fetchAdSlotStats, fetchDeviceStats, fetchRegionStats, fetchUserStats };
}
```

---

## 六、错误处理和测试策略

### 6.1 错误处理

**错误类型定义：**

```typescript
// server/src/utils/analyticsErrors.ts
export const AnalyticsErrors = {
  INVALID_DATA: {
    code: 'ANALYTICS_001',
    message: '上报数据格式无效',
  },
  MISSING_SESSION: {
    code: 'ANALYTICS_002',
    message: '缺少 sessionId',
  },
  INVALID_AD_SLOT: {
    code: 'ANALYTICS_003',
    message: '广告位不存在或已禁用',
  },
  INVALID_ARTICLE: {
    code: 'ANALYTICS_004',
    message: '文章不存在',
  },
  IP_PARSE_ERROR: {
    code: 'ANALYTICS_005',
    message: 'IP地理位置解析失败',
  },
  AGGREGATION_ERROR: {
    code: 'ANALYTICS_006',
    message: '数据聚合失败',
  },
};
```

**降级策略：**
- IP解析失败：记录原始IP，不阻塞上报
- 广告位无效：记录日志，不阻塞上报
- 聚合失败：重试3次，失败后记录错误日志

### 6.2 测试策略

**单元测试：**

```typescript
// tests/services/analytics.test.ts
describe('Analytics Service', () => {
  test('trackPageView should create browser-log', async () => {});
  test('trackAdClick should validate ad-slot', async () => {});
  test('parseUserAgent should extract browser info', async () => {});
  test('trackUserRegister should link anonymous logs', async () => {});
});

// tests/services/aggregation.test.ts
describe('Aggregation Service', () => {
  test('aggregateArticleDaily should calculate PV/UV', async () => {});
  test('aggregateAdSlotStats should calculate click rate', async () => {});
  test('runDailyAggregation should process all types', async () => {});
});
```

**集成测试：**

```typescript
// tests/integration/analytics.test.ts
describe('Analytics Integration', () => {
  test('POST /v1/analytics/page-view should work', async () => {});
  test('POST /v1/analytics/ad-click should work', async () => {});
  test('GET /v1/stats/overview should return aggregated data', async () => {});
});
```

### 6.3 性能考虑

**数据量控制：**
- 原始日志保留 30 天
- 聚合数据长期保留
- 使用索引优化查询（sessionId、timestamp、article、adSlot）

**查询优化：**
- 统计查询优先读取聚合表
- 分页查询避免全表扫描
- 缓存常用统计结果（Redis 可选）

---

## 七、文件结构总结

### 新增文件列表

```
plugins/zhao-studio/
├── server/src/
│   ├── content-types/
│   │   ├── ad-slot/
│   │   │   └── schema.json              # 广告位配置
│   │   ├── browser-log/
│   │   │   └── schema.json              # 浏览器日志
│   │   ├── stat-summary/
│   │   │   └── schema.json              # 统计汇总
│   ├── services/
│   │   ├── analytics.ts                 # 统计服务
│   │   ├── aggregation.ts               # 聚合服务
│   ├── controllers/
│   │   ├── analytics.ts                 # 统计控制器
│   ├── routes/
│   │   ├── content-api.ts               # 更新：添加v1/analytics路由
│   │   ├── admin.ts                     # 更新：添加v1/ad-slots、v1/stats路由
│   ├── utils/
│   │   ├── analyticsErrors.ts           # 统计错误处理
│   │   ├── userAgentParser.ts           # UA解析工具
│   │   ├── ipLocationParser.ts          # IP地理位置解析
├── admin/src/
│   ├── pages/
│   │   ├── AdSlotConfigPage.tsx         # 广告位配置页面
│   │   ├── StatsBasicPage.tsx           # 基础版统计看板
│   │   ├── StatsAdvancedPage.tsx        # 进阶版统计看板
│   │   ├── StatsProPage.tsx             # 高级版统计看板
│   │   ├── App.tsx                      # 更新：添加统计路由
│   ├── components/
│   │   ├── AdSlotForm.tsx               # 广告位表单组件
│   │   ├── OverviewCard.tsx             # 统计概览卡片
│   │   ├── StatsChart.tsx               # 统计图表组件
│   │   ├── StatsTable.tsx               # 统计表格组件
│   ├── hooks/
│   │   ├── useAdSlots.ts                # 广告位Hook
│   │   ├── useStats.ts                  # 统计Hook
│   ├── utils/
│   │   ├── analyticsApi.ts              # 统计API工具
│   │   ├── statsCalculator.ts           # 统计计算工具
├── tests/
│   ├── services/
│   │   ├── analytics.test.ts            # 统计服务测试
│   │   ├── aggregation.test.ts          # 聚合服务测试
│   ├── integration/
│   │   ├── analytics.test.ts            # 统计集成测试
```

### 文件数量统计

| 类别 | 新增 | 修改 |
|------|------|------|
| Collection Types | 3 | 0 |
| Services | 2 | 0 |
| Controllers | 1 | 0 |
| Routes | 0 | 2 |
| Utils | 3 | 0 |
| Pages | 4 | 1 |
| Components | 4 | 0 |
| Hooks | 2 | 0 |
| Tests | 3 | 0 |

---

## 八、总结

第二阶段（模块5）实现了完整的浏览器信息与广告点击统计功能：

**核心功能：**
- 浏览器信息采集（页面加载、阅读行为、用户注册）
- 广告点击统计（所有广告位）
- 分层统计看板（基础/进阶/高级）
- 用户身份追踪（注册/非注册用户转化）

**技术特点：**
- 混合存储模式（原始日志 + 定期聚合）
- API版本化设计（v1前缀）
- 定时任务机制（Strapi cron）
- 性能优化策略（索引、缓存、清理）

**与第一阶段集成：**
- 关联 article-draft（文章浏览统计）
- 关联 admin::user（用户身份追踪）
- 统计看板分层展示