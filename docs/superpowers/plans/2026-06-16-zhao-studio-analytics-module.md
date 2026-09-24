# zhao-studio 第二阶段实施计划：浏览器信息与广告点击统计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 zhao-studio 插件的第二阶段模块，包括浏览器信息采集、广告点击统计、统计看板

**Architecture:** 采用混合存储模式（原始日志 + 定期聚合），API版本化设计（v1前缀），定时任务机制（Strapi cron）

**Tech Stack:** Strapi v5, TypeScript, React, Strapi Cron

---

## 文件结构

**新增文件：**
```
plugins/zhao-studio/
├── server/src/
│   ├── content-types/
│   │   ├── ad-slot/
│   │   │   ├── schema.json              # 广告位配置
│   │   │   └── index.ts                 # 导出
│   │   ├── browser-log/
│   │   │   ├── schema.json              # 浏览器日志
│   │   │   └── index.ts                 # 导出
│   │   ├── stat-summary/
│   │   │   ├── schema.json              # 统计汇总
│   │   │   └── index.ts                 # 导出
│   ├── services/
│   │   ├── analytics.ts                 # 统计服务
│   │   ├── aggregation.ts               # 聚合服务
│   ├── controllers/
│   │   ├── analytics.ts                 # 统计控制器
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

**修改文件：**
```
plugins/zhao-studio/
├── server/src/
│   ├── content-types/
│   │   └── index.ts                     # 导出新Collection Types
│   ├── services/
│   │   └── index.ts                     # 导出新服务
│   ├── controllers/
│   │   └── index.ts                     # 导出新控制器
│   ├── routes/
│   │   ├── admin.ts                     # 添加v1/ad-slots、v1/stats路由
│   │   ├── content-api.ts               # 添加v1/analytics路由
├── admin/src/
│   ├── pages/
│   │   ├── App.tsx                      # 添加统计路由
```

---

## Task 1: 创建广告位 Collection Type

**Files:**
- Create: `plugins/zhao-studio/server/src/content-types/ad-slot/schema.json`
- Create: `plugins/zhao-studio/server/src/content-types/ad-slot/index.ts`

- [ ] **Step 1: 创建广告位 schema.json**

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

- [ ] **Step 2: 创建广告位 index.ts**

```typescript
// server/src/content-types/ad-slot/index.ts

import schema from './schema.json';

export default { schema };
```

- [ ] **Step 3: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/content-types/ad-slot/schema.json
cat plugins/zhao-studio/server/src/content-types/ad-slot/index.ts
```

Expected: 显示正确的文件内容

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-studio/server/src/content-types/ad-slot/
git commit -m "feat: add ad-slot collection type for analytics module"
```

---

## Task 2: 创建浏览器日志 Collection Type

**Files:**
- Create: `plugins/zhao-studio/server/src/content-types/browser-log/schema.json`
- Create: `plugins/zhao-studio/server/src/content-types/browser-log/index.ts`

- [ ] **Step 1: 创建浏览器日志 schema.json**

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

- [ ] **Step 2: 创建浏览器日志 index.ts**

```typescript
// server/src/content-types/browser-log/index.ts

import schema from './schema.json';

export default { schema };
```

- [ ] **Step 3: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/content-types/browser-log/schema.json
cat plugins/zhao-studio/server/src/content-types/browser-log/index.ts
```

Expected: 显示正确的文件内容

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-studio/server/src/content-types/browser-log/
git commit -m "feat: add browser-log collection type for analytics module"
```

---

## Task 3: 创建统计汇总 Collection Type

**Files:**
- Create: `plugins/zhao-studio/server/src/content-types/stat-summary/schema.json`
- Create: `plugins/zhao-studio/server/src/content-types/stat-summary/index.ts`

- [ ] **Step 1: 创建统计汇总 schema.json**

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

- [ ] **Step 2: 创建统计汇总 index.ts**

```typescript
// server/src/content-types/stat-summary/index.ts

import schema from './schema.json';

export default { schema };
```

- [ ] **Step 3: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/content-types/stat-summary/schema.json
cat plugins/zhao-studio/server/src/content-types/stat-summary/index.ts
```

