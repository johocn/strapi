# SSO 登录领域手册（服务端视角）

> 入口指针：`project_memory.md`「SSO 相关规则」速查卡 → 本手册。
> 覆盖：strapi `plugins/zhao-sso`（OAuth 授权码流 / 微信登录 / redirect_uri 白名单）、`strapi-backend`（统一登录页 H5）、`sso_apps` 白名单配置、微信公众号后台配置。
> C 端对接视角见 `nshop/docs/domains/sso-login.md`。

## 1. 概念模型

### 体系架构

| 角色 | 域名 | 说明 |
|---|---|---|
| SSO 主站 | `h.joho.cn` | zhao-sso 插件，统一登录中心（h.joho.cn 移动端 + Vendure 等 PC 端共用） |
| 消费端 | `v.joho.cn` 及各 C 端 | 消费端经统一登录页接入 SSO |
| 第三方站 | `a.shenglin.vip` 等 | 同 SSO 服务器，走同一套 SSO 登录 |

### SSO vs Third 双体系

- **zhao-sso（多跳中转）**：授权后生成 authCode，302 回应用方带 code，应用方再调 `/auth/token` 换 access_token，最终回跳只带 token（token 直验），不暴露 code。
- **zhao-third（一站式）**：微信回调后直接签发 zhao-auth JWT，302 回前端带 token。

两套体系完全隔离：独立公众号 appId、独立配置表、独立用户体系、独立绑定表。

| 维度 | c 端（zhao-third） | sso 端（zhao-sso） |
|---|---|---|
| 入口路由 | `/api/zhao-third/v1/wechat/callback` | `/api/zhao-sso/v1/auth/wechat` |
| 配置表 | `third_party_configs` | `sso_oauth_configs` |
| 公众号 appId | wx17d58d73062d1899 | 独立的另一个公众号 appId |
| 用户体系 | users-permissions.user（`up_users`） | sso-user（`sso_users`） |
| 绑定表 | `third_party_accounts` | `sso_third_party_bindings` |
| 回调产物 | 直接签发 JWT，302 回前端带 token | 生成 authCode，302 回应用方带 code，应用方再调 `/auth/token` 换 access_token |
| JSSDK 路由 | `/api/zhao-third/v1/third/jssdk-signature` | `/api/zhao-sso/v1/auth/jssdk-signature` |

### 三套用户表 ID 体系

| 体系 | 用户表 | 说明 |
|---|---|---|
| SSO | `sso_users` | 主用户体系，自增主键 id；**分销关系只用 `sso_users.id`** |
| Third | `up_users` | C 端 zhao-third 用户（users-permissions.user） |
| Local | 本地用户 | 各应用本地用户 |

### State 三语义

| 类型 | 语义 | 说明 |
|---|---|---|
| Type A | base64url JSON 信封 | 携带登录上下文（app_code / redirect_uri / invite_code 等） |
| Type B | OAuth2 透传 | 透传 OAuth2 state 参数 |
| Type C | 导航路径 | 回跳导航路径 |

### 核心表清单

| 表 | 关键字段 | 说明 |
|---|---|---|
| `sso_users` | id（自增主键）、username、`register_channel` | SSO 主用户表；主键序列 `sso_users_id_seq`，备份恢复后可能失步（见 Bug 知识库） |
| `sso_third_party_bindings` | `provider_user_id`（微信 openid）、sso_users.id | openid → sso_users.id 映射，微信登录命中即复用原 id |
| `sso_invite_codes` | 自有邀请码 | 分销邀请码（v.joho.cn 指向） |
| `sso_tokens` | 登录令牌 | token 直验凭据 |
| `sso_login_logs` | 登录日志 | 登录流水 |
| `sso_apps` | `app_code`、`app_secret`、`redirect_uris` | 接入方白名单配置，**数据库表实时生效** |

### 微信分享登录链路（带邀请码）

C 端商品详情页微信分享 → 好友点击 → 登录 → 建分销 → 回跳来源页，完整链路：

1. **分享携带邀请码**：C 端 `WechatShare.vue` 分享链接带 `invite` 参数（`appendInviteParams`，inviteCode+inviterId），经 `useSso.ts` 透传给 SSO 服务。
2. **微信 OAuth**：好友在微信内点开 → 统一登录页（h.joho.cn）`snsapi_userinfo` 授权 → 回调 `https://h.joho.cn/#/pages/sso/login-callback`（此地址必须在 `sso_apps.redirect_uris` 白名单）。
3. **换 token 回传真实邀请码**：SSO `exchangeToken`/`token` 端点返回 `user.inviteCode`/`ownInviteCode`（`ensureOwnInviteCode` 幂等：有码返回、无码生成），C 端 `getInviteCode()` 即取到真实码。
4. **新用户建号**：`sso-wechat.handleCallback` 创建 sso_user（走 `createSsoUserWithSeqGuard`）→ 绑定表建 openid/unionid 映射 → `ensureUpUser` 对齐 up_users → 富字段（sso_id/昵称/头像/邀请码）直写 up_users → `syncUserInvite` 建 D 层分销。
5. **消费邀请码建分销**：微信回调时带 `invite_code` → `buildReferralRelation`（校验邀请码 → 可能创建虚拟邀请人 → 防自邀 → 计算层级 → 事务写 sso_users.invite_code_used / sso_referral_relations / sso_invite_usages / use_count+1）。幂等：已用码则跳过。
6. **回跳来源页**：SSO 跳转携带 state（上一页路由或 `options.redirect`）→ login-callback 透传 → C 端 auth-callback 检测后 `reLaunch`（校验 `/` 开头防外跳）。

