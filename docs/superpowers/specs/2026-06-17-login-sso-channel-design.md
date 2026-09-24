# C端微信登录、SSO统一配置、邀请码处理及课程跨渠道设置优化设计文档

**日期：** 2026-06-17  
**作者：** TRAE Agent  
**状态：** 待审阅  

## 一、概述

### 1.1 背景

当前系统存在以下问题：
- C端微信登录流程不够完善，首次/再次登录体验不一致
- Web后台管理缺少SSO登录支持
- 邀请码处理逻辑不完整，未区分用户邀请码和渠道邀请码
- 课程跨渠道设置错误提示不够友好

### 1.2 目标

优化登录体验，统一认证配置，完善邀请码处理，改进错误提示：
- C端微信登录：首次显示按钮选择，再次直接跳转
- Web后台：支持SSO登录，统一认证配置读取
- 邀请码：区分用户邀请码和渠道邀请码，支持扫码/链接进入
- 课程设置：优化前端错误提示，保持后端严格校验

### 1.3 范围

**涉及模块：**
- shao目录：C端登录、微信登录、邀请码处理
- web目录：后台登录、SSO支持、渠道邀请码
- basic目录：后端认证配置接口

**不涉及：**
- 数据库schema变更
- 后端核心业务逻辑变更
- 第三方支付集成

## 二、C端微信登录优化

### 2.1 核心流程设计

#### 2.1.1 三种环境下的登录流程

**微信小程序环境：**
```
启动流程：
1. App.vue onLaunch检测环境 → 微信小程序
2. 检查token状态：
   - 有token → 直接跳转首页
   - 无token → 尝试自动登录（wx.login）
     * 成功 → 获取token → 跳转首页
     * 失败 → 跳转login页面显示降级登录

login页面：
- 有token → 立即跳转（不显示UI）
- 无token → 显示"正在自动登录..."
  * 2秒后仍无token → 显示账号密码登录表单
```

**H5微信浏览器环境：**
```
启动流程：
1. App.vue onLaunch检测环境 → H5微信浏览器
2. 检查token状态：
   - 有token → 直接跳转首页
   - 无token → 检查URL是否有code参数
     * 有code → 调用后端换取token → 跳转首页
     * 无code → 跳转login页面

login页面：
- 有token → 立即跳转（不显示UI）
- 无token → 显示两个按钮：
  * "快速登录"（snsapi_base）→ 静默获取openid
  * "完善资料登录"（snsapi_userinfo）→ 授权获取昵称头像
  * 底部显示"账号密码登录"降级入口
```

**非微信环境（H5普通浏览器/App）：**
```
启动流程：
1. App.vue onLaunch检测环境 → 非微信
2. 检查token状态：
   - 有token → 直接跳转首页
   - 无token → 跳转login页面

login页面：
- 显示标准登录表单（手机验证码/账号密码）
- 底部显示"微信登录"图标（点击提示在微信中打开）
```

#### 2.1.2 状态管理

**全局状态（App.vue）：**
```typescript
const globalState = {
  authConfig: null,           // 认证配置
  autoLoginAttempted: false,  // 是否已尝试自动登录
  autoLoginSuccess: false,    // 自动登录是否成功
  token: null,                // 当前token
  user: null                  // 用户信息
}
```

**页面状态（login.vue）：**
```typescript
const pageState = {
  loginPhase: 'checking',     // checking | waiting | buttons | manual | redirecting
  showButtons: false,         // 是否显示微信登录按钮
  showManualForm: false,      // 是否显示手动登录表单
  countdownTimer: null        // 自动登录等待计时器
}
```

### 2.2 App.vue实现

**关键功能：**
1. 处理邀请码（优先级最高）
2. 获取认证配置
3. 根据环境处理自动登录