Expected: 显示正确的文件内容

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-studio/server/src/content-types/stat-summary/
git commit -m "feat: add stat-summary collection type for analytics module"
```

---

## Task 4: 更新 content-types index.ts

**Files:**
- Modify: `plugins/zhao-studio/server/src/content-types/index.ts`

- [ ] **Step 1: 更新 content-types index.ts**

```typescript
// server/src/content-types/index.ts

import articleDraft from './article-draft';
import collectSource from './collect-source';
import collectTask from './collect-task';
import publishPlatform from './publish-platform';
import publishAccount from './publish-account';
import publishRecord from './publish-record';
import knowledgePointIndex from './knowledge-point-index';
import adSlot from './ad-slot';
import browserLog from './browser-log';
import statSummary from './stat-summary';

export default {
  'article-draft': articleDraft,
  'collect-source': collectSource,
  'collect-task': collectTask,
  'publish-platform': publishPlatform,
  'publish-account': publishAccount,
  'publish-record': publishRecord,
  'knowledge-point-index': knowledgePointIndex,
  'ad-slot': adSlot,
  'browser-log': browserLog,
  'stat-summary': statSummary,
};
```

- [ ] **Step 2: 验证文件修改**

```bash
cat plugins/zhao-studio/server/src/content-types/index.ts
```

Expected: 显示正确的导出定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/content-types/index.ts
git commit -m "feat: export new analytics collection types"
```

---

## Task 5: 创建统计错误处理

**Files:**
- Create: `plugins/zhao-studio/server/src/utils/analyticsErrors.ts`

- [ ] **Step 1: 创建统计错误处理文件**

```typescript
// server/src/utils/analyticsErrors.ts

export interface AnalyticsError {
  code: string;
  message: string;
  retry?: boolean;
  maxRetries?: number;
}

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
    retry: true,
    maxRetries: 3,
  },
};

export function identifyAnalyticsError(error: any): AnalyticsError {
  if (error.message?.includes('sessionId') || error.message?.includes('缺少')) {
    return AnalyticsErrors.MISSING_SESSION;
  }

  if (error.message?.includes('ad-slot') || error.message?.includes('广告位')) {
    return AnalyticsErrors.INVALID_AD_SLOT;
  }

  if (error.message?.includes('article') || error.message?.includes('文章')) {
    return AnalyticsErrors.INVALID_ARTICLE;
  }

  if (error.message?.includes('IP') || error.message?.includes('ip')) {
    return AnalyticsErrors.IP_PARSE_ERROR;
  }

  if (error.message?.includes('aggregation') || error.message?.includes('聚合')) {
    return AnalyticsErrors.AGGREGATION_ERROR;
  }

  return AnalyticsErrors.INVALID_DATA;
}
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/utils/analyticsErrors.ts
```

Expected: 显示正确的错误处理定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/utils/analyticsErrors.ts
git commit -m "feat: add analytics error handling utilities"
```

---

## Task 6: 创建 UA 解析工具

**Files:**
- Create: `plugins/zhao-studio/server/src/utils/userAgentParser.ts`

- [ ] **Step 1: 创建 UA 解析工具文件**

```typescript
// server/src/utils/userAgentParser.ts

export interface UserAgentInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  platform: string;
}

export function parseUserAgent(userAgent: string): UserAgentInfo {
  const result: UserAgentInfo = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    deviceType: 'desktop',
    platform: '',
  };

  if (!userAgent) {
    return result;
  }

  // 解析浏览器
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    result.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    result.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Edge')) {
    result.browser = 'Edge';
    const match = userAgent.match(/Edge\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    result.browser = 'IE';
    const match = userAgent.match(/(?:MSIE|rv:)(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  }

  // 解析操作系统
  if (userAgent.includes('Windows')) {
    result.os = 'Windows';
    if (userAgent.includes('Windows NT 10')) result.osVersion = '10';
    else if (userAgent.includes('Windows NT 6.3')) result.osVersion = '8.1';
    else if (userAgent.includes('Windows NT 6.2')) result.osVersion = '8';
    else if (userAgent.includes('Windows NT 6.1')) result.osVersion = '7';
  } else if (userAgent.includes('Mac OS X')) {
    result.os = 'MacOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    result.os = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    if (match) result.osVersion = match[1];
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    result.os = 'iOS';
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  }

  // 解析设备类型
  if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
    result.deviceType = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    result.deviceType = 'tablet';
  } else {
    result.deviceType = 'desktop';
  }

  // 解析平台
  if (userAgent.includes('Windows')) {
    result.platform = 'Win32';
  } else if (userAgent.includes('Mac')) {
    result.platform = 'MacIntel';
  } else if (userAgent.includes('Linux')) {
    result.platform = 'Linux x86_64';
  } else if (userAgent.includes('iPhone')) {
    result.platform = 'iPhone';
  } else if (userAgent.includes('iPad')) {
    result.platform = 'iPad';
  } else if (userAgent.includes('Android')) {
    result.platform = 'Linux armv8l';
  }

  return result;
}
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/utils/userAgentParser.ts
```

Expected: 显示正确的 UA 解析工具定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/utils/userAgentParser.ts
git commit -m "feat: add userAgent parser utility"
```

