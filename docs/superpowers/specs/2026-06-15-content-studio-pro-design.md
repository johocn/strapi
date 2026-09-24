# zhao-studio 插件设计文档

**日期**: 2026-06-15
**插件名称**: zhao-studio
**定位**: 为内容团队提供「定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计」的全链路工具

---

## 一、插件定位与范围

### 1.1 核心定位

**名称**: zhao-studio
**定位**: 为内容团队提供「**定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计**」的全链路工具

**核心变化**: 从单纯的"发布工具"升级为包含**C端展示、分类标签、点击统计**的内容中台。

### 1.2 开发阶段划分

**第一阶段（本次设计）**:
- 模块1：智能采集（半自动采集）
- 模块2：草稿加工（人+AI）
- 模块3：多渠道发布（内部生产）
- 模块4：C端内容分发（基础实现）

**第二阶段（后续迭代）**:
- 模块5：浏览器信息与广告点击统计

### 1.3 明确边界

- ✅ **采集是半自动的**（人工选标题），**不做无差别全自动爬虫**
- ✅ **发布依赖Strapi原生系统**，此插件不重写发布内核
- ✅ **统计只针对本站文章内广告**，不统计外部独立广告
- ❌ **不做**基于用户行为的个性化推荐算法
- ❌ **不做**跨平台的用户身份打通（不涉及SSO）

---

## 二、整体架构设计

### 2.1 技术架构

```
zhao-studio/
├── admin/src/              # 前端管理界面
│   ├── pages/
│   │   ├── CollectPage.tsx      # 采集管理页面
│   │   ├── DraftPage.tsx        # 草稿加工页面
│   │   ├── PublishPage.tsx      # 发布管理页面
│   │   ├── ConfigPage.tsx       # 配置页面
│   │   └── PlatformConfig.tsx   # 平台配置页面
│   │   └── AccountConfig.tsx    # 账号配置页面
│   └── components/
│       ├── SourceConfig.tsx     # 采集源配置组件
│       ├── TitleSelector.tsx    # 标题选择器组件
│       ├── ContentPreview.tsx   # 内容预览组件
│       └── AIAssistant.tsx      # AI辅助组件
├── server/src/              # 后端服务
│   ├── content-types/       # Collection Types
│   │   ├── article-draft.json     # 草稿文章
│   │   ├── collect-source.json    # 采集源配置
│   │   ├── collect-task.json      # 采集任务
│   │   ├── publish-platform.json  # 发布平台类型
│   │   ├── publish-account.json   # 发布账号
│   │   ├── publish-record.json    # 发布记录
│   │   ├── knowledge-point-index.json  # 知识点索引
│   ├── services/
│   │   ├── collect.ts        # 采集服务
│   │   ├── ai-assist.ts      # AI辅助服务
│   │   ├── publish.ts        # 发布服务
│   │   ├── channel-adapter.ts # 渠道适配器
│   │   ├── internal-api.ts   # 内部API服务
│   │   ├── status-sync.ts    # 状态同步服务
│   ├── controllers/
│   │   ├── collect.ts        # 采集控制器
│   │   ├── draft.ts          # 草稿控制器
│   │   ├── publish.ts        # 发布控制器
│   │   ├── internal-api.ts   # 内部API控制器
│   └── routes/
│       ├── admin.ts          # Admin API路由
│       └── content-api.ts    # Content API路由
```

### 2.2 核心流程

**生产侧闭环**:
```
采集编辑配置网址 → 抓取标题列表 → 勾选入库 → 生成原始草稿
内容编辑加工 → 打标签/分类 → 选择账号发布 → 状态同步
```

**消费侧闭环**:
```
C端用户访问 → 前端API请求Strapi（带渠道/分类/标签参数） → 返回文章列表 → 用户浏览
```

### 2.3 依赖关系

- 依赖 Strapi 原生的 Collection Type 系统
- 依赖 Strapi 原生的发布系统（不重写发布内核）
- 依赖 zhao-tag 插件的标签系统（tag-index）
- 依赖 zhao-channel 插件的渠道系统（权限控制）
- 可选依赖：用户配置的AI服务API Key

---

## 三、数据模型设计