**邀请码处理逻辑：**
```typescript
async function handleInviteCode() {
  // 微信小程序：从scene参数获取
  // H5环境：从URL参数获取
  // App环境：从启动参数获取
  
  // 识别邀请码类型：
  // - channel_开头 → 渠道邀请码
  // - invite_开头 → 用户邀请码
  // - 无前缀 → 默认作为渠道邀请码
  
  // 存储到storage：
  // - 渠道邀请码 → channelInviteCode
  // - 用户邀请码 → inviteCode
}
```

**自动登录逻辑：**
```typescript
// 微信小程序
async function handleMiniProgramAutoLogin() {
  const token = getToken()
  if (token) {
    uni.setStorageSync('autoLoginSuccess', 'true')
    return
  }
  
  uni.setStorageSync('autoLoginAttempted', 'true')
  
  try {
    const result = await silentLogin(inviteCode, channelInviteCode)
    if (result.token) {
      setToken(result.token)
      setUser(result.user)
      uni.setStorageSync('autoLoginSuccess', 'true')
    }
  } catch (e) {
    uni.setStorageSync('autoLoginSuccess', 'false')
    uni.navigateTo({ url: '/pages/login/login?autoFailed=1' })
  }
}

// H5微信浏览器
async function handleH5AutoLogin() {
  const token = getToken()
  if (token) {
    uni.setStorageSync('autoLoginSuccess', 'true')
    return
  }
  
  const code = getUrlParam('code')
  if (code) {
    const result = await handleH5WechatCallback(code)
    if (result.token) {
      setToken(result.token)
      setUser(result.user)
      uni.setStorageSync('autoLoginSuccess', 'true')
      // 跳转到目标页面
    }
  } else {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}
```

### 2.3 login.vue实现

**页面阶段：**
- `checking`：检查token状态
- `waiting`：等待自动登录（微信小程序）
- `buttons`：显示微信登录按钮（H5微信浏览器）
- `manual`：显示手动登录表单
- `redirecting`：正在跳转

**核心逻辑：**
```typescript
onMounted(async () => {
  // 1. 获取认证配置
  authConfig.value = await fetchAuthConfig()
  
  // 2. 根据状态决定页面阶段
  if (authMode.value === 'third' && isWechat.value) {
    if (hasToken.value) {
      // 有token，立即跳转
      loginPhase.value = 'redirecting'
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 100)
      return
    }
    
    // 微信小程序：等待App.vue的自动登录
    // H5微信浏览器：显示按钮选择
  } else {
    // 其他模式：显示标准登录表单
    loginPhase.value = 'manual'
  }
})
```

**UI显示：**
```vue
<!-- Phase: checking/waiting - 等待自动登录 -->
<view v-if="loginPhase === 'checking' || loginPhase === 'waiting'">
  <view class="loading-spinner"></view>
  <text>正在自动登录...</text>
  <text>{{ waitingCountdown }}秒</text>
</view>

<!-- Phase: redirecting - 正在跳转 -->
<view v-if="loginPhase === 'redirecting'">
  <text>✓ 登录成功</text>
  <text>正在跳转...</text>
</view>

<!-- Phase: buttons - H5微信登录按钮 -->
<view v-if="loginPhase === 'buttons'">
  <button @click="quickLogin">快速登录</button>
  <button @click="fullLogin">完善资料登录</button>
  <!-- 降级入口 -->
  <view @click="loginPhase = 'manual'">账号密码登录</view>
</view>

<!-- Phase: manual - 手动登录表单 -->
<view v-if="loginPhase === 'manual'">
  <!-- 标准登录表单 -->
</view>
```

### 2.4 auth-callback页面

**处理微信OAuth回调：**
```typescript
onMounted(async () => {
  const code = getUrlParam('code')
  const state = getUrlParam('state')
  
  if (!code) {
    uni.showToast({ title: '授权失败，请重试', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }
  
  uni.showLoading({ title: '登录中...' })
  
  try {
    const result = await handleH5WechatCallback(code)
    uni.hideLoading()
    uni.showToast({ title: '登录成功', icon: 'success' })
    
    // 跳转到目标页面（从state参数读取）
    const targetUrl = state ? decodeURIComponent(state) : '/pages/index/index'
    setTimeout(() => {
      uni.switchTab({ url: targetUrl })
    }, 1000)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login?autoFailed=1' })
    }, 1500)
  }
})
```