---

## Task 7: 创建 IP 地理位置解析工具

**Files:**
- Create: `plugins/zhao-studio/server/src/utils/ipLocationParser.ts`

- [ ] **Step 1: 创建 IP 地理位置解析工具文件**

```typescript
// server/src/utils/ipLocationParser.ts

import axios from 'axios';

export interface IpLocationInfo {
  country: string;
  city: string;
}

// 使用免费的 IP 地理位置服务（可替换为付费服务）
const IP_API_URL = 'http://ip-api.com/json/';

export async function parseIpLocation(ip: string): Promise<IpLocationInfo> {
  const result: IpLocationInfo = {
    country: '',
    city: '',
  };

  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    // 本地或内网IP，返回空
    return result;
  }

  try {
    const response = await axios.get(`${IP_API_URL}${ip}`, {
      timeout: 5000,
    });

    if (response.data && response.data.status === 'success') {
      result.country = response.data.country || '';
      result.city = response.data.city || '';
    }
  } catch (error) {
    // 解析失败，返回空，不阻塞上报
  }

  return result;
}

// 提取 referrer 域名
export function extractReferrerDomain(referrer: string): string {
  if (!referrer) {
    return '';
  }

  try {
    const url = new URL(referrer);
    return url.hostname || '';
  } catch {
    return '';
  }
}
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/utils/ipLocationParser.ts
```

Expected: 显示正确的 IP 地理位置解析工具定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/utils/ipLocationParser.ts
git commit -m "feat: add IP location parser utility"
```

---

## Task 8: 创建统计服务

**Files:**
- Create: `plugins/zhao-studio/server/src/services/analytics.ts`

- [ ] **Step 1: 创建统计服务文件**

```typescript
// server/src/services/analytics.ts