### 3.1 核心 Collection Types

#### 3.1.1 `article-draft` (草稿文章)

```json
{
  "kind": "collectionType",
  "collectionName": "article_drafts",
  "info": {
    "singularName": "article-draft",
    "pluralName": "article-drafts",
    "displayName": "草稿文章"
  },
  "attributes": {
    "title": { "type": "string", "required": true },
    "content": { "type": "richtext", "required": true },
    "sourceUrl": { "type": "string" },
    "sourceTitle": { "type": "string" },
    "sourcePublishedAt": { "type": "datetime" },
    "sourceAuthor": { "type": "string" },
    "category": { "type": "string" },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "processing", "ready", "published"],
      "default": "draft"
    },
    "aiProcessed": { "type": "boolean", "default": false },
    "aiSummary": { "type": "text" },
    "aiOptimizedTitle": { "type": "string" },
    "publishedAt": { "type": "datetime" },
    "publishRecords": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::publish-record.publish-record",
      "mappedBy": "article"
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
```

#### 3.1.2 `collect-source` (采集源配置)

```json
{
  "kind": "collectionType",
  "collectionName": "collect_sources",
  "info": {
    "singularName": "collect-source",
    "pluralName": "collect-sources",
    "displayName": "采集源"
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "url": { "type": "string", "required": true },
    "type": {
      "type": "enumeration",
      "enum": ["template", "custom"],
      "default": "template"
    },
    "template": { "type": "string" },
    "titleSelector": { "type": "string" },
    "contentSelector": { "type": "string" },
    "authorSelector": { "type": "string" },
    "dateSelector": { "type": "string" },
    "isActive": { "type": "boolean", "default": true },
    "lastCollectedAt": { "type": "datetime" }
  }
}
```

#### 3.1.3 `collect-task` (采集任务)

```json
{
  "kind": "collectionType",
  "collectionName": "collect_tasks",
  "info": {
    "singularName": "collect-task",
    "pluralName": "collect-tasks",
    "displayName": "采集任务"
  },
  "attributes": {
    "source": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::collect-source.collect-source"
    },
    "titles": { "type": "json" },
    "selectedTitles": { "type": "json" },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "fetching_titles", "waiting_selection", "fetching_content", "completed", "failed"],
      "default": "pending"
    },
    "error": { "type": "text" },
    "retryCount": { "type": "integer", "default": 0 },
    "createdAt": { "type": "datetime" }
  }
}
```

#### 3.1.4 `publish-platform` (发布平台类型)

```json
{
  "kind": "collectionType",
  "collectionName": "publish_platforms",
  "info": {
    "singularName": "publish-platform",
    "pluralName": "publish-platforms",
    "displayName": "发布平台"
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "type": {
      "type": "enumeration",
      "enum": ["toutiao", "xiaohongshu", "wechat", "custom", "internal"],
      "required": true
    },
    "description": { "type": "text" },
    "isActive": { "type": "boolean", "default": true }
  }
}
```

#### 3.1.5 `publish-account` (发布账号)

```json
{
  "kind": "collectionType",
  "collectionName": "publish_accounts",
  "info": {
    "singularName": "publish-account",
    "pluralName": "publish-accounts",
    "displayName": "发布账号"
  },
  "attributes": {
    "name": { "type": "string", "required": true },
    "platform": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::publish-platform.publish-platform"
    },
    "config": { "type": "json" },
    "isActive": { "type": "boolean", "default": true },
    "lastPublishedAt": { "type": "datetime" }
  }
}
```

#### 3.1.6 `publish-record` (发布记录)

```json
{
  "kind": "collectionType",
  "collectionName": "publish_records",
  "info": {
    "singularName": "publish-record",
    "pluralName": "publish-records",
    "displayName": "发布记录"
  },
  "attributes": {
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::article-draft.article-draft"
    },
    "account": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::publish-account.publish-account"
    },
    "externalId": { "type": "string" },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "success", "failed"],
      "default": "pending"
    },
    "error": { "type": "text" },
    "retryCount": { "type": "integer", "default": 0 },
    "publishedAt": { "type": "datetime" }
  }
}
```

#### 3.1.7 `knowledge-point-index` (知识点索引)

