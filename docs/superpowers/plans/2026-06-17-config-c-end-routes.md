# 配置页面重构实施计划（第三部分：C端配置路由统一）

## 任务清单

### Task 1: 更新auth-config.ts使用新的公开配置路由
**文件**: `E:\code\shao\services\auth-config.ts`

**修改要点**:
1. 更新路由：从 `/zhao-auth/v1/auth/config` 改为 `/zhao-common/v1/public/config`
2. 更新接口类型：增加站点信息、微信分享、功能开关等字段
3. 保持缓存逻辑
4. 保持默认配置

**关键代码片段**:
```typescript
export interface AuthConfig {
  // 站点信息
  siteName: string
  siteDescription: string
  logo: string
  favicon: string
  
  // 微信分享
  shareTitle: string
  shareDescription: string
  shareImage: string
  sharePath: string
  
  // 认证配置
  mode: 'local' | 'third' | 'sso'
  authMode: 'local' | 'third' | 'sso'
  methods: Array<'password' | 'sms' | 'wechat' | 'sso'>
  ssoLoginUrl: string | null
  wechatEnabled: boolean
  thirdPartyEnabled: boolean
  ssoEnabled: boolean
  registerEnabled: boolean
  inviteCodeRequired: boolean
  
  // 功能开关（公开）
  pointsEnabled: boolean
  signInPoints: number
  coursePreviewEnabled: boolean
  lessonProgressEnabled: boolean
  channelInviteEnabled: boolean
  allowCrossChannel: boolean
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig) return cachedConfig

  try {
    const config = await request('/zhao-common/v1/public/config') as AuthConfig
    cachedConfig = config
    return config
  } catch (e) {
    console.warn('[auth-config] 获取认证配置失败，使用默认配置:', e)
    return DEFAULT_CONFIG
  }
}
```

---

### Task 2: 更新C端其他配置获取逻辑
**文件**: 搜索C端所有使用配置的地方

**修改要点**:
1. 搜索C端所有调用 `/zhao-auth/v1/auth/config` 的地方
2. 更新为 `/zhao-common/v1/public/config`
3. 确保配置字段映射正确

**搜索命令**:
```bash
grep -r "/zhao-auth/v1/auth/config" E:\code\shao
```

---

### Task 3: 更新C端功能开关使用逻辑
**文件**: 搜索C端所有使用功能开关的地方

**修改要点**:
1. 搜索C端所有使用 `featureFlags` 或功能开关的地方
2. 更新为使用新的公开配置接口返回的 `featureFlags` 字段
3. 确保功能开关控制C端功能正常工作

**搜索命令**:
```bash
grep -r "featureFlags" E:\code\shao
grep -r "pointsEnabled" E:\code\shao
grep -r "coursePreviewEnabled" E:\code\shao
```

---

### Task 4: 更新C端微信分享配置使用逻辑
**文件**: 搜索C端所有使用微信分享的地方

**修改要点**:
1. 搜索C端所有使用微信分享的地方（App.vue、页面分享函数）
2. 更新为使用新的公开配置接口返回的 `shareTitle`、`shareDescription`、`shareImage`、`sharePath` 字段
3. 确保微信分享功能正常工作

**搜索命令**:
```bash
grep -r "shareTitle" E:\code\shao
grep -r "shareImage" E:\code\shao
grep -r "onShareAppMessage" E:\code\shao
```

---

### Task 5: 测试C端配置获取
**测试要点**:
1. 启动C端应用，检查配置获取是否成功
2. 检查配置缓存是否正常工作
3. 检查功能开关控制C端功能是否正常
4. 检查微信分享配置是否正常

---

## 执行方式
Subagent-Driven（子代理执行）

---

计划完成，待用户审查。