### 2.5 错误处理和降级机制

**错误场景：**
1. 微信授权失败 → 提示"授权失败" → 跳转login页面
2. 后端接口失败 → 提示具体错误 → 跳转login页面
3. 网络异常 → 提示"网络异常" → 跳转login页面
4. token过期 → 清除token → 跳转login页面

**降级登录：**
```
自动登录失败 → 显示账号密码登录表单
用户输入账号密码 → 调用本地登录接口 → 获取token → 跳转首页
```

### 2.6 用户体验优化

**加载状态：**
- 自动登录等待：显示loading动画 + 倒计时
- 微信授权跳转：显示"正在跳转微信授权..."
- 回调处理：显示"正在处理登录..."

**错误提示：**
- 网络异常："网络连接失败，请检查网络后重试"
- 授权失败："微信授权失败，请使用账号密码登录"
- 登录失败："登录失败，请重试或联系客服"

**状态持久化：**
- token存储到storage（7天有效期）
- authConfig存储到storage（避免重复请求）
- 首次登录标记（用于区分首次/再次登录）

## 三、邀请码处理

### 3.1 邀请码类型区分

**用户邀请码：**
- 用途：C端用户邀请其他用户注册
- 来源：用户个人邀请链接、二维码
- 格式：`invite_XXXXX` 或纯字符串
- 存储：绑定到用户表
- 作用：建立用户邀请关系，可能获得积分奖励

**Channel邀请码：**
- 用途：渠道管理员邀请用户加入渠道
- 来源：渠道邀请链接、二维码
- 格式：`channel_XXXXX` 或纯字符串
- 存储：绑定到渠道成员表
- 作用：将用户加入特定渠道，获得渠道权限

### 3.2 邀请码识别规则

```typescript
function identifyInviteCode(code: string): { type: 'user' | 'channel', code: string } {
  if (!code) return { type: 'unknown', code: '' }
  
  // 根据前缀识别
  if (code.startsWith('channel_') || code.startsWith('ch_')) {
    return { type: 'channel', code: code.replace(/^channel_|^ch_/, '') }
  }
  
  if (code.startsWith('invite_') || code.startsWith('inv_')) {
    return { type: 'user', code: code.replace(/^invite_|^inv_/, '') }
  }
  
  // 无前缀：默认作为channel邀请码（优先级更高）
  return { type: 'channel', code }
}
```

### 3.3 邀请码获取来源

**C端邀请码来源：**
1. 扫码进入：解析二维码URL，提取邀请码
2. 链接进入：解析URL参数，提取邀请码
3. 小程序码进入：解析scene参数，提取邀请码

**Web后台邀请码来源：**
1. 扫码进入：解析二维码URL，提取channel邀请码
2. 链接进入：解析URL参数，提取channel邀请码

### 3.4 App.vue邀请码处理

**关键功能：**
```typescript
async function handleInviteCode() {
  // 微信小程序：从scene参数获取
  const scene = await getMiniProgramScene()
  if (scene) {
    const inviteCode = parseSceneToInviteCode(scene)
    if (inviteCode) {
      storeInviteCode(inviteCode)
    }
  }
  
  // H5环境：从URL参数获取
  const urlParams = new URLSearchParams(window.location.search)
  const inviteCodeFromUrl = urlParams.get('inviteCode') || urlParams.get('channelCode')
  if (inviteCodeFromUrl) {
    storeInviteCode(inviteCodeFromUrl)
    // 清除URL中的邀请码参数（避免重复处理）
    const cleanUrl = removeInviteCodeFromUrl(window.location.href)
    window.history.replaceState({}, '', cleanUrl)
  }
}
```

### 3.5 login.vue邀请码处理