```json
{
  "kind": "collectionType",
  "collectionName": "knowledge_point_indices",
  "info": {
    "singularName": "knowledge-point-index",
    "pluralName": "knowledge-point-indices",
    "displayName": "知识点索引"
  },
  "attributes": {
    "targetType": { "type": "string", "required": true },
    "targetId": { "type": "string", "required": true },
    "knowledgePoint": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.knowledge-point"
    }
  }
}
```

### 3.2 数据关系图

```
collect-source (1) → collect-task (N)
collect-task → article-draft (临时状态，确认后入库)
article-draft (1) → publish-record (N)
publish-platform (1) → publish-account (N)
publish-account (1) → publish-record (N)
article-draft → tag-index (通过 zhao-tag 关联标签)
article-draft → knowledge-point-index (关联知识点)
```

### 3.3 集成现有插件

**zhao-tag 集成**:
- 使用 `tag-index` 系统关联标签
- `targetType`: `"article-draft"`
- `targetId`: 文章的 `documentId`
- 调用 `zhao-tag` 的 `tag-index.sync()` 方法同步标签

**zhao-channel 集成**:
- 内部渠道发布时关联 `zhao-channel` 的渠道编码
- 使用 `zhao-channel` 的权限控制机制（用户可访问的渠道）

---

## 四、采集模块设计

### 4.1 采集流程

```
编辑配置采集源 → 系统抓取标题列表 → 编辑勾选 → 抓取完整内容 → 展示内容质量 → 编辑确认入库
```

### 4.2 核心组件

#### 4.2.1 采集源配置服务 (`collect-source`)

**预设网站模板**:
```typescript
const websiteTemplates = {
  "sina-finance": {
    name: "新浪财经",
    urlPattern: "https://finance.sina.com.cn/roll/",
    titleSelector: ".news-item h2 a",
    contentSelector: ".article-content",
    authorSelector: ".article-author",
    dateSelector: ".article-time"
  },
  "sohu-tech": {
    name: "搜狐科技",
    urlPattern: "https://it.sohu.com/",
    titleSelector: ".news-list li a",
    contentSelector: ".article-body",
    authorSelector: ".author-name",
    dateSelector: ".publish-time"
  }
};
```

**自定义配置**:
- 用户输入URL + CSS选择器
- 系统验证选择器有效性
- 支持手动测试抓取

#### 4.2.2 标题抓取服务 (`collect-title`)

**核心逻辑**:
```typescript
async function fetchTitles(sourceId: string) {
  const source = await strapi.documents('api::collect-source.collect-source')
    .findOne({ documentId: sourceId });

  // 1. 根据模板或自定义选择器抓取标题列表
  const titles = await scrapeTitles(source.url, source.titleSelector);

  // 2. 去重、过滤
  const filteredTitles = filterDuplicates(titles);

  // 3. 存入 collect-task
  const task = await strapi.documents('api::collect-task.collect-task')
    .create({
      data: {
        source: sourceId,
        titles: filteredTitles,
        status: 'waiting_selection'
      }
    });

  return task;
}
```

#### 4.2.3 内容抓取服务 (`collect-content`)

**核心逻辑**:
```typescript
async function fetchContent(taskId: string, selectedTitles: string[]) {
  const task = await strapi.documents('api::collect-task.collect-task')
    .findOne({ documentId: taskId });

  // 1. 更新任务状态
  await strapi.documents('api::collect-task.collect-task')
    .update({ documentId: taskId, data: { status: 'fetching_content' } });

  // 2. 抓取选中文章的完整内容
  const contents = [];
  for (const titleUrl of selectedTitles) {
    const content = await scrapeContent(titleUrl, task.source);
    contents.push({
      title: content.title,
      content: content.body,
      sourceUrl: titleUrl,
      sourceAuthor: content.author,
      sourcePublishedAt: content.date,
      qualityScore: calculateQuality(content)
    });
  }

  // 3. 存入临时状态
  await strapi.documents('api::collect-task.collect-task')
    .update({ documentId: taskId, data: { selectedTitles: contents } });

  return contents;
}
```

#### 4.2.4 内容质量评估 (`quality-score`)

