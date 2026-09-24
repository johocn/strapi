# zhao-channel 文档编写设计

## 目标

参照 zhao-course 的文档结构，为 zhao-channel 编写更详细的 API 文档，渠道与邀请码分文件编写。

## 文件结构

```
plugins/zhao-channel/docs/
├── backend-admin-api.md        # Strapi Admin 后台路由 + 管理员 Content-API
├── backend-channel.md          # 渠道 Content-API（公开/用户/成员/管理员/所有者 五层）
├── backend-invite.md           # 邀请码与分销 Content-API（独立文件）
└── frontend-api.md             # 前端调用指南
```

## 各文件内容

### backend-admin-api.md

1. 路由概览表（类型/前缀/认证）
2. Strapi Admin 后台路由（渠道 CRUD、成员管理、权限管理、邀请记录管理）
3. Admin Content-API 路由（渠道 CRUD、子渠道管理、层级树、成员邀请、权限批量授权）

### backend-channel.md

1. 三层路由架构说明（公开/用户/成员/管理员/所有者 五层）
2. 认证方式（channel-auth 中间件 + zhao-auth JWT）
3. 通用查询参数
4. 公开路由（获取公开信息、验证邀请码、公开注册）
5. 用户路由（我的渠道、注册、验证、可访问渠道）
6. 成员路由（渠道详情、网络、统计、成员列表）
7. 管理员路由（创建渠道、更新渠道、邀请成员、批量授权）
8. 所有者路由（删除渠道）
9. 渠道层级体系（root → regional → store → leaf）
10. 每个端点包含：方法、路径、请求体 schema（zod 校验规则）、响应示例、错误码

### backend-invite.md

1. 邀请码生成机制（自动生成唯一码）
2. 验证邀请码流程
3. 注册流程（含用户自动创建 + 渠道创建 + 成员创建）
4. 分销链概念（深度、路径、上级/下级关系）
5. 分销统计接口
6. 完整流程图（文字描述）
7. 用户路由（分销链、下级列表、分销统计）
8. 管理员路由（邀请记录 CRUD、使用邀请码）

### frontend-api.md

1. 接口分类表（类型/URL 前缀/认证方式）
2. C 端公开接口汇总
3. C 端用户接口汇总
4. C 端管理员接口汇总
5. 数据转换函数
6. 前端集成代码示例（注册流程、渠道浏览、邀请码使用）
7. 错误码汇总

## 与 zhao-course 文档的差异

| 维度 | zhao-course | zhao-channel |
|------|------------|-------------|
| 文件数 | 3 | 4（邀请码独立） |
| 端点详细度 | 方法+路径+说明 | 方法+路径+请求体 schema+响应示例+错误码 |
| 路由层级 | 3 层 | 5 层 |
| 业务概念 | 无需专门解释 | 需解释渠道层级+邀请码分销体系 |