**关键功能：**
```typescript
onMounted(async () => {
  // 读取存储的邀请码
  inviteCode.value = uni.getStorageSync('inviteCode') || ''
  channelInviteCode.value = uni.getStorageSync('channelInviteCode') || ''
  
  // 如果有邀请码，显示提示
  if (inviteCode.value || channelInviteCode.value) {
    showInviteCodeInput.value = true
  }
})

async function bindInviteCodesAfterLogin(userId: number) {
  // 1. 绑定用户邀请码
  if (inviteCode.value) {
    await useInviteCode(inviteCode.value)
    uni.removeStorageSync('inviteCode')
    uni.showToast({ title: '邀请码绑定成功', icon: 'success' })
  }
  
  // 2. 绑定渠道邀请码
  if (channelInviteCode.value) {
    await joinChannelByInvite(channelInviteCode.value)
    uni.removeStorageSync('channelInviteCode')
    uni.showToast({ title: '已加入渠道', icon: 'success' })
  }
}
```

### 3.6 微信登录邀请码处理

**wx-login.ts：**
```typescript
export async function silentLogin(inviteCode?: string, channelInviteCode?: string): Promise<any> {
  const result = await wxMiniProgramLogin(
    code,
    inviteCode || uni.getStorageSync('inviteCode'),
    channelInviteCode || uni.getStorageSync('channelInviteCode')
  )
  
  // 登录成功后清除邀请码
  if (result.token) {
    uni.removeStorageSync('inviteCode')
    uni.removeStorageSync('channelInviteCode')
  }
  
  return result
}
```

**wx-h5-login.ts：**
```typescript
export async function handleH5WechatCallback(code: string): Promise<any> {
  const inviteCode = uni.getStorageSync('inviteCode') || undefined
  const channelInviteCode = uni.getStorageSync('channelInviteCode') || undefined
  
  const res = await request('/v1/third/callback', {
    method: 'POST',
    data: {
      platform: 'wechat',
      appType: 'official_account',
      code,
      scope,
      inviteCode,
      channelInviteCode
    }
  })
  
  if (res.token) {
    setToken(res.token)
    setUser(res.user)
    
    // 清除临时storage
    uni.removeStorageSync('wxAuthScope')
    uni.removeStorageSync('inviteCode')
    uni.removeStorageSync('channelInviteCode')
  }
  
  return res
}
```

### 3.7 Web后台邀请码处理

**App.vue：**
```typescript
async function handleChannelInviteCode() {
  const urlParams = new URLSearchParams(window.location.search)
  const channelCode = urlParams.get('channelCode') || urlParams.get('inviteCode')
  
  if (channelCode) {
    uni.setStorageSync('webChannelInviteCode', channelCode)
    // 清除URL参数
    const cleanUrl = removeChannelCodeFromUrl(window.location.href)
    window.history.replaceState({}, '', cleanUrl)
  }
}
```

**login/index.vue：**
```typescript
async function handleChannelInviteAfterLogin(userId: number) {
  if (!channelInviteCode.value) return
  
  try {
    uni.showLoading({ title: '正在加入渠道...' })
    await joinChannelByInvite(channelInviteCode.value)
    uni.hideLoading()
    uni.showToast({ title: '已成功加入渠道', icon: 'success' })
    
    uni.removeStorageSync('webChannelInviteCode')
    channelInviteCode.value = ''
    
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/channel/members' })
    }, 2000)
  } catch (e) {
    uni.hideLoading()
    uni.showModal({
      title: '渠道邀请失败',
      content: '邀请码无效或已过期',
      showCancel: false
    })
  }
}
```

### 3.8 后端接口实现

**用户邀请码接口：**
```typescript
// zhao-channel/user-invite.ts
async use(ctx: any) {
  const { inviteCode } = ctx.request.body
  const userId = ctx.state.user.id
  
  const inviteService = strapi.service('plugin::zhao-channel.user-invite')
  const result = await inviteService.useInviteCode(userId, inviteCode)
  
  ctx.body = {
    success: true,
    message: '邀请码绑定成功',
    data: result
  }
}
```