> 分销关系判定：`sso_referral_relations` / `sso_invite_usages` 是否含该新用户记录 + `sso_users.invite_code_used` 是否指向分享者自有码。

## 2. 文件地图（目录/模块级，行号用 rg 现查）

### strapi 插件 `plugins/zhao-sso/`

| 文件 | 职责 | 关键符号 |
|---|---|---|
| `sso-oauth.ts` | 授权码流 / exchangeCode、redirect_uri 白名单校验 | `validateRedirectUri`（白名单校验前 `split("?")[0]` 剥 query）、`exchangeCode` |
| `sso-wechat.ts` | 微信回调、openid 复用、username 生成、注册来源 | 微信回调；openid 查 `sso_third_party_bindings` 复用原 id；username = `wx_昵称前12位_8位uuid短码`；`register_channel` |
| `sso-user.ts` | 用户创建 + 序列自愈 | `createUser`（用户名/邮箱/手机至少一字段约束，三选一）；`syncSequence`（幂等同步 `sso_users_id_seq`，仅当 nextval 将撞上已有 id 时 setval(max(id))）；`createSsoUserWithSeqGuard`（捕获主键冲突 → 同步序列 → 重试一次） |
| `oauth-controller.ts` | 回调域名校验 | 回调域名校验 + 日志 |

### strapi-backend（统一登录页 H5）

| 文件 | 职责 | 关键符号 |
|---|---|---|
| `pages/sso/login` | 统一登录页 | 微信授权 / 密码登录入口 |
| `pages/sso/login-callback` | 登录回跳页 | 处理回跳参数（`https://h.joho.cn/#/pages/sso/login-callback`） |
| `pages/sso/auth-callback` | 授权回调页 | 换 token |
| `App.vue` | SSO 自动跳转 | 微信环境自动跳转 SSO 登录 |
| `pages.json` | easycom 组件扫描 | `wx-sso-login` 组件注册 |

### 配置

- `sso_apps.redirect_uris`：数据库表（sso-app：`app_code`/`app_secret`/`redirect_uris`），**实时生效无需重启**
- 微信公众号后台：**网页授权域名 与 JS 安全域名是两个配置项**，需分别配置

## 3. 设计决策（ADR 式）

| 决策 | 理由 |
|---|---|
| SSO 多跳中转 + token 直验 | 跨站登录需中转页；回跳只带 token 不暴露 code |
| redirect_uri 白名单只校验 SSO 自身回调地址 | C 端域名经 URL 参数动态传递，新域名接入 SSO 服务器零改动 |
| 白名单校验前 `split("?")[0]` | 剥离 query 防精确匹配失败 |
| 微信 openid 命中 `sso_third_party_bindings` 复用原 id | 同人多次登录不建新用户 |
| 微信登录用户 username = `wx_昵称前12位_8位uuid短码` | 满足 createUser 至少一字段约束 + 可读 |
| `register_channel` 记录注册来源 | 区分注册路径（微信/密码/短信） |
| 登录优先级：SSO 第一 → 三方 → 本地 | 微信环境自动登录优先走 SSO |
| sso_users 主键序列「代码自愈 + 启动自检」（方案 B） | 备份恢复/显式 ID 合并会导致序列落后于 max(id)，新用户插入即撞主键；创建路径捕获冲突后同步序列重试，bootstrap 启动时自检同步，双保险消除故障窗口（详见 `docs/sso-序列失步自愈-20260913.md`） |

## 4. 常见坑

| 现象 | 根因 | 解法 |
|---|---|---|
| 报错 1003 | 公众号后台 OAuth2 回调域名未配置 / 与微信环境实际域名不一致 | v.joho.cn 配 third、h.joho.cn 配 SSO |
| redirect_uri 不在白名单 | `validateRedirectUri` 精确匹配未剥 query；`sso_apps` 表配置缺失 `https://h.joho.cn/#/pages/sso/login-callback` | 剥 query 后校验 + 补 `sso_apps.redirect_uris` 配置 |
| `htpps` 协议替换 | 对已 https 字符串二次替换 scheme | URL 编码须 `encodeURIComponent` 包完整地址，防 `#` 漏编 |
| C 端回跳触发微信 SSL 错误 | `enforceHttps` 只对 SSO 域名 h.joho.cn 强制，C 端回跳被强制 https | 仅对 h.joho.cn 强制，C 端回跳不强转 https |
| 登录页卡住 | `wx-sso-login` 组件未被 easycom 扫描（位置/配置）；构建产物未部署（服务器跑旧代码） | 检查 `pages.json` easycom 配置 + 重新构建部署 |
| 微信授权页空白 | `snsapi_userinfo` 需**已认证**服务号（订阅号无网页授权权限）；网页授权域名与 JS 安全域名是两个配置项 | 申请认证服务号 + 分别配置两个域名 |
| 服务器跑旧代码 | 本地改 TS 源码后未构建 `plugins/zhao-sso/dist/` | 本地构建后上传，服务器 pm2 重启 |
| 新用户注册/微信登录报 `duplicate key ... sso_users_pkey` | `sso_users_id_seq` 序列落后于表内 max(id)（备份恢复/显式 ID 合并），nextval 撞上已占用 id | 方案 B 已自愈：创建路径捕获冲突 → 同步序列 → 重试；bootstrap 启动自检。旧数据一次性修复：`SELECT setval('sso_users_id_seq', (SELECT max(id) FROM sso_users))` |