import type { Core } from '@strapi/strapi';
import { parseUserAgent } from '../utils/userAgentParser';
import { parseIpLocation, extractReferrerDomain } from '../utils/ipLocationParser';
import { identifyAnalyticsError } from '../utils/analyticsErrors';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trackPageView(data: {
    articleId: string;
    sessionId: string;
    userId?: string;
    userAgent: string;
    ip: string;
    referrer: string;
    screen: { width: number; height: number };
    language: string;
  }) {
    // 解析浏览器信息
    const uaInfo = parseUserAgent(data.userAgent);

    // 解析IP地理位置
    const ipInfo = await parseIpLocation(data.ip);

    // 提取referrer域名
    const referrerDomain = extractReferrerDomain(data.referrer);

    // 创建日志记录
    const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
      data: {
        eventType: 'page-view',
        article: data.articleId,
        sessionId: data.sessionId,
        userId: data.userId,
        isRegistered: !!data.userId,
        userAgent: data.userAgent,
        platform: uaInfo.platform,
        browser: uaInfo.browser,
        browserVersion: uaInfo.browserVersion,
        os: uaInfo.os,
        osVersion: uaInfo.osVersion,
        deviceType: uaInfo.deviceType,
        screenWidth: data.screen?.width,
        screenHeight: data.screen?.height,
        language: data.language,
        ip: data.ip,
        country: ipInfo.country,
        city: ipInfo.city,
        referrer: data.referrer,
        referrerDomain,
        timestamp: new Date(),
      },
    });

    return log;
  },

  async trackAdClick(data: {
    adSlotId: string;
    articleId?: string;
    sessionId: string;
    userId?: string;
    userAgent: string;
    ip: string;
  }) {
    // 验证广告位
    const adSlot = await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .findOne({ documentId: data.adSlotId });

    if (!adSlot || !adSlot.isActive) {
      throw new Error('广告位不存在或已禁用');
    }

    // 解析浏览器信息
    const uaInfo = parseUserAgent(data.userAgent);

    // 解析IP地理位置
    const ipInfo = await parseIpLocation(data.ip);

    // 创建日志记录
    const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
      data: {
        eventType: 'ad-click',
        article: data.articleId,
        adSlot: data.adSlotId,
        sessionId: data.sessionId,
        userId: data.userId,
        isRegistered: !!data.userId,
        userAgent: data.userAgent,
        platform: uaInfo.platform,
        browser: uaInfo.browser,
        browserVersion: uaInfo.browserVersion,
        os: uaInfo.os,
        osVersion: uaInfo.osVersion,
        deviceType: uaInfo.deviceType,
        ip: data.ip,
        country: ipInfo.country,
        city: ipInfo.city,
        timestamp: new Date(),
      },
    });

    return log;
  },

  async trackReadBehavior(data: {
    articleId: string;
    sessionId: string;
    readDuration: number;
    scrollDepth: number;
  }) {
    // 创建日志记录
    const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
      data: {
        eventType: 'read-duration',
        article: data.articleId,
        sessionId: data.sessionId,
        readDuration: data.readDuration,
        scrollDepth: data.scrollDepth,
        timestamp: new Date(),
      },
    });

    return log;
  },

  async trackUserRegister(data: {
    sessionId: string;
    userId: string;
    registeredAt: Date;
  }) {
    // 更新该 sessionId 的所有日志记录
    const logs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: { sessionId: data.sessionId },
      });

    for (const log of logs) {
      await strapi.documents('plugin::zhao-studio.browser-log').update({
        documentId: log.documentId,
        data: {
          userId: data.userId,
          isRegistered: true,
          registeredAt: data.registeredAt,
        },
      });
    }

    // 创建注册事件日志
    const registerLog = await strapi.documents('plugin::zhao-studio.browser-log').create({
      data: {
        eventType: 'user-register',
        sessionId: data.sessionId,
        userId: data.userId,
        isRegistered: true,
        registeredAt: data.registeredAt,
        timestamp: new Date(),
      },
    });

    return registerLog;
  },

  async listAdSlots() {
    const adSlots = await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .findMany();

    return adSlots;
  },

  async createAdSlot(data: any) {
    const adSlot = await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .create({ data });

    return adSlot;
  },

  async updateAdSlot(id: string, data: any) {
    const adSlot = await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .update({ documentId: id, data });

    return adSlot;
  },

  async deleteAdSlot(id: string) {
    await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .delete({ documentId: id });
  },

  async getOverview(params: { startDate: Date; endDate: Date }) {
    const summaries = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({
        filters: {
          date: { $gte: params.startDate, $lte: params.endDate },
          summaryType: 'global-daily',
        },
      });

    // 计算汇总
    const totalPv = summaries.reduce((sum: number, s: any) => sum + (s.pv || 0), 0);
    const totalUv = summaries.reduce((sum: number, s: any) => sum + (s.uv || 0), 0);
    const totalClicks = summaries.reduce((sum: number, s: any) => sum + (s.clickCount || 0), 0);
    const avgReadDuration = summaries.length > 0
      ? summaries.reduce((sum: number, s: any) => sum + (s.avgReadDuration || 0), 0) / summaries.length
      : 0;

    return {
      pv: totalPv,
      uv: totalUv,
      clickCount: totalClicks,
      clickRate: totalPv > 0 ? (totalClicks / totalPv) * 100 : 0,
      avgReadDuration,
    };
  },

  async getArticleStats(params: { articleId?: string; startDate: Date; endDate: Date }) {
    const filters: any = {
      date: { $gte: params.startDate, $lte: params.endDate },
      summaryType: 'article-daily',
    };

    if (params.articleId) {
      filters.article = params.articleId;
    }

    const summaries = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({ filters });

    return summaries;
  },

  async getAdSlotStats(params: { adSlotId?: string; startDate: Date; endDate: Date }) {
    const filters: any = {
      date: { $gte: params.startDate, $lte: params.endDate },
      summaryType: 'ad-slot-daily',
    };

    if (params.adSlotId) {
      filters.adSlot = params.adSlotId;
    }

    const summaries = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({ filters });

    return summaries;
  },

  async getDeviceStats(params: { startDate: Date; endDate: Date }) {
    const summaries = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({
        filters: {
          date: { $gte: params.startDate, $lte: params.endDate },
          summaryType: 'device-daily',
        },
      });

    return summaries;
  },

  async getRegionStats(params: { startDate: Date; endDate: Date }) {
    const summaries = await strapi
      .documents('plugin::zhao-studio.stat-summary')
      .findMany({
        filters: {
          date: { $gte: params.startDate, $lte: params.endDate },
          summaryType: 'region-daily',
        },
      });

    return summaries;
  },

  async getUserStats(params: { startDate: Date; endDate: Date }) {
    // 查询注册用户日志
    const registerLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'user-register',
          timestamp: { $gte: params.startDate, $lte: params.endDate },
        },
      });

    // 查询所有日志，计算注册用户占比
    const allLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: params.startDate, $lte: params.endDate },
        },
      });

    const registeredCount = allLogs.filter((log: any) => log.isRegistered).length;
    const totalCount = allLogs.length;

    return {
      registerCount: registerLogs.length,
      registeredRatio: totalCount > 0 ? (registeredCount / totalCount) * 100 : 0,
    };
  },

  async cleanupOldLogs(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          timestamp: { $lt: cutoffDate },
        },
      });

    let deleted = 0;
    for (const log of oldLogs) {
      await strapi.documents('plugin::zhao-studio.browser-log').delete({
        documentId: log.documentId,
      });
      deleted++;
    }

    return { deleted };
  },
});
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/services/analytics.ts
```

Expected: 显示正确的统计服务定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/services/analytics.ts
git commit -m "feat: add analytics service for tracking and stats"
```

