## 标签与 SEO 关系说明

官网中心的内容支持两种 SEO 关键词来源：

### 1. 自动模式（推荐）

从关联标签的 slug 自动生成 meta keywords。

- **渲染逻辑：** `meta keywords = tags.map(t => t.slug).join(',')`
- **适用场景：** 常规内容（文章、产品、案例等）
- **优点：** 无需手动维护关键词，标签变更自动同步

### 2. 手动覆盖模式

填写内容的 `seoKeywords` 字段。

- **渲染逻辑：** `meta keywords = seoKeywords || tags.map(t => t.slug).join(',')`
- **适用场景：** 着陆页、营销活动页等需要精确控制关键词的页面
- **优点：** 灵活覆盖自动模式

### 标签的 SEO 价值

| 字段 | SEO 作用 | 建议 |
|---|---|---|
| `tag.slug` | SEO 关键词载体 | 建议英文/拼音，避免中文 |
| `tag-group` | 语义化分组，用于 URL 结构与面包屑 | 如"解决方案/行业/产品线" |
| `tag.isPublic` | 公共标签跨站复用，站点标签仅本站可见 | admin 创建公共标签，站点管理员创建站点标签 |

### 公共标签 vs 站点标签

- **公共标签**（`isPublic=true` 且 `site=null`）：由 admin 创建，所有租户共享，适合通用分类（如"行业资讯"）
- **站点标签**（`isPublic=false` 且 `site=<某站点>`）：由站点管理员创建，仅本站可见，适合站点特色内容

非法组合（`isPublic=true` 且 `site=<某站点>`，或 `isPublic=false` 且 `site=null`）会被后端拒绝。