**评估维度**:
- 文字长度（最少500字）
- 图片数量（至少1张）
- 格式完整性（标题、正文、作者、时间）
- 内容原创度（可选，通过AI检测）

**评分规则**:
```typescript
function calculateQuality(content) {
  let score = 0;
  if (content.body.length >= 500) score += 30;
  if (content.images && content.images.length >= 1) score += 20;
  if (content.author) score += 10;
  if (content.date) score += 10;
  if (content.title && content.title.length >= 10) score += 10;
  return score; // 最高80分
}
```

#### 4.2.5 确认入库服务 (`confirm-import`)

**核心逻辑**:
```typescript
async function confirmImport(taskId: string, confirmedContents: string[]) {
  const task = await strapi.documents('api::collect-task.collect-task')
    .findOne({ documentId: taskId });

  // 1. 创建草稿文章
  for (const content of confirmedContents) {
    await strapi.documents('api::article-draft.article-draft')
      .create({
        data: {
          title: content.title,
          content: content.content,
          sourceUrl: content.sourceUrl,
          sourceAuthor: content.sourceAuthor,
          sourcePublishedAt: content.sourcePublishedAt,
          status: 'draft',
          category: '',
          aiProcessed: false
        }
      });
  }

  // 2. 更新任务状态
  await strapi.documents('api::collect-task.collect-task')
    .update({ documentId: taskId, data: { status: 'completed' } });

  return { imported: confirmedContents.length };
}
```

### 4.3 前端界面组件

- `SourceConfig.tsx`: 采集源配置（预设模板 + 自定义）
- `TitleSelector.tsx`: 标题列表展示（勾选、搜索、分页）
- `ContentPreview.tsx`: 内容预览（质量评分、确认入库）

---

## 五、AI辅助设计

### 5.1 AI功能定位

- 可选集成，用户配置API Key后启用
- 内置国内AI服务（阿里云通义千问、百度文心一言、腾讯混元、讯飞星火）
- 也支持自定义接口
- 辅助编辑加工，不替代人工决策

### 5.2 核心AI功能

#### 5.2.1 摘要生成 (`ai-summary`)

**功能描述**:
- 自动生成文章摘要（100-200字）
- 支持自定义摘要长度
- 支持多语言摘要

**实现逻辑**:
```typescript
async function generateSummary(articleId: string, options?: { length?: number }) {
  const article = await strapi.documents('api::article-draft.article-draft')
    .findOne({ documentId: articleId });

  const aiService = strapi.plugin('zhao-studio').service('ai-assist');

  const summary = await aiService.callAI({
    prompt: `请为以下文章生成${options?.length || 150}字的摘要：\n\n${article.content}`,
    type: 'summary'
  });

  await strapi.documents('api::article-draft.article-draft')
    .update({ documentId: articleId, data: { aiSummary: summary } });

  return summary;
}
```

#### 5.2.2 标题优化 (`ai-title-optimize`)

**功能描述**:
- 优化标题吸引力（增加点击率）
- 支持不同风格（正式、轻松、震惊）
- 保留原标题供对比

#### 5.2.3 语气改写 (`ai-rewrite`)

**功能描述**:
- 改写文章语气（正式、轻松、幽默）
- 保持内容不变，调整表达方式
- 支持批量改写

#### 5.2.4 繁简转换 (`ai-convert`)

**功能描述**:
- 简体转繁体、繁体转简体
- 保持专业术语准确性
- 支持批量转换

### 5.3 AI服务配置

```typescript
interface AIConfig {
  enabled: boolean;
  provider: 'qwen' | 'wenxin' | 'hunyuan' | 'spark' | 'custom';
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
```

### 5.4 国内AI服务提供商

#### 5.4.1 阿里云通义千问
- **API文档**: https://help.aliyun.com/document_detail/2400395.html
- **模型**: qwen-turbo、qwen-plus、qwen-max
- **特点**: 速度快、成本低、支持长文本

#### 5.4.2 百度文心一言
- **API文档**: https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html
- **模型**: ERNIE-Bot、ERNIE-Bot-turbo
- **特点**: 中文理解强、支持多轮对话