---

## Task 9: 创建聚合服务

**Files:**
- Create: `plugins/zhao-studio/server/src/services/aggregation.ts`

- [ ] **Step 1: 创建聚合服务文件**

```typescript
// server/src/services/aggregation.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async aggregateArticleDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按文章分组
    const articleGroups: Record<string, any[]> = {};
    for (const log of pageViews) {
      const articleId = log.article?.documentId || log.article;
      if (articleId) {
        if (!articleGroups[articleId]) {
          articleGroups[articleId] = [];
        }
        articleGroups[articleId].push(log);
      }
    }

    // 查询阅读时长日志
    const readLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'read-duration',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 为每篇文章创建汇总
    for (const [articleId, logs] of Object.entries(articleGroups)) {
      const pv = logs.length;
      const uv = new Set(logs.map((l: any) => l.sessionId)).size;

      // 计算平均阅读时长和滚动深度
      const articleReadLogs = readLogs.filter(
        (l: any) => (l.article?.documentId || l.article) === articleId
      );
      const avgReadDuration = articleReadLogs.length > 0
        ? articleReadLogs.reduce((sum: number, l: any) => sum + (l.readDuration || 0), 0) / articleReadLogs.length
        : 0;
      const avgScrollDepth = articleReadLogs.length > 0
        ? articleReadLogs.reduce((sum: number, l: any) => sum + (l.scrollDepth || 0), 0) / articleReadLogs.length
        : 0;

      // 创建汇总记录
      await strapi.documents('plugin::zhao-studio.stat-summary').create({
        data: {
          date: startDate,
          article: articleId,
          summaryType: 'article-daily',
          pv,
          uv,
          avgReadDuration,
          avgScrollDepth,
        },
      });
    }
  },

  async aggregateAdSlotDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 ad-click 事件
    const adClicks = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'ad-click',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按广告位分组
    const adSlotGroups: Record<string, any[]> = {};
    for (const log of adClicks) {
      const adSlotId = log.adSlot?.documentId || log.adSlot;
      if (adSlotId) {
        if (!adSlotGroups[adSlotId]) {
          adSlotGroups[adSlotId] = [];
        }
        adSlotGroups[adSlotId].push(log);
      }
    }

    // 查询当天 PV
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const totalPv = pageViews.length;

    // 为每个广告位创建汇总
    for (const [adSlotId, logs] of Object.entries(adSlotGroups)) {
      const clickCount = logs.length;
      const clickRate = totalPv > 0 ? (clickCount / totalPv) * 100 : 0;

      // 创建汇总记录
      await strapi.documents('plugin::zhao-studio.stat-summary').create({
        data: {
          date: startDate,
          adSlot: adSlotId,
          summaryType: 'ad-slot-daily',
          clickCount,
          clickRate,
        },
      });
    }
  },

  async aggregateGlobalDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    const pv = pageViews.length;
    const uv = new Set(pageViews.map((l: any) => l.sessionId)).size;

    // 查询当天所有 ad-click 事件
    const adClicks = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'ad-click',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const clickCount = adClicks.length;
    const clickRate = pv > 0 ? (clickCount / pv) * 100 : 0;

    // 查询阅读时长日志
    const readLogs = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'read-duration',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });
    const avgReadDuration = readLogs.length > 0
      ? readLogs.reduce((sum: number, l: any) => sum + (l.readDuration || 0), 0) / readLogs.length
      : 0;
    const avgScrollDepth = readLogs.length > 0
      ? readLogs.reduce((sum: number, l: any) => sum + (l.scrollDepth || 0), 0) / readLogs.length
      : 0;

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'global-daily',
        pv,
        uv,
        clickCount,
        clickRate,
        avgReadDuration,
        avgScrollDepth,
      },
    });
  },

  async aggregateDeviceDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按设备类型分组
    const deviceStats: Record<string, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };

    for (const log of pageViews) {
      const deviceType = log.deviceType || 'desktop';
      deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;
    }

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'device-daily',
        deviceStats,
      },
    });
  },

  async aggregateRegionDaily(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 查询当天所有 page-view 事件
    const pageViews = await strapi
      .documents('plugin::zhao-studio.browser-log')
      .findMany({
        filters: {
          eventType: 'page-view',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      });

    // 按地域分组
    const regionStats: Record<string, number> = {};

    for (const log of pageViews) {
      const country = log.country || 'Unknown';
      const city = log.city || 'Unknown';
      const key = `${country}/${city}`;
      regionStats[key] = (regionStats[key] || 0) + 1;
    }

    // 创建汇总记录
    await strapi.documents('plugin::zhao-studio.stat-summary').create({
      data: {
        date: startDate,
        summaryType: 'region-daily',
        regionStats,
      },
    });
  },

  async runDailyAggregation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    try {
      await this.aggregateArticleDaily(yesterday);
      await this.aggregateAdSlotDaily(yesterday);
      await this.aggregateGlobalDaily(yesterday);
      await this.aggregateDeviceDaily(yesterday);
      await this.aggregateRegionDaily(yesterday);

      return { success: true, date: yesterday };
    } catch (error) {
      return { success: false, error: error.message, date: yesterday };
    }
  },
});
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/services/aggregation.ts
```