**渠道邀请码接口：**
```typescript
// zhao-channel/channel-invite.ts
async join(ctx: any) {
  const { inviteCode } = ctx.request.body
  const userId = ctx.state.user.id
  
  const channelService = strapi.service('plugin::zhao-channel.channel')
  const result = await channelService.joinByInvite(userId, inviteCode)
  
  ctx.body = {
    success: true,
    message: '已成功加入渠道',
    data: {
      channelId: result.channelId,
      channelName: result.channelName,
      role: result.role
    }
  }
}
```

### 3.9 邀请码生成和管理

**用户邀请码生成：**
```typescript
function generateUserInviteCode(): string {
  return 'INV_' + Math.random().toString(36).substring(2, 7).toUpperCase()
}
```

**渠道邀请码生成：**
```typescript
function generateChannelInviteCode(): string {
  return 'CH_' + Math.random().toString(36).substring(2, 7).toUpperCase()
}
```

### 3.10 邀请码分享功能

**C端用户分享：**
```vue
<!-- shao/pages/profile/profile.vue -->
<script setup>
function shareInviteCode() {
  // 微信小程序：分享小程序码
  // H5：复制邀请链接
  
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => {
      uni.showToast({ title: '邀请链接已复制', icon: 'success' })
    }
  })
}
</script>
```

**Web后台渠道邀请：**
```vue
<!-- web/pages/channel/detail.vue -->
<script setup>
function copyChannelInviteLink() {
  uni.setClipboardData({
    data: channelInviteLink.value,
    success: () => {
      uni.showToast({ title: '邀请链接已复制', icon: 'success' })
    }
  })
}
</script>
```

## 四、Web后台SSO统一配置

### 4.1 认证配置读取机制

**web/src/utils/auth-config.js：**
```javascript
export async function fetchAuthConfig() {
  if (cachedConfig) return cachedConfig
  
  try {
    const res = await get('/zhao-auth/v1/auth/config')
    cachedConfig = res
    return res
  } catch (e) {
    return DEFAULT_CONFIG
  }
}
```

### 4.2 login/index.vue SSO支持

**关键功能：**
```typescript
onMounted(async () => {
  // 1. 获取认证配置
  authConfig.value = await fetchAuthConfig()
  
  // 2. 读取渠道邀请码
  channelInviteCode.value = uni.getStorageSync('webChannelInviteCode') || ''
  
  // 3. SSO模式：显示SSO登录按钮
})

function redirectToSso() {
  if (!ssoLoginUrl.value) {
    uni.showToast({ title: 'SSO登录地址未配置', icon: 'none' })
    return
  }
  
  // 保存当前页面路径，SSO登录成功后跳回
  uni.setStorageSync('ssoRedirectUrl', currentPage)
  
  // 跳转到SSO登录页
  window.location.href = ssoLoginUrl.value + '?redirect=' + encodeURIComponent(currentPage)
}
```

**UI显示：**
```vue
<!-- SSO模式 -->
<view v-if="authMode === 'sso'">
  <button @click="redirectToSso">前往SSO登录</button>
  <text class="sso-hint">使用统一身份认证登录</text>
  
  <!-- 降级：本地登录 -->
  <view class="divider">或使用账号密码登录</view>
  <!-- 本地登录表单 -->
</view>

<!-- 本地模式 -->
<view v-else>
  <!-- 标准登录表单 -->
</view>
```

### 4.3 后端auth config接口

