# 使用手册重构设计

## 背景

现有使用手册系统存在三个问题：视觉呈现效果不理想（在 UniApp 手机端阅读体验差）、155KB 单文件加载性能不佳、信息结构重复导致查找效率低。用户要求推翻重构，保留所有文档内容不变，优化文件结构、导航系统和视觉呈现。

## 目标

1. 将 155KB 单文件按章节拆分为独立文件，每个 15-25KB
2. 建立统一的导航系统（悬浮目录 + 底部导航）
3. 重新设计 CSS 视觉风格（卡片化、蓝色主色调、清晰层级）
4. 所有手册文档（admin/shao-catalog/user-guide/website）同步拆分
5. 从 admin 手册中删除与 website 手册重叠的内容
6. 入口位置不变：`pages/manual/index`
7. 搜索功能不变，继续支持跨文件全文检索，重复项独立返回

## 文件结构

### website/（内容不变，MD → HTML 拆分）

```
docs/manual/website/
├── index.html              ← 导航首页（卡片式入口）
├── ch1-overview.html       ← 系统总览
├── ch2-article.html        ← 资讯文章
├── ch3-product.html        ← 产品/方案
├── ch4-case.html           ← 落地案例
├── ch5-tutorial.html       ← 教程/操作指南
├── ch6-faq.html            ← 常见问答
├── ch7-compliance.html     ← 合规公示
└── ch8-cases.html          ← 行业示范案例
```

### admin/（删除第 7 章"网站内容管理"和第 14 章"官网中心学习路径"，其余按章节拆分）

```
docs/manual/admin/
├── index.md              ← 导航首页（目录列表）
├── ch1-overview.md       ← 系统概述
├── ch2-login.md          ← 登录与权限
├── ch3-dashboard.md      ← 仪表盘
├── ch4-tenant.md         ← 多租户管理
├── ch5-channel.md        ← 渠道管理
├── ch6-course.md         ← 课程管理
├── ch8-quiz.md           ← 题库管理
├── ch9-points.md         ← 积分管理
├── ch10-system.md        ← 系统管理
├── ch11-media.md         ← 媒体管理
├── ch12-thirdparty.md    ← 第三方配置
└── ch13-faq.md           ← 常见问题
```

### shao-catalog/（按章节拆分）

```
docs/manual/shao-catalog/
├── index.md              ← 导航首页
├── ch1-start.md          ← 快速开始
├── ch2-login.md          ← 账号登录与注册
├── ch3-course.md         ← 课程浏览与学习
├── ch4-quiz.md           ← 答题与积分获取
├── ch5-redeem.md         ← 积分兑换商品
├── ch6-profile.md        ← 个人中心与互动
├── ch7-invite.md         ← 邀请好友赚积分
└── ch8-faq.md            ← 常见问题
```

### user-guide/（按章节拆分）

```
docs/manual/user-guide/
├── index.md              ← 导航首页
├── ch1-overview.md       ← 概述
├── ch2-category.md       ← 课程分类与标签
├── ch3-course.md         ← 课程管理
├── ch4-lesson.md         ← 课时管理
├── ch5-auth.md           ← 用户课程授权
├── ch6-quiz.md           ← 题库管理
├── ch7-exam.md           ← 考试管理
├── ch8-record.md         ← 答题记录与评分
├── ch9-point-rule.md     ← 积分规则配置
├── ch10-point-config.md  ← 积分全局配置
├── ch11-monitor.md       ← 学习数据监控
└── ch12-faq.md           ← 常见问题
```

## 导航系统设计

### Viewer.vue 改动

**悬浮目录按钮（右下角浮标）**
- 方形浮标，蓝色背景，白色"目录"文字
- 点击弹出半屏面板，展示当前章节的二级标题
- 点击目录项滚动到对应位置
- 面板背景半透明遮罩，点击遮罩关闭

**底部导航栏**
- 自动识别当前文件的前后章节
- 显示"上一章"和"下一章"按钮
- 首页时隐藏"上一章"，末章时隐藏"下一章"
- 通过 `getIndexOrder()` 函数从各手册的 `index` 文件解析章节顺序

**章节顺序映射**
- 每个手册在 `index.md`/`index.html` 中定义章节顺序链接
- `viewer.vue` 的 `getIndexOrder()` 解析这些链接，构建前后导航链

## 视觉设计

### 配色方案
- 主色：`#1a56db`（蓝色）
- 背景：`#f5f7fa`（浅灰）
- 卡片背景：`#ffffff`（白色）
- 文本主色：`#303133`
- 文本次要：`#606266`
- 文本辅助：`#909399`

### 样式规范
- 字段卡片：白色背景，圆角 12px，边框 `#e4e7ed`
- 字段名：monospace 字体，加粗
- Badge：必填（红色）、SEO（蓝色）、GEO（绿色）
- Callout：4 种类型（info 蓝色、success 绿色、warning 黄色、danger 红色），左侧 6px 色条
- 表格：横向滚动，表头灰底，边框 `#dcdfe6`
- 代码块：深色背景 `#1e293b`，浅色文字
- 步骤列表：编号圆圈，蓝色背景
- 案例卡片：蓝色渐变头部，白色内容区

### website/index.html 导航首页
- 卡片式布局，每张卡片显示标题 + 简短描述 + GEO 角色标签
- 6 种内容类型卡片 + 5 个行业案例卡片
- 点击卡片跳转到对应章节

## 搜索系统

搜索功能不变，保持现有 `search-index.ts` 的段落级匹配逻辑：

- 支持 `.md` 和 `.html` 文件混合索引
- 同一文档中多个匹配段落独立返回
- 标题匹配优先（score: 100），章节标题匹配次之（score: 50），正文段落匹配（score: 10）
- 搜索结果关键词高亮（`<mark>`）
- 搜索结果上限 100 条

## 实施步骤

1. 重构 `website/index.html` — 拆分为 8 个文件，新建导航首页
2. 重构 `admin/index.md` — 删除网站内容相关章节，按章节拆分
3. 重构 `shao-catalog/index.md` — 按章节拆分
4. 重构 `user-guide/index.md` — 按章节拆分
5. 重构 `viewer.vue` — 添加悬浮目录 + 底部导航
6. 视觉 CSS 统一 — 更新各文档的样式，确保一致性
7. 删旧文件 — 清理旧 `index.md` 文件
8. 测试验证 — 确保所有文档可正常打开、导航、搜索