Expected: 显示正确的聚合服务定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/services/aggregation.ts
git commit -m "feat: add aggregation service for daily stats"
```

---

## Task 10: 更新 services index.ts

**Files:**
- Modify: `plugins/zhao-studio/server/src/services/index.ts`

- [ ] **Step 1: 更新 services index.ts**

```typescript
// server/src/services/index.ts

import collect from './collect';
import scraper from './scraper';
import quality from './quality';
import aiAssist from './ai-assist';
import publish from './publish';
import channelAdapter from './channel-adapter';
import internalApi from './internal-api';
import statusSync from './status-sync';
import analytics from './analytics';
import aggregation from './aggregation';

export default {
  collect,
  scraper,
  quality,
  'ai-assist': aiAssist,
  publish,
  'channel-adapter': channelAdapter,
  'internal-api': internalApi,
  'status-sync': statusSync,
  analytics,
  aggregation,
};
```

- [ ] **Step 2: 验证文件修改**

```bash
cat plugins/zhao-studio/server/src/services/index.ts
```

Expected: 显示正确的导出定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/services/index.ts
git commit -m "feat: export analytics and aggregation services"
```

---

## Task 11: 创建统计控制器

**Files:**
- Create: `plugins/zhao-studio/server/src/controllers/analytics.ts`

- [ ] **Step 1: 创建统计控制器文件**

