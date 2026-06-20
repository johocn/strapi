# zhao-point 后台管理接口

## 路由概览

| 类型 | 前缀 | 认证 |
|------|------|------|
| Strapi Admin | `/admin/plugins/zhao-point/` | Strapi admin session |
| Content-API 公开 | `/api/zhao-point/v1/` | 无 |
| Content-API 用户 | `/api/zhao-point/v1/my/` | zhao-auth JWT |
| Content-API 管理员 | `/api/zhao-point/v1/admin/` | zhao-auth JWT + 角色 |

详细接口文档见：
- [backend-content-api.md](./backend-content-api.md)
- [frontend-api.md](./frontend-api.md)