**zhao-auth/controllers/auth.ts：**
```typescript
async config(ctx: any) {
  const authService = strapi.plugin('zhao-auth').service('auth')
  
  // 检查SSO开关
  const sso = await authService.isSsoEnabled()
  
  // 检查三方登录开关
  const thirdEnabled = await this.checkThirdPartyEnabled()
  
  // 决定认证模式
  let mode = 'local'
  if (sso.enabled) {
    mode = 'sso'
  } else if (thirdEnabled) {
    mode = 'third'
  }
  
  ctx.body = {
    mode,
    methods: ['password', 'sms'],
    ssoLoginUrl: sso.enabled ? sso.loginUrl : null,
    wechatEnabled: thirdEnabled,
    registerEnabled: true
  }
}
```

**路由配置：**
```typescript
{
  method: 'GET',
  path: '/auth/config',
  handler: 'auth.config',
  config: {
    auth: false // 公开接口
  }
}
```

## 五、课程跨渠道设置优化

### 5.1 前端错误提示优化

**web/pages/course/form.vue：**

**渠道范围切换：**
```typescript
function setChannelScope(scope) {
  form.channelScope = scope
  
  if (scope === 'all') {
    form.channelIds = []
    form.pointChannel = null
    uni.showToast({ title: '已切换为全部渠道模式', icon: 'none' })
  } else {
    form.channelIds = []
    form.pointChannel = null
    uni.showToast({ title: '请选择至少1个所属渠道', icon: 'none' })
  }
}
```

**渠道选择联动：**
```typescript
function toggleChannel(ch) {
  const id = Number(ch.id)
  const idx = form.channelIds.findIndex(cid => Number(cid) === id)
  
  if (idx > -1) {
    form.channelIds.splice(idx, 1)
    
    // 如果pointChannel在被移除的渠道中，清空并提示
    if (Number(form.pointChannel) === id) {
      form.pointChannel = null
      uni.showToast({ title: '积分归属渠道已清空，请重新选择', icon: 'none' })
    }
  } else {
    form.channelIds.push(id)
    
    // 如果还没有选择pointChannel，提示用户选择
    if (!form.pointChannel && form.channelIds.length === 1) {
      uni.showToast({ title: '请选择积分归属渠道', icon: 'none' })
    }
  }
}
```

**提交前校验：**
```typescript
async function handleSubmit() {
  if (!form.title) {
    uni.showToast({ title: '请输入课程名称', icon: 'none' })
    return
  }
  
  // 渠道配置校验
  if (form.channelScope === 'specific') {
    // 1. 检查是否选择了渠道
    if (!form.channelIds.length) {
      uni.showModal({
        title: '提示',
        content: '指定渠道模式下，请至少选择1个所属渠道。\n\n课程将仅对所选渠道的成员可见。',
        showCancel: false
      })
      return
    }
    
    // 2. 检查是否设置了积分归属渠道
    if (!form.pointChannel) {
      uni.showModal({
        title: '提示',
        content: '请选择积分归属渠道。\n\n学习本课程获得的积分将归属此渠道，用于渠道数据统计和奖励发放。',
        showCancel: false
      })
      return
    }
    
    // 3. 检查pointChannel是否在channelIds中
    if (!form.channelIds.includes(form.pointChannel)) {
      uni.showModal({
        title: '配置错误',
        content: '积分归属渠道必须在所属渠道中。\n\n请重新选择积分归属渠道。',
        showCancel: false
      })
      showPointChannelPicker.value = true
      return
    }
  }
  
  // 提交数据...
}
```

**错误处理：**
```typescript
catch (e) {
  const errorMsg = e.message || '保存失败'
  
  if (errorMsg.includes('COURSE_001')) {
    uni.showModal({
      title: '渠道配置错误',
      content: errorMsg.replace('COURSE_001: ', ''),
      showCancel: false
    })
  } else {
    uni.showToast({ title: errorMsg, icon: 'none' })
  }
}
```

### 5.2 UI优化