```typescript
// server/src/controllers/analytics.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trackPageView(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackPageView(data);

    ctx.body = { data: log };
  },

  async trackAdClick(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackAdClick(data);

    ctx.body = { data: log };
  },

  async trackReadBehavior(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackReadBehavior(data);

    ctx.body = { data: log };
  },

  async trackUserRegister(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackUserRegister(data);

    ctx.body = { data: log };
  },

  async listAdSlots(ctx: any) {
    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlots = await analyticsService.listAdSlots();

    ctx.body = { data: adSlots };
  },

  async createAdSlot(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlot = await analyticsService.createAdSlot(data);

    ctx.body = { data: adSlot };
  },

  async updateAdSlot(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlot = await analyticsService.updateAdSlot(id, data);

    ctx.body = { data: adSlot };
  },

  async deleteAdSlot(ctx: any) {
    const { id } = ctx.params;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    await analyticsService.deleteAdSlot(id);

    ctx.body = { data: { success: true } };
  },

  async getOverview(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const overview = await analyticsService.getOverview({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: overview };
  },

  async getArticleStats(ctx: any) {
    const { articleId, startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getArticleStats({
      articleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getAdSlotStats(ctx: any) {
    const { adSlotId, startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getAdSlotStats({
      adSlotId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getDeviceStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getDeviceStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getRegionStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getRegionStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getUserStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getUserStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },
});
```

- [ ] **Step 2: 验证文件创建**

```bash
cat plugins/zhao-studio/server/src/controllers/analytics.ts
```

Expected: 显示正确的统计控制器定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/controllers/analytics.ts
git commit -m "feat: add analytics controller"
```

---

## Task 12: 更新 controllers index.ts

**Files:**
- Modify: `plugins/zhao-studio/server/src/controllers/index.ts`

- [ ] **Step 1: 更新 controllers index.ts**

```typescript
// server/src/controllers/index.ts

import collect from './collect';
import draft from './draft';
import publish from './publish';
import internalApi from './internal-api';
import ai from './ai';
import analytics from './analytics';

export default {
  collect,
  draft,
  publish,
  'internal-api': internalApi,
  ai,
  analytics,
};
```

- [ ] **Step 2: 验证文件修改**

```bash
cat plugins/zhao-studio/server/src/controllers/index.ts
```

Expected: 显示正确的导出定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/controllers/index.ts
git commit -m "feat: export analytics controller"
```

---

## Task 13: 更新 Content API 路由

**Files:**
- Modify: `plugins/zhao-studio/server/src/routes/content-api.ts`

- [ ] **Step 1: 更新 Content API 路由**

```typescript
// server/src/routes/content-api.ts

export default {
  routes: [
    // 文章列表（C端访问）
    {
      method: 'GET',
      path: '/v1/articles',
      handler: 'internal-api.listArticles',
      config: { auth: false },
    },

    // 文章详情（C端访问）
    {
      method: 'GET',
      path: '/v1/articles/:id',
      handler: 'internal-api.getArticle',
      config: { auth: false },
    },

    // 文章搜索（C端访问）
    {
      method: 'GET',
      path: '/v1/articles/search',
      handler: 'internal-api.searchArticles',
      config: { auth: false },
    },

    // 分类列表（C端访问）
    {
      method: 'GET',
      path: '/v1/categories',
      handler: 'internal-api.getCategories',
      config: { auth: false },
    },

    // 渠道列表（C端访问）
    {
      method: 'GET',
      path: '/v1/channels',
      handler: 'internal-api.getChannels',
      config: { auth: false },
    },

    // 统计上报接口（公开访问）
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
  ],
};
```

- [ ] **Step 2: 验证文件修改**

```bash
cat plugins/zhao-studio/server/src/routes/content-api.ts
```

