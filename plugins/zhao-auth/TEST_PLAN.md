# zhao-auth 插件测试计划

## 概述

zhao-auth 插件统一管理认证策略中间件，提供以下核心能力：

- **两个 Koa 中间件**：`authenticate`（JWT 验证）、`authorize`（策略授权）
- **内置策略**：`is-authenticated`、`has-role`、`has-channel-access`
- **策略注册机制**：允许其他插件通过 `strapi.plugin("zhao-auth").service("auth").registerPolicy()` 注册自定义策略

## 测试内容

### 1. 服务测试

#### 1.1 auth.service - authenticate
- [ ] 有效的 JWT token 返回标准 AuthUser
- [ ] 无效/过期 token 抛出异常
- [ ] 角色信息标准化（string / object 兼容）
- [ ] 自定义 payload 保留

#### 1.2 auth.service - authorize
- [ ] 空策略列表返回 `{ passed: true }`
- [ ] 已有策略通过检查
- [ ] 未注册策略返回 `POLICY_NOT_FOUND`
- [ ] 任意策略失败则中止并返回失败结果

#### 1.3 auth.service - extractToken
- [ ] Authorization: Bearer <token> 正确提取
- [ ] 无 Authorization 头返回 null
- [ ] 非 Bearer 格式返回 null

#### 1.4 auth.service - registerPolicy
- [ ] 注册新策略并可在 authorize 中调用
- [ ] 覆盖同名策略

#### 1.5 jwt.service
- [ ] sign / verify 正常工作
- [ ] 过期 token 验证失败

### 2. 中间件测试

#### 2.1 authenticate 中间件
- [ ] 公开路径列表放行
- [ ] 有效 token 注入 ctx.state.user
- [ ] 无 token 返回 401
- [ ] 无效 token 返回 401

#### 2.2 authorize 中间件
- [ ] 无策略配置放行
- [ ] 策略通过放行
- [ ] 策略失败返回 403
- [ ] 失败时附带策略信息

### 3. 内置策略测试

#### 3.1 is-authenticated
- [ ] ctx.state.user 存在时通过
- [ ] 无用户信息时失败

#### 3.2 has-role
- [ ] 匹配角色时通过
- [ ] 不匹配角色时失败
- [ ] 支持 name、exact 匹配

#### 3.3 has-channel-access
- [ ] 用户属于渠道时通过
- [ ] 用户不属于渠道时失败

### 4. 其他插件集成测试

#### 4.1 zhao-channel 插件
- [ ] zhao-channel 中注册自定义策略：`has-channel-role`
- [ ] 路由使用 authenticate + authorize 中间件
- [ ] 公开 API 路径放行

#### 4.2 zhao-invite 插件
- [ ] 注册自定义策略：`can-invite`
- [ ] 认证流程完整

## 运行测试

```bash
# 在项目根目录运行
npx jest --config jest.config.ts ../plugins/zhao-auth/tests/ --no-cache
```

## 目录结构

```
tests/
├── jest.config.ts        # Jest 配置
├── helpers/
│   └── strapi-setup.ts   # Strapi 测试环境
├── fixtures/
│   └── seed.ts           # 测试数据
├── auth-service.test.ts  # 服务层测试
├── middleware.test.ts    # 中间件测试
└── policies.test.ts     # 策略测试