#### 5.4.3 腾讯混元
- **API文档**: https://cloud.tencent.com/document/product/1729
- **模型**: hunyuan-lite、hunyuan-standard
- **特点**: 安全合规、支持企业定制

#### 5.4.4 讯飞星火
- **API文档**: https://www.xfyun.cn/doc/spark/index.html
- **模型**: spark-v1.5、spark-v2.0
- **特点**: 语音交互强、教育场景优化

### 5.5 核心服务实现

```typescript
// server/src/services/ai-assist.ts
export default ({ strapi }) => ({
  async callAI(params: { prompt: string; type: string }) {
    const config = strapi.config.get('plugin.zhao-studio.ai');

    if (!config.enabled) {
      throw new Error('AI功能未启用');
    }

    switch (config.provider) {
      case 'qwen':
        return await this.callQwen(params, config);
      case 'wenxin':
        return await this.callWenxin(params, config);
      case 'hunyuan':
        return await this.callHunyuan(params, config);
      case 'spark':
        return await this.callSpark(params, config);
      case 'custom':
        return await this.callCustom(params, config);
      default:
        throw new Error('未知的AI服务提供商');
    }
  },

  async callQwen(params, config) {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'qwen-turbo',
        input: { prompt: params.prompt },
        parameters: { max_tokens: config.maxTokens || 2000 }
      })
    });
    return response.json();
  }
});
```

### 5.6 前端界面组件

- `AIAssistant.tsx`: AI辅助面板（摘要、标题优化、改写、转换）
- `AIConfig.tsx`: AI配置页面（启用/禁用、API Key、模型选择）

---

## 六、发布模块设计

### 6.1 发布流程

```
草稿文章 → 编辑加工 → 设置分类/标签 → 选择发布账号（多选） → 发布到多个账号 → 状态同步
```

### 6.2 关键设计修正

**修正点**:
- 一个外部渠道可以有多个账号（多个API密钥）
- 一篇文章可以关联多个渠道（多个账号）

### 6.3 核心组件

#### 6.3.1 发布平台配置 (`publish-platform`)

**预设平台类型**:
- 头条
- 小红书
- 公众号
- 内部渠道
- 自定义渠道

#### 6.3.2 发布账号配置 (`publish-account`)

**账号配置示例**:

**头条账号1**:
```json
{
  "name": "头条主账号",
  "platform": "头条",
  "config": {
    "apiKey": "API_KEY_1",
    "apiSecret": "API_SECRET_1",
    "endpoint": "https://open.toutiao.com/api/v1/article/create"
  }
}
```

**头条账号2**:
```json
{
  "name": "头条副账号",
  "platform": "头条",
  "config": {
    "apiKey": "API_KEY_2",
    "apiSecret": "API_SECRET_2",
    "endpoint": "https://open.toutiao.com/api/v1/article/create"
  }
}
```

#### 6.3.3 发布服务 (`publish-service`)

**核心逻辑**:
```typescript
async function publishArticle(articleId: string, accountIds: string[]) {
  const article = await strapi.documents('api::article-draft.article-draft')
    .findOne({ documentId: articleId });

  // 1. 验证文章状态
  if (article.status !== 'ready') {
    throw new Error('文章未准备好发布');
  }

  // 2. 验证账号配置
  const accounts = await validateAccounts(accountIds);

  // 3. 执行发布（支持多账号）
  const results = [];
  for (const account of accounts) {
    const result = await publishToAccount(article, account);
    results.push(result);

    // 4. 记录发布结果（每个账号一条记录）
    await strapi.documents('api::publish-record.publish-record')
      .create({
        data: {
          article: articleId,
          account: account.id,
          externalId: result.externalId,
          status: result.success ? 'success' : 'failed',
          error: result.error,
          publishedAt: new Date()
        }
      });
  }

  // 5. 更新文章状态
  const successCount = results.filter(r => r.success).length;
  if (successCount > 0) {
    await strapi.documents('api::article-draft.article-draft')
      .update({
        documentId: articleId,
        data: {
          status: 'published',
          publishedAt: new Date()
        }
      });
  }

  return results;
}
```

#### 6.3.4 渠道发布适配器 (`channel-adapter`)