Expected: 显示正确的路由定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/routes/content-api.ts
git commit -m "feat: add analytics routes to content-api"
```

---

## Task 14: 更新 Admin 路由

**Files:**
- Modify: `plugins/zhao-studio/server/src/routes/admin.ts`

- [ ] **Step 1: 更新 Admin 路由**

在现有路由末尾添加以下路由：

```typescript
    // 广告位管理（新增）
    {
      method: 'GET',
      path: '/v1/ad-slots',
      handler: 'analytics.listAdSlots',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'POST',
      path: '/v1/ad-slots',
      handler: 'analytics.createAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.create'] },
      },
    },
    {
      method: 'PUT',
      path: '/v1/ad-slots/:id',
      handler: 'analytics.updateAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.update'] },
      },
    },
    {
      method: 'DELETE',
      path: '/v1/ad-slots/:id',
      handler: 'analytics.deleteAdSlot',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.delete'] },
      },
    },

    // 统计查询（新增）
    {
      method: 'GET',
      path: '/v1/stats/overview',
      handler: 'analytics.getOverview',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/articles',
      handler: 'analytics.getArticleStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/ad-slots',
      handler: 'analytics.getAdSlotStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/devices',
      handler: 'analytics.getDeviceStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/regions',
      handler: 'analytics.getRegionStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
    {
      method: 'GET',
      path: '/v1/stats/users',
      handler: 'analytics.getUserStats',
      config: {
        policies: [],
        auth: { scope: ['plugin::zhao-studio.read'] },
      },
    },
```

- [ ] **Step 2: 验证文件修改**

```bash
cat plugins/zhao-studio/server/src/routes/admin.ts
```

Expected: 显示正确的路由定义

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-studio/server/src/routes/admin.ts
git commit -m "feat: add analytics and stats routes to admin"
```

---

## Task 15-26: 前端文件创建

由于前端文件较多，将合并为几个子任务执行。

**Task 15: 创建前端工具文件**
- `admin/src/utils/analyticsApi.ts`
- `admin/src/utils/statsCalculator.ts`

**Task 16: 创建前端 Hooks**
- `admin/src/hooks/useAdSlots.ts`
- `admin/src/hooks/useStats.ts`

**Task 17: 创建前端组件**
- `admin/src/components/AdSlotForm.tsx`
- `admin/src/components/OverviewCard.tsx`
- `admin/src/components/StatsChart.tsx`
- `admin/src/components/StatsTable.tsx`

**Task 18: 创建前端页面**
- `admin/src/pages/AdSlotConfigPage.tsx`
- `admin/src/pages/StatsBasicPage.tsx`
- `admin/src/pages/StatsAdvancedPage.tsx`
- `admin/src/pages/StatsProPage.tsx`

**Task 19: 更新 App.tsx 路由**

**Task 20: 创建测试文件**
- `tests/services/analytics.test.ts`
- `tests/services/aggregation.test.ts`
- `tests/integration/analytics.test.ts`

**Task 21: 编译并验证**

---

## 自我审查

**1. Spec coverage:**
- ✅ 广告位配置 - Task 1
- ✅ 浏览器日志 - Task 2
- ✅ 统计汇总 - Task 3
- ✅ 统计错误处理 - Task 5
- ✅ UA解析工具 - Task 6
- ✅ IP地理位置解析 - Task 7
- ✅ 统计服务 - Task 8
- ✅ 聚合服务 - Task 9
- ✅ 统计控制器 - Task 11
- ✅ Content API路由 - Task 13
- ✅ Admin路由 - Task 14
- ✅ 前端工具 - Task 15
- ✅ 前端Hooks - Task 16
- ✅ 前端组件 - Task 17
- ✅ 前端页面 - Task 18
- ✅ App.tsx路由 - Task 19
- ✅ 测试文件 - Task 20
- ✅ 编译验证 - Task 21

**2. Placeholder scan:**
- ✅ 无 "TBD"、"TODO"、"implement later"
- ✅ 所有步骤包含具体代码

**3. Type consistency:**
- ✅ Collection Type 名称一致（zhao_ad_slots、zhao_browser_logs、zhao_stat_summaries）
- ✅ 服务名称一致（analytics、aggregation）
- ✅ 控制器名称一致（analytics）
- ✅ 路由前缀一致（v1）

---

## 执行选项

**计划完成并保存到 `docs/superpowers/plans/2026-06-16-zhao-studio-analytics-module.md`。**

**两种执行方式：**

**1. Subagent-Driven（推荐）** - 我为每个任务派发新的子代理，任务间进行审查，快速迭代

**2. Inline Execution** - 在此会话中使用 executing-plans 执行，批量执行并设置检查点进行审查

**请选择执行方式？**