**渠道选择器：**
```vue
<view class="form-item">
  <text class="form-label required">选择渠道 *</text>
  <view class="channel-picker-trigger" @click="showChannelPicker = true">
    <text :class="{ placeholder: !form.channelIds.length }">
      {{ selectedChannelNames() || '点击选择渠道（可多选）' }}
    </text>
  </view>
  <text class="form-hint">课程将仅对所选渠道的成员可见</text>
</view>

<view v-if="form.channelIds.length > 0" class="form-item">
  <text class="form-label required">积分归属渠道 *</text>
  <view class="channel-picker-trigger" @click="showPointChannelPicker = true">
    <text :class="{ placeholder: !form.pointChannel }">
      {{ selectedPointChannelName() || '点击选择积分归属渠道' }}
    </text>
  </view>
  <text class="form-hint">学习本课程获得的积分将归属此渠道</text>
</view>
```

**样式优化：**
```css
.required {
  color: #e53935;
}

.form-label.required::after {
  content: ' *';
  color: #e53935;
}

.form-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
```

### 5.3 后端校验逻辑

**保持现有严格校验：**
- specific模式必须设置至少1个渠道
- specific模式必须设置pointChannel
- pointChannel必须在channelIds中
- 抛出COURSE_001错误码

## 六、文件修改清单

### 6.1 需要修改的文件

**C端（shao目录）：**
1. `shao/App.vue` - 添加邀请码处理和自动登录逻辑
2. `shao/pages/login/login.vue` - 重构登录逻辑，支持邀请码提示
3. `shao/pages/auth-callback/auth-callback.vue` - 优化回调处理
4. `shao/utils/wx-login.ts` - 添加邀请码参数
5. `shao/utils/wx-h5-login.ts` - 添加邀请码参数
6. `shao/services/api.ts` - 新增邀请码接口
7. `shao/pages/profile/profile.vue` - 添加邀请码分享功能

**Web后台（web目录）：**
1. `web/App.vue` - 添加渠道邀请码处理
2. `web/pages/login/index.vue` - 添加SSO支持和渠道邀请码处理
3. `web/src/utils/auth-config.js` - 新增认证配置工具
4. `web/src/api/channel.js` - 新增渠道邀请码接口
5. `web/pages/course/form.vue` - 优化错误提示和交互
6. `web/pages/channel/detail.vue` - 添加渠道邀请码分享功能

**后端（basic目录）：**
1. `basic/plugins/zhao-auth/server/src/controllers/auth.ts` - 新增config接口
2. `basic/plugins/zhao-auth/server/src/routes/index.ts` - 新增config路由
3. `basic/plugins/zhao-channel/server/src/controllers/user-invite.ts` - 新增use接口
4. `basic/plugins/zhao-channel/server/src/controllers/channel-invite.ts` - 新增join接口

### 6.2 不需要修改的文件

- 数据库schema文件
- 后端核心业务逻辑文件
- 第三方支付相关文件

## 七、测试计划

### 7.1 C端微信登录测试

**测试场景：**
1. 微信小程序首次登录（无token）
2. 微信小程序再次登录（有token）
3. H5微信浏览器首次登录（无token）
4. H5微信浏览器再次登录（有token）
5. 非微信环境登录
6. 自动登录失败降级

**测试要点：**
- 首次登录是否显示按钮选择
- 再次登录是否直接跳转
- 邀请码是否正确处理
- 错误提示是否友好

### 7.2 邀请码测试

**测试场景：**
1. 扫码进入（用户邀请码）
2. 扫码进入（渠道邀请码）
3. 链接进入（用户邀请码）
4. 链接进入（渠道邀请码）
5. 小程序码进入
6. 邀请码绑定成功
7. 邀请码绑定失败

**测试要点：**
- 邀请码是否正确识别类型
- 邀请码是否正确存储
- 登录后是否正确绑定
- 错误提示是否友好

### 7.3 SSO登录测试

**测试场景：**
1. SSO模式登录
2. SSO登录成功跳转
3. SSO登录失败降级
4. 本地模式登录
5. 渠道邀请码处理

**测试要点：**
- 认证配置是否正确读取
- SSO按钮是否正确显示
- SSO跳转是否正确
- 渠道邀请码是否正确处理