**适配器模式**:
```typescript
export default ({ strapi }) => ({
  async publish(article: any, account: any) {
    switch (account.platform.type) {
      case 'toutiao':
        return await this.publishToToutiao(article, account);
      case 'xiaohongshu':
        return await this.publishToXiaohongshu(article, account);
      case 'wechat':
        return await this.publishToWechat(article, account);
      case 'internal':
        return await this.publishToInternal(article, account);
      case 'custom':
        return await this.publishToCustom(article, account);
      default:
        throw new Error('未知的渠道类型');
    }
  },

  async publishToToutiao(article, account) {
    const response = await fetch(account.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content
      })
    });

    const result = await response.json();
    return {
      success: result.success,
      externalId: result.data?.article_id,
      error: result.message
    };
  },

  async publishToInternal(article, account) {
    const internalRecord = await strapi.documents('api::internal-article.internal-article')
      .create({
        data: {
          article: article.id,
          channelCode: account.config.channelCode,
          status: 'published',
          publishedAt: new Date()
        }
      });

    return {
      success: true,
      externalId: internalRecord.id,
      accessUrl: `/api/zhao-studio/articles/${internalRecord.id}`
    };
  }
});
```

#### 6.3.5 内部API服务 (`internal-api`)

**C端访问接口**:
```typescript
// server/src/routes/content-api.ts
{
  method: 'GET',
  path: '/articles',
  handler: 'internalApi.listArticles',
  config: {
    auth: false
  }
},
{
  method: 'GET',
  path: '/articles/:id',
  handler: 'internalApi.getArticle',
  config: {
    auth: false
  }
}
```

**查询逻辑**:
```typescript
async function listArticles(filters: {
  channel?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  // 1. 根据渠道过滤
  if (filters.channel) {
    const channelArticles = await strapi.documents('api::internal-article.internal-article')
      .findMany({ filters: { channelCode: filters.channel } });
  }

  // 2. 根据分类过滤
  if (filters.category) {
    const categoryArticles = await strapi.documents('api::article-draft.article-draft')
      .findMany({ filters: { category: filters.category } });
  }

  // 3. 根据标签过滤（使用zhao-tag的tag-index）
  if (filters.tag) {
    const tagIndices = await strapi.plugin('zhao-tag').service('tag-index')
      .searchByTag(filters.tag, 'article-draft');
  }

  // 4. 组合查询结果
  // 5. 分页返回
}
```

#### 6.3.6 状态同步服务 (`status-sync`)

**核心逻辑**:
```typescript
async function syncPublishStatus(articleId: string) {
  const records = await strapi.documents('api::publish-record.publish-record')
    .findMany({ filters: { article: articleId } });

  // 1. 检查各渠道发布状态
  for (const record of records) {
    if (record.status === 'success') {
      const externalStatus = await checkExternalStatus(record);
      if (externalStatus.deleted) {
        await strapi.documents('api::publish-record.publish-record')
          .update({ documentId: record.id, data: { status: 'failed', error: '外部平台文章已删除' } });
      }
    }
  }

  // 2. 更新文章状态
  const successCount = records.filter(r => r.status === 'success').length;
  const totalCount = records.length;

  if (successCount === totalCount) {
    await strapi.documents('api::article-draft.article-draft')
      .update({ documentId: articleId, data: { status: 'published' } });
  } else if (successCount === 0) {
    await strapi.documents('api::article-draft.article-draft')
      .update({ documentId: articleId, data: { status: 'failed' } });
  }
}
```

### 6.4 前端界面组件

- `PublishPage.tsx`: 发布管理页面（选择账号、发布、状态查看）
- `PlatformConfig.tsx`: 平台配置页面（预设平台类型）
- `AccountConfig.tsx`: 账号配置页面（一个平台可配置多个账号）

---

## 七、错误处理与测试策略

### 7.1 错误处理策略

#### 7.1.1 采集模块错误处理

**错误类型**:
- 网络错误：抓取超时、连接失败
- 选择器错误：CSS选择器无效、页面结构变化
- 内容错误：内容质量低、格式不完整
- 权限错误：目标网站禁止抓取

