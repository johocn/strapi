# 权限管理

admin 管理角色、用户权限、渠道权限的流程。

## 角色层级

| 角色 | level | 职责范围 |
|---|---|---|
| admin | 100 | 管理一切 |
| channel-admin | 50 | 管理自己归属渠道关联的租户 |
| plugin-manager | 30 | 管理细粒度配置（site-config） |
| student | 10 | C 端学员（不可登录后台） |

层级校验规则：低 level 角色不能管理高 level 角色，同级不能互相管理。

## 步骤

1. 创建自定义角色 → `/pages/system/role-management`
   - 点击"新建角色"
   - 填写角色名、显示名、描述
   - 勾选权限点（从权限树选择）
   - level 默认 50，admin 可调整

2. 分配用户角色 → `/pages/system/user-roles`
   - 选择目标用户
   - 选择角色（admin/channel-admin/自定义角色）
   - 点击"分配"
   - 非 admin 分配时会自动校验：操作者只能分配自己渠道内的成员

3. 查看权限树 → `/pages/system/permissions`
   - 浏览所有权限点定义
   - 用于创建角色时参考可选权限

4. 渠道成员管理 → `/pages/channel/members`
   - 查看渠道下的成员列表
   - 管理成员的渠道归属

5. 查看操作日志 → `/pages/system/role-logs`
   - 审计角色分配、权限变更记录

## 验证

- 新建角色后，在 `/pages/system/role-management` 列表中可见
- 分配角色后，用户登录后台能看到对应权限的菜单
- 操作日志中记录了本次分配操作