### 7.4 课程跨渠道设置测试

**测试场景：**
1. 全部渠道模式保存
2. 指定渠道模式保存（正确配置）
3. 指定渠道模式保存（未选择渠道）
4. 指定渠道模式保存（未设置pointChannel）
5. 指定渠道模式保存（pointChannel不在channelIds中）

**测试要点：**
- 错误提示是否友好
- UI交互是否流畅
- 后端校验是否严格

## 八、风险评估

### 8.1 技术风险

**风险1：微信环境检测不准确**
- 影响：可能导致错误的登录流程
- 缓解：使用多种检测方法，添加降级机制

**风险2：邀请码类型识别错误**
- 影响：可能导致邀请关系绑定错误
- 缓解：使用明确的前缀标识，添加数据库查询验证

**风险3：SSO配置读取失败**
- 影响：可能导致SSO登录不可用
- 缓解：添加默认配置，提供降级登录入口

### 8.2 业务风险

**风险1：用户邀请码滥用**
- 影响：可能导致邀请关系混乱
- 缓解：添加邀请码有效期限制，添加使用次数限制

**风险2：渠道邀请码泄露**
- 影响：可能导致未授权用户加入渠道
- 缓解：添加邀请码有效期限制，添加管理员审核机制

**风险3：课程渠道配置错误**
- 影响：可能导致课程可见性错误
- 缓解：保持后端严格校验，添加巡检机制

## 九、实施计划

### 9.1 实施步骤

**步骤1：后端接口开发**
- 开发auth config接口
- 开发邀请码接口
- 测试接口功能

**步骤2：C端登录优化**
- 修改App.vue
- 修改login.vue
- 修改auth-callback.vue
- 测试登录流程

**步骤3：Web后台SSO支持**
- 修改login/index.vue
- 新增auth-config.js
- 测试SSO登录

**步骤4：邀请码处理**
- 修改App.vue邀请码处理
- 修改login.vue邀请码绑定
- 测试邀请码流程

**步骤5：课程设置优化**
- 修改course/form.vue
- 测试错误提示

**步骤6：集成测试**
- 测试完整流程
- 修复发现的问题

### 9.2 时间估算

- 后端接口开发：1天
- C端登录优化：2天
- Web后台SSO支持：1天
- 邀请码处理：1天
- 课程设置优化：0.5天
- 集成测试：1天

**总计：约6.5天**

## 十、验收标准

### 10.1 功能验收

**C端微信登录：**
- ✓ 首次登录显示按钮选择
- ✓ 再次登录直接跳转
- ✓ 邀请码正确处理
- ✓ 错误提示友好

**邀请码处理：**
- ✓ 邀请码正确识别类型
- ✓ 邀请码正确存储
- ✓ 登录后正确绑定
- ✓ 错误提示友好

**SSO登录：**
- ✓ 认证配置正确读取
- ✓ SSO按钮正确显示
- ✓ SSO跳转正确
- ✓ 渠道邀请码正确处理

**课程设置：**
- ✓ 错误提示友好
- ✓ UI交互流畅
- ✓ 后端校验严格

### 10.2 性能验收

- 登录响应时间 < 2秒
- 邀请码绑定时间 < 1秒
- 课程保存时间 < 2秒

### 10.3 安全验收

- 邀请码有效期限制
- 邀请码使用次数限制
- 渠道权限正确控制

## 十一、后续优化

### 11.1 短期优化（1个月内）

- 添加邀请码有效期限制
- 添加邀请码使用次数限制
- 添加邀请码统计功能

### 11.2 中期优化（3个月内）

- 添加邀请码分享统计
- 添加渠道邀请审核机制
- 添加课程渠道权限细粒度控制

### 11.3 长期优化（6个月内）

- 添加邀请奖励机制
- 添加渠道成员管理优化
- 添加课程跨渠道数据分析

---

**文档状态：** 待审阅  
**下一步：** 用户审阅设计文档，确认后进入实施阶段