**错误码定义**:
```typescript
export const CollectErrors = {
  NETWORK_ERROR: {
    code: 'COLLECT_001',
    message: '网络连接失败，请检查URL是否正确',
    retry: true,
    maxRetries: 3
  },
  SELECTOR_ERROR: {
    code: 'COLLECT_002',
    message: 'CSS选择器无效，请检查选择器配置',
    retry: false
  },
  CONTENT_ERROR: {
    code: 'COLLECT_003',
    message: '内容质量不符合要求',
    retry: false,
    warning: true
  },
  PERMISSION_ERROR: {
    code: 'COLLECT_004',
    message: '目标网站禁止抓取',
    retry: false
  }
};
```

#### 7.1.2 AI辅助错误处理

**错误类型**:
- API调用失败：API Key无效、服务不可用
- Token超限：内容长度超过限制
- 响应错误：AI返回格式不正确

**降级策略**:
- 人工编辑
- 分段处理
- 通知用户

#### 7.1.3 发布模块错误处理

**错误类型**:
- 配置错误：账号配置无效、API密钥过期
- 发布失败：外部平台拒绝、网络错误
- 状态同步错误：外部平台删除文章

### 7.2 测试策略

#### 7.2.1 单元测试

**测试范围**:
- 采集服务：标题抓取、内容抓取、质量评估
- AI服务：摘要生成、标题优化、改写
- 发布服务：账号验证、发布逻辑、状态同步

#### 7.2.2 集成测试

**测试范围**:
- 采集流程：配置采集源 → 抓取标题 → 选择 → 抓取内容 → 入库
- 发布流程：选择账号 → 发布 → 状态同步
- AI流程：配置AI → 调用AI → 处理结果

#### 7.2.3 E2E测试

**测试范围**:
- 用户操作流程：配置采集源 → 抓取 → 编辑 → 发布
- 错误处理流程：模拟错误 → 验证降级策略

#### 7.2.4 性能测试

**测试指标**:
- 采集速度：每分钟抓取100个标题
- AI响应时间：平均响应时间 < 5秒
- 发布成功率：> 95%

---

## 八、实施计划

### 8.1 第一阶段开发任务

**任务1：搭建插件基础结构**
- 创建插件目录结构
- 配置 Strapi 插件规范
- 创建基础 Collection Types

**任务2：实现采集模块**
- 实现采集源配置服务
- 实现标题抓取服务
- 实现内容抓取服务
- 实现内容质量评估
- 实现确认入库服务
- 创建前端界面组件

**任务3：实现AI辅助模块**
- 实现AI服务配置
- 实现摘要生成功能
- 实现标题优化功能
- 实现语气改写功能
- 实现繁简转换功能
- 创建前端界面组件

**任务4：实现发布模块**
- 实现发布平台配置
- 实现发布账号配置
- 实现发布服务
- 实现渠道适配器
- 实现内部API服务
- 实现状态同步服务
- 创建前端界面组件

**任务5：集成现有插件**
- 集成 zhao-tag 标签系统
- 集成 zhao-channel 渠道系统

**任务6：编写测试**
- 单元测试
- 集成测试
- E2E测试

### 8.2 第二阶段开发任务

**任务1：实现浏览器信息采集**
- 记录 userAgent、platform、screenResolution、ip、referrer
- 记录文章阅读行为（readDuration、scrollDepth）

**任务2：实现广告点击统计**
- 记录产品广告点击数据
- 实现统计看板

**任务3：实现C端分发优化**
- 多维度查询优化
- 排序与分页优化

---

## 九、总结

Content Studio Pro 插件是一个功能完善的内容中台工具，涵盖了从采集到分发再到统计的全链路。通过分阶段开发，第一阶段聚焦生产侧核心闭环，第二阶段迭代消费侧和统计功能。

**核心优势**:
- 半自动采集，避免无差别爬虫
- AI辅助加工，提升编辑效率
- 多账号发布，支持多渠道分发
- 内部API渠道，支持C端展示
- 集成现有插件，避免重复建设

**技术特点**:
- 遵循 Strapi 插件规范
- 集成 zhao-tag 和 zhao-channel
- 优先国内AI服务
- 完善的错误处理和测试策略