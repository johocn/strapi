# zhao-studio API手册

## Admin API

### 采集源管理

#### 查询采集源列表

```
GET /admin/plugins/zhao-studio/sources
```

**响应**

```json
{
  "data": [
    {
      "id": 1,
      "name": "新浪财经",
      "url": "https://finance.sina.com.cn/roll/",
      "type": "template",
      "isActive": true
    }
  ]
}
```

### 发布平台管理

#### 查询发布平台列表

```
GET /admin/plugins/zhao-studio/platforms
```

**响应**

```json
{
  "data": [
    {
      "id": 1,
      "name": "头条",
      "type": "toutiao",
      "isActive": true
    }
  ]
}
```

## Content API

### C端文章查询

#### 查询文章列表

```
GET /api/zhao-studio/articles
```

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| channel | string | 渠道编码 |
| category | string | 分类 |
| tag | string | 标签ID |
| page | integer | 页码 |
| pageSize | integer | 每页数量 |

**响应**

```json
{
  "data": [
    {
      "id": 1,
      "title": "文章标题",
      "content": "文章内容",
      "status": "published"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```