## 5. Bug 知识库

| 现象 | 根因 | 代码点 | 验证 |
|---|---|---|---|
| redirect_uri 不在白名单 | `validateRedirectUri` 未剥 query / `sso_apps` 配置缺失 | `sso-oauth.ts` | SQL 查 `sso_apps.redirect_uris` + 登录自测 |
| 微信环境只看到 v.joho.cn 其余不可见，SSL 协议错误 | 强制 https 回跳 C 端 | `enforceHttps` | 仅对 h.joho.cn 强制 |
| 手机微信授权页空白 | 服务号未认证 / 授权域名未配 | 公众号后台 | snsapi_base 链接测试 |
| v.joho.cn 登录 return_url 错误 | 服务器运行旧构建产物 | 部署 | 本地构建上传后验证 |
| 登录页卡住不动 | 组件 easycom 未扫描 | `pages.json` | 重新编译部署 |
| 微信分享登录报 `duplicate key ... sso_users_pkey` | `sso_users_id_seq` 失步（备份恢复后 nextval 撞已有 id），新用户 INSERT 报主键冲突，登录中断在 login-callback | `sso-user.ts`（`syncSequence` / `createSsoUserWithSeqGuard`）、`sso-wechat.ts` / `sso-invite.ts` / `sso-user.createUser` 三处创建路径、`bootstrap.ts` 启动自检 | 模拟失步：`setval('sso_users_id_seq', max-1)` → 触发注册 → 日志出现「主键冲突(序列失步)，同步后重试」→ 创建成功 id=max+1（详见 `docs/sso-序列失步自愈-20260913.md`） |

## 6. 验证脚本/流程清单

| 项目 | 操作/命令 |
|---|---|
| `snsapi_base` 授权链接自测 | 微信内打开授权链接，测域名可达/授权集成 |
| SQL 自查白名单 | 查 `sso_apps.redirect_uris`（数据库查询**实时生效，无需重启**） |
| 部署流程 | 本地构建 `plugins/zhao-sso/dist/` → 提交 → 服务器拉取 + pm2 重启；strapi-backend 走 `scripts/deploy.mjs` scp 原子替换 |
| 配置复查 | 微信公众号后台：网页授权域名 + JS 安全域名两项分别核对 |

## 7. 历史文档索引

### strapi 仓库 `d:\zhao\strapi\docs\`

| 文档 | 说明 |
|---|---|
| `2026-06-21-wechat-login-design.md` | 早期微信登录设计 |
| `superpowers/specs/2026-07-24-zhao-sso-wechat-login-design.md` | zhao-sso 微信登录设计（公众号网页授权 + 开放平台扫码 + sso-oauth-config 扩展） |
| `superpowers/specs/2026-07-24-wechat-scope-fix-design.md` | 微信 scope 修复设计 |
| `superpowers/specs/2026-07-10-zhao-sso-completion-design.md` + `superpowers/plans/2026-07-10-zhao-sso-completion-plan.md` | zhao-sso 收尾设计/计划 |
| `superpowers/specs/2026-08-22-zhao-sso-wechat-official-features-design.md`、`2026-08-22-zhao-sso-wechat-official-ops-design.md` | zhao-sso 公众号功能/运维设计 |
| `sso-邀请码闭环与用户对齐-20260904.md` | 邀请码闭环 + 用户对齐 |
| `sso-登录回传邀请码与来源页回跳-20260905.md` | 登录回传邀请码 + 来源页回跳 |
| `sso-序列失步自愈-20260913.md` | sso_users 主键序列失步自愈（代码守卫 + 启动自检） |
| `deployment/sso-wechat-config-guide.md` | **微信登录配置手册**（公众号准备 / sso 配置录入 / sso-app 接入 / Nginx / 前端接入 / 降级登录 / 验证 / 故障排查） |

### 外部

- `d:\zhao\wechat-sso-dev-guide\wechat-sso-dev-guide.html` — 微信 SSO 开发避坑指南（13 章）
- `nshop/docs/domains/sso-login.md` — SSO 登录（C 端对接视角），与本手册互引
