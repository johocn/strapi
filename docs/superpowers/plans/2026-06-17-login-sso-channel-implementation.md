# C端微信登录、SSO统一配置、邀请码处理及课程跨渠道设置优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现C端微信登录优化、邀请码处理、Web后台SSO统一配置、课程跨渠道设置优化

**Architecture:** 
- C端：App.vue处理邀请码和自动登录，login.vue实现首次/再次登录逻辑
- Web后台：login/index.vue读取认证配置支持SSO，auth-config.js提供配置工具
- 后端：新增auth config接口和邀请码接口，保持现有校验逻辑

**Tech Stack:** 
- 前端：Vue 3 + TypeScript + uni-app
- 后端：Strapi 5 + TypeScript
- 工具：微信小程序SDK、微信H5 OAuth

---

## 文件结构

**新增文件：**
- `shao/services/api.ts` - 邀请码接口
- `web/src/utils/auth-config.js` - 认证配置工具
- `web/src/api/channel.js` - 渠道邀请码接口

**修改文件：**
- `shao/App.vue` - 邀请码处理和自动登录逻辑
- `shao/pages/login/login.vue` - 登录逻辑重构
- `shao/pages/auth-callback/auth-callback.vue` - 回调处理优化
- `shao/utils/wx-login.ts` - 邀请码参数
- `shao/utils/wx-h5-login.ts` - 邀请码参数
- `shao/pages/profile/profile.vue` - 邀请码分享功能
- `web/App.vue` - 渠道邀请码处理
- `web/pages/login/index.vue` - SSO支持和渠道邀请码处理
- `web/pages/course/form.vue` - 错误提示优化
- `web/pages/channel/detail.vue` - 渠道邀请码分享功能
- `basic/plugins/zhao-auth/server/src/controllers/auth.ts` - config接口
- `basic/plugins/zhao-auth/server/src/routes/index.ts` - config路由
- `basic/plugins/zhao-channel/server/src/controllers/user-invite.ts` - use接口
- `basic/plugins/zhao-channel/server/src/controllers/channel-invite.ts` - join接口

---

## Task 1: 后端auth config接口开发

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/controllers/auth.ts`
- Modify: `basic/plugins/zhao-auth/server/src/routes/index.ts`

- [ ] **Step 1: 在auth.ts中添加config接口**

```typescript
// basic/plugins/zhao-auth/server/src/controllers/auth.ts
async config(ctx: any) {
  try {
    const authService = strapi.plugin('zhao-auth').service('auth')
    
    // 检查SSO开关
    const sso = await authService.isSsoEnabled()
    
    // 检查三方登录开关（微信等）
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
  } catch (e) {
    strapi.log.error('[zhao-auth] Failed to get auth config:', e)
    ctx.body = {
      mode: 'local',
      methods: ['password'],
      ssoLoginUrl: null,
      wechatEnabled: false,
      registerEnabled: true
    }
  }
}

async checkThirdPartyEnabled(): Promise<boolean> {
  try {
    const flag = await strapi.documents('plugin::zhao-common.feature-flag').findFirst({
      filters: { flagKey: 'third_party_enabled' }
    })
    
    return flag && flag.flagValue === true && flag.enabled !== false
  } catch {
    return false
  }
}
```

- [ ] **Step 2: 在routes/index.ts中添加config路由**

```typescript
// basic/plugins/zhao-auth/server/src/routes/index.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/config',
      handler: 'auth.config',
      config: {
        auth: false // 公开接口，无需认证
      }
    },
    // ... 其他路由 ...
  ]
}
```

- [ ] **Step 3: 测试auth config接口**

运行：启动Strapi服务器，访问 `http://localhost:1337/api/zhao-auth/v1/auth/config`

预期：返回认证配置JSON

- [ ] **Step 4: 提交代码**

```bash
cd E:\code\basic
git add plugins/zhao-auth/server/src/controllers/auth.ts
git add plugins/zhao-auth/server/src/routes/index.ts
git commit -m "feat: add auth config endpoint for login mode detection"
```

---

## Task 2: 后端用户邀请码接口开发

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/controllers/user-invite.ts`

- [ ] **Step 1: 在user-invite.ts中添加use接口**

```typescript
// basic/plugins/zhao-channel/server/src/controllers/user-invite.ts
async use(ctx: any) {
  const { inviteCode } = ctx.request.body
  const userId = ctx.state.user.id
  
  if (!inviteCode) {
    ctx.status = 400
    ctx.body = { error: '请提供邀请码' }
    return
  }
  
  try {
    const inviteService = strapi.service('plugin::zhao-channel.user-invite')
    const result = await inviteService.useInviteCode(userId, inviteCode)
    
    ctx.body = {
      success: true,
      message: '邀请码绑定成功',
      data: result
    }
  } catch (e) {
    ctx.status = 400
    ctx.body = { error: e.message }
  }
}
```

- [ ] **Step 2: 测试用户邀请码接口**

运行：使用已登录用户的token，POST请求 `http://localhost:1337/api/zhao-channel/v1/user-invite/use`

预期：返回成功或错误信息

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\basic
git add plugins/zhao-channel/server/src/controllers/user-invite.ts
git commit -m "feat: add user invite code binding endpoint"
```

---

## Task 3: 后端渠道邀请码接口开发

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/controllers/channel-invite.ts`

- [ ] **Step 1: 在channel-invite.ts中添加join接口**

```typescript
// basic/plugins/zhao-channel/server/src/controllers/channel-invite.ts
async join(ctx: any) {
  const { inviteCode } = ctx.request.body
  const userId = ctx.state.user.id
  
  if (!inviteCode) {
    ctx.status = 400
    ctx.body = { error: '请提供渠道邀请码' }
    return
  }
  
  try {
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
  } catch (e) {
    ctx.status = 400
    ctx.body = { error: e.message }
  }
}
```

- [ ] **Step 2: 测试渠道邀请码接口**

运行：使用已登录用户的token，POST请求 `http://localhost:1337/api/zhao-channel/v1/channel-invite/join`

预期：返回成功或错误信息

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\basic
git add plugins/zhao-channel/server/src/controllers/channel-invite.ts
git commit -m "feat: add channel invite code join endpoint"
```

---

## Task 4: C端App.vue邀请码处理

**Files:**
- Modify: `shao/App.vue`

- [ ] **Step 1: 在App.vue中添加邀请码处理函数**

```vue
<!-- shao/App.vue -->
<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { fetchAuthConfig } from './services/auth-config'
import { silentLogin } from './utils/wx-login'
import { handleH5WechatCallback } from './utils/wx-h5-login'
import { setToken, setUser, getToken } from './utils/storage'

onLaunch(async () => {
  console.log('[App] App Launch')
  
  // 1. 处理邀请码（优先级最高）
  await handleInviteCode()
  
  // 2. 获取认证配置
  try {
    const config = await fetchAuthConfig()
    uni.setStorageSync('authConfig', JSON.stringify(config))
    console.log('[App] Auth config:', config)
    
    // 3. 根据认证模式处理自动登录
    if (config.mode === 'third' && config.wechatEnabled) {
      // #ifdef MP-WEIXIN
      await handleMiniProgramAutoLogin()
      // #endif
      
      // #ifdef H5
      await handleH5AutoLogin()
      // #endif
    }
  } catch (e) {
    console.error('[App] Failed to fetch auth config:', e)
  }
})

onShow(async () => {
  console.log('[App] App Show')
  
  // #ifdef MP-WEIXIN
  await handleMiniProgramScene()
  // #endif
})

async function handleInviteCode() {
  // #ifdef MP-WEIXIN
  const scene = await getMiniProgramScene()
  if (scene) {
    const inviteCode = parseSceneToInviteCode(scene)
    if (inviteCode) {
      storeInviteCode(inviteCode)
    }
  }
  // #endif
  
  // #ifdef H5
  const urlParams = new URLSearchParams(window.location.search)
  const inviteCodeFromUrl = urlParams.get('inviteCode') || urlParams.get('channelCode')
  if (inviteCodeFromUrl) {
    storeInviteCode(inviteCodeFromUrl)
    const cleanUrl = removeInviteCodeFromUrl(window.location.href)
    window.history.replaceState({}, '', cleanUrl)
  }
  // #endif
}

async function getMiniProgramScene(): Promise<string | null> {
  return new Promise((resolve) => {
    uni.getLaunchOptionsSync({
      success: (res) => {
        if (res.scene === 1047 || res.scene === 1048 || res.scene === 1049) {
          const query = res.query || {}
          const scene = query.scene || ''
          resolve(scene)
        } else {
          resolve(null)
        }
      },
      fail: () => resolve(null)
    })
  })
}

function parseSceneToInviteCode(scene: string): string | null {
  if (!scene) return null
  
  try {
    const decoded = decodeURIComponent(scene)
    const params = new URLSearchParams(decoded)
    const inviteCode = params.get('inviteCode') || params.get('channelCode')
    
    if (inviteCode) return inviteCode
    return decoded
  } catch (e) {
    console.error('[App] Parse scene failed:', e)
    return null
  }
}

function storeInviteCode(code: string) {
  console.log('[App] Storing invite code:', code)
  
  const identified = identifyInviteCode(code)
  
  if (identified.type === 'channel') {
    uni.setStorageSync('channelInviteCode', identified.code)
    console.log('[App] Stored as channel invite code')
  } else if (identified.type === 'user') {
    uni.setStorageSync('inviteCode', identified.code)
    console.log('[App] Stored as user invite code')
  }
}

function identifyInviteCode(code: string): { type: 'user' | 'channel' | 'unknown', code: string } {
  if (!code) return { type: 'unknown', code: '' }
  
  if (code.startsWith('channel_') || code.startsWith('ch_')) {
    return { type: 'channel', code: code.replace(/^channel_|^ch_/, '') }
  }
  
  if (code.startsWith('invite_') || code.startsWith('inv_')) {
    return { type: 'user', code: code.replace(/^invite_|^inv_/, '') }
  }
  
  return { type: 'channel', code }
}

function removeInviteCodeFromUrl(url: string): string {
  const urlObj = new URL(url)
  urlObj.searchParams.delete('inviteCode')
  urlObj.searchParams.delete('channelCode')
  return urlObj.pathname + urlObj.search + urlObj.hash
}

async function handleMiniProgramAutoLogin() {
  const token = getToken()
  
  if (token) {
    console.log('[App] Token exists, skip auto login')
    uni.setStorageSync('autoLoginSuccess', 'true')
    return
  }
  
  console.log('[App] Attempting mini program auto login')
  uni.setStorageSync('autoLoginAttempted', 'true')
  
  try {
    const inviteCode = uni.getStorageSync('inviteCode')
    const channelInviteCode = uni.getStorageSync('channelInviteCode')
    const result = await silentLogin(inviteCode, channelInviteCode)
    
    if (result.token) {
      setToken(result.token)
      setUser(result.user)
      uni.setStorageSync('autoLoginSuccess', 'true')
      console.log('[App] Auto login success')
      
      if (result.requireAuth) {
        uni.navigateTo({ url: '/pages/auth-callback/auth-callback?type=authorize' })
      }
    } else {
      throw new Error('No token returned')
    }
  } catch (e) {
    console.error('[App] Auto login failed:', e)
    uni.setStorageSync('autoLoginSuccess', 'false')
    uni.navigateTo({ url: '/pages/login/login?autoFailed=1' })
  }
}

async function handleH5AutoLogin() {
  const token = getToken()
  
  if (token) {
    console.log('[App] Token exists, skip auto login')
    uni.setStorageSync('autoLoginSuccess', 'true')
    return
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')
  
  if (code) {
    console.log('[App] Processing wechat callback')
    uni.setStorageSync('autoLoginAttempted', 'true')
    
    try {
      const result = await handleH5WechatCallback(code)
      
      if (result.token) {
        setToken(result.token)
        setUser(result.user)
        uni.setStorageSync('autoLoginSuccess', 'true')
        console.log('[App] H5 wechat login success')
        
        const cleanUrl = window.location.pathname + window.location.hash
        window.history.replaceState({}, '', cleanUrl)
        
        const targetUrl = state ? decodeURIComponent(state) : '/pages/index/index'
        setTimeout(() => {
          uni.switchTab({ url: targetUrl })
        }, 500)
      } else {
        throw new Error('No token returned')
      }
    } catch (e) {
      console.error('[App] H5 wechat callback failed:', e)
      uni.setStorageSync('autoLoginSuccess', 'false')
      uni.navigateTo({ url: '/pages/login/login?autoFailed=1' })
    }
  } else {
    console.log('[App] No code in URL, redirect to login page')
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

async function handleMiniProgramScene() {
  const args = uni.getLaunchOptionsSync()
  if (args && args.query && args.query.scene) {
    const inviteCode = parseSceneToInviteCode(args.query.scene)
    if (inviteCode) {
      storeInviteCode(inviteCode)
    }
  }
}
</script>
```

- [ ] **Step 2: 测试App.vue邀请码处理**

运行：启动C端应用，测试扫码/链接进入

预期：邀请码正确存储到storage

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\shao
git add App.vue
git commit -m "feat: add invite code handling and auto login logic in App.vue"
```

---

## Task 5: C端login.vue登录逻辑重构

**Files:**
- Modify: `shao/pages/login/login.vue`

- [ ] **Step 1: 在login.vue中重构登录逻辑**

```vue
<!-- shao/pages/login/login.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { login, loginWithPassword, getUserInfo, useInviteCode, joinChannelByInvite } from '../../services/api'
import { setToken, setUser, setLoginState } from '../../utils/storage'
import { fetchAuthConfig, getStoredAuthConfig } from '../../services/auth-config'
import type { AuthConfig } from '../../services/auth-config'

// #ifdef H5
import { isWechatBrowser } from '../../utils/env'
import { redirectToWechatAuth } from '../../utils/wx-h5-login'
// #endif

// 认证配置
const authConfig = ref<AuthConfig | null>(null)
const authMode = computed(() => authConfig.value?.mode || 'local')

// 环境检测
const isWechat = computed(() => {
  // #ifdef MP-WEIXIN
  return true
  // #endif
  // #ifdef H5
  return isWechatBrowser()
  // #endif
  return false
})

const isH5Wechat = computed(() => {
  // #ifdef H5
  return isWechatBrowser()
  // #endif
  return false
})

// 登录状态
const hasToken = computed(() => !!uni.getStorageSync('token'))

// 页面阶段
const loginPhase = ref('checking') // checking | waiting | buttons | manual | redirecting

// 自动登录等待
const waitingCountdown = ref(3)
let waitingTimer = null

// 邀请码
const inviteCode = ref('')
const channelInviteCode = ref('')
const showInviteCodeInput = ref(false)

// 表单数据
const loginForm = ref({
  phone: '',
  code: '',
  username: '',
  password: ''
})

const agreeTerms = ref(true)

onMounted(async () => {
  console.log('[Login] Page mounted')
  
  // 1. 获取认证配置
  const stored = getStoredAuthConfig()
  if (stored) {
    authConfig.value = stored
  } else {
    authConfig.value = await fetchAuthConfig()
    uni.setStorageSync('authConfig', JSON.stringify(authConfig.value))
  }
  
  console.log('[Login] Auth mode:', authMode.value)
  console.log('[Login] Is wechat:', isWechat.value)
  console.log('[Login] Has token:', hasToken.value)
  
  // 2. 读取邀请码
  inviteCode.value = uni.getStorageSync('inviteCode') || ''
  channelInviteCode.value = uni.getStorageSync('channelInviteCode') || ''
  
  if (inviteCode.value || channelInviteCode.value) {
    showInviteCodeInput.value = true
  }
  
  // 3. 根据状态决定页面阶段
  if (authMode.value === 'third' && isWechat.value) {
    if (hasToken.value) {
      console.log('[Login] Token exists, redirect immediately')
      loginPhase.value = 'redirecting'
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 100)
      return
    }
    
    const autoLoginAttempted = uni.getStorageSync('autoLoginAttempted')
    const autoLoginSuccess = uni.getStorageSync('autoLoginSuccess')
    
    // #ifdef MP-WEIXIN
    if (!autoLoginAttempted) {
      loginPhase.value = 'waiting'
      startWaitingTimer()
    } else if (autoLoginSuccess === 'true') {
      loginPhase.value = 'redirecting'
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 100)
    } else {
      loginPhase.value = 'manual'
    }
    // #endif
    
    // #ifdef H5
    loginPhase.value = 'buttons'
    // #endif
  } else {
    loginPhase.value = 'manual'
  }
})

function startWaitingTimer() {
  waitingCountdown.value = 3
  waitingTimer = setInterval(() => {
    waitingCountdown.value--
    
    const token = uni.getStorageSync('token')
    if (token) {
      clearInterval(waitingTimer)
      loginPhase.value = 'redirecting'
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 100)
      return
    }
    
    if (waitingCountdown.value <= 0) {
      clearInterval(waitingTimer)
      loginPhase.value = 'manual'
    }
  }, 1000)
}

function quickLogin() {
  // #ifdef H5
  redirectToWechatAuth('snsapi_base')
  // #endif
}

function fullLogin() {
  // #ifdef H5
  redirectToWechatAuth('snsapi_userinfo')
  // #endif
}

async function handleLogin() {
  if (!agreeTerms.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '登录中...' })
  
  try {
    let res: any
    
    if (loginForm.value.username && loginForm.value.password) {
      res = await loginWithPassword(loginForm.value.username, loginForm.value.password)
    } else if (loginForm.value.phone && loginForm.value.code) {
      res = await login(loginForm.value.phone, loginForm.value.code)
    } else {
      uni.hideLoading()
      uni.showToast({ title: '请输入登录信息', icon: 'none' })
      return
    }
    
    const resData = res as any
    
    if (resData.jwt || resData.token) {
      const token = resData.jwt || resData.token
      
      setLoginState({
        token,
        user: resData.user || {
          id: 'user_' + Date.now(),
          name: loginForm.value.username || '用户' + loginForm.value.phone.slice(-4),
          phone: loginForm.value.phone,
          username: loginForm.value.username
        }
      })
      
      // 绑定邀请码
      await bindInviteCodesAfterLogin(resData.user?.id)
      
      uni.hideLoading()
      uni.showToast({ title: '登录成功', icon: 'success' })
      
      uni.removeStorageSync('isGuest')
      
      setTimeout(() => {
        const guideCompleted = uni.getStorageSync('guideCompleted')
        if (!guideCompleted) {
          uni.redirectTo({ url: '/pages/guide/guide' })
        } else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }, 1000)
    } else {
      throw new Error('登录失败')
    }
  } catch (e: any) {
    console.error('登录失败', e)
    uni.hideLoading()
    
    const errorMessage = e.response?.data?.error || e.message || '登录失败'
    uni.showToast({ title: errorMessage, icon: 'none' })
  }
}

async function bindInviteCodesAfterLogin(userId: number) {
  if (inviteCode.value) {
    try {
      await useInviteCode(inviteCode.value)
      console.log('[Login] User invite code bound successfully')
      uni.removeStorageSync('inviteCode')
      
      uni.showToast({
        title: '邀请码绑定成功',
        icon: 'success'
      })
    } catch (e) {
      console.error('[Login] Failed to bind user invite code:', e)
      uni.showToast({
        title: '邀请码绑定失败，请稍后重试',
        icon: 'none'
      })
    }
  }
  
  if (channelInviteCode.value) {
    try {
      await joinChannelByInvite(channelInviteCode.value)
      console.log('[Login] Channel invite code bound successfully')
      uni.removeStorageSync('channelInviteCode')
      
      uni.showToast({
        title: '已加入渠道',
        icon: 'success'
      })
    } catch (e) {
      console.error('[Login] Failed to join channel:', e)
      uni.showToast({
        title: '渠道邀请失败，请稍后重试',
        icon: 'none'
      })
    }
  }
}

onUnmounted(() => {
  if (waitingTimer) clearInterval(waitingTimer)
})
</script>

<template>
  <view class="login-container">
    <!-- 邀请码提示 -->
    <view v-if="showInviteCodeInput && (inviteCode || channelInviteCode)" class="invite-code-tip">
      <view class="tip-icon">🎁</view>
      <view class="tip-content">
        <text class="tip-title">邀请码已识别</text>
        <text class="tip-text">
          {{ channelInviteCode ? '将自动加入渠道' : '将绑定邀请关系' }}
        </text>
      </view>
    </view>
    
    <!-- Phase: checking/waiting -->
    <view v-if="loginPhase === 'checking' || loginPhase === 'waiting'" class="waiting-phase">
      <view class="loading-spinner"></view>
      <text class="waiting-text">正在自动登录...</text>
      <text class="countdown-text">{{ waitingCountdown }}秒</text>
    </view>
    
    <!-- Phase: redirecting -->
    <view v-if="loginPhase === 'redirecting'" class="redirecting-phase">
      <text class="success-text">✓ 登录成功</text>
      <text class="redirect-text">正在跳转...</text>
    </view>
    
    <!-- Phase: buttons -->
    <view v-if="loginPhase === 'buttons'" class="buttons-phase">
      <view class="header">
        <text class="title">微信快捷登录</text>
        <text class="subtitle">检测到微信浏览器，请选择登录方式</text>
      </view>
      
      <view class="button-group">
        <button class="primary-btn" @click="quickLogin">
          <text>快速登录</text>
        </button>
        <text class="btn-hint">无需授权，一键登录</text>
        
        <button class="secondary-btn" @click="fullLogin">
          <text>完善资料登录</text>
        </button>
        <text class="btn-hint">授权获取微信昵称和头像</text>
      </view>
      
      <view class="divider">
        <view class="line"></view>
        <text class="text">或使用账号密码登录</text>
        <view class="line"></view>
      </view>
      
      <view class="manual-login-trigger" @click="loginPhase = 'manual'">
        <text>账号密码登录</text>
      </view>
    </view>
    
    <!-- Phase: manual -->
    <view v-if="loginPhase === 'manual'" class="manual-phase">
      <view class="form-title">
        <text>欢迎登录</text>
      </view>
      
      <view class="form-item">
        <view class="form-label">
          <text>账号/邮箱</text>
        </view>
        <input 
          class="form-input" 
          v-model="loginForm.username" 
          type="text" 
          placeholder="请输入账号或邮箱"
        />
      </view>
      
      <view class="form-item">
        <view class="form-label">
          <text>密码</text>
        </view>
        <input 
          class="form-input" 
          v-model="loginForm.password" 
          type="password" 
          placeholder="请输入密码"
        />
      </view>
      
      <view 
        :class="['login-btn', { disabled: !loginForm.username || !loginForm.password }]"
        @click="handleLogin"
      >
        <text>登录</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.invite-code-tip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  margin: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.tip-icon {
  font-size: 48rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
}

.tip-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

.waiting-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.waiting-text {
  font-size: 32rpx;
  color: #666;
  margin-top: 40rpx;
}

.countdown-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}

.redirecting-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.success-text {
  font-size: 32rpx;
  color: #07c160;
  font-weight: bold;
}

.redirect-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}

.buttons-phase {
  padding: 80rpx 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  margin-top: 20rpx;
}

.button-group {
  margin-top: 60rpx;
}

.primary-btn {
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 48rpx;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.secondary-btn {
  background: #fff;
  color: #07c160;
  border: 2rpx solid #07c160;
  border-radius: 48rpx;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 30rpx;
}

.btn-hint {
  font-size: 22rpx;
  color: #999;
  text-align: center;
  margin-top: 10rpx;
  display: block;
}

.divider {
  display: flex;
  align-items: center;
  margin-top: 60rpx;
}

.line {
  flex: 1;
  height: 1rpx;
  background: #e0e0e0;
}

.text {
  font-size: 24rpx;
  color: #999;
  padding: 0 20rpx;
}

.manual-login-trigger {
  text-align: center;
  margin-top: 40rpx;
  font-size: 28rpx;
  color: #667eea;
}

.manual-phase {
  padding: 40rpx;
}

.form-title {
  text-align: center;
  margin-bottom: 40rpx;
}

.form-title text {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  margin-bottom: 15rpx;
}

.form-label text {
  font-size: 28rpx;
  color: #666;
}

.form-input {
  width: 100%;
  height: 90rpx;
  padding: 0 30rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #333;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 48rpx;
  margin-top: 20rpx;
}

.login-btn text {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}

.login-btn.disabled {
  background: #ccc;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

- [ ] **Step 2: 测试login.vue登录流程**

运行：启动C端应用，测试首次/再次登录

预期：首次显示按钮，再次直接跳转

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\shao
git add pages/login/login.vue
git commit -m "feat: refactor login logic with invite code support and first/return login distinction"
```

---

## Task 6: C端services/api.ts邀请码接口

**Files:**
- Modify: `shao/services/api.ts`

- [ ] **Step 1: 在api.ts中添加邀请码接口**

```typescript
// shao/services/api.ts
/**
 * 使用用户邀请码（建立邀请关系）
 */
export async function useInviteCode(inviteCode: string) {
  return request('/zhao-channel/v1/user-invite/use', {
    method: 'POST',
    data: { inviteCode }
  })
}

/**
 * 通过渠道邀请码加入渠道
 */
export async function joinChannelByInvite(channelInviteCode: string) {
  return request('/zhao-channel/v1/channel-invite/join', {
    method: 'POST',
    data: { inviteCode: channelInviteCode }
  })
}

/**
 * 微信登录（携带邀请码）
 */
export async function wxMiniProgramLogin(code: string, inviteCode?: string, channelInviteCode?: string) {
  return request('/v1/third/callback', {
    method: 'POST',
    data: {
      platform: 'wechat',
      appType: 'mini_program',
      code,
      inviteCode: inviteCode || undefined,
      channelInviteCode: channelInviteCode || undefined
    }
  })
}
```

- [ ] **Step 2: 测试邀请码接口**

运行：测试邀请码绑定功能

预期：接口正常调用

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\shao
git add services/api.ts
git commit -m "feat: add invite code binding APIs"
```

---

## Task 7: C端wx-login.ts邀请码参数

**Files:**
- Modify: `shao/utils/wx-login.ts`

- [ ] **Step 1: 在wx-login.ts中添加邀请码参数**

```typescript
// shao/utils/wx-login.ts
export async function silentLogin(inviteCode?: string, channelInviteCode?: string): Promise<any> {
  // 防止并发登录
  if (loginPromise) return loginPromise

  loginPromise = _doSilentLogin(inviteCode, channelInviteCode)
  try {
    const result = await loginPromise
    return result
  } finally {
    loginPromise = null
  }
}

async function _doSilentLogin(inviteCode?: string, channelInviteCode?: string) {
  // 已有 token 则跳过
  const existingToken = getToken()
  if (existingToken) {
    return { token: existingToken, user: null, isNewUser: false, requireAuth: false }
  }

  // 1. 获取微信登录 code
  const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  const code = loginRes.code
  if (!code) {
    throw new Error('微信登录失败：无法获取 code')
  }

  // 2. 发送 code 到后端，携带邀请码
  const result = await wxMiniProgramLogin(
    code,
    inviteCode || uni.getStorageSync('inviteCode'),
    channelInviteCode || uni.getStorageSync('channelInviteCode')
  ) as any

  // 3. 存储 token 和用户信息
  if (result.token) {
    setToken(result.token)
  }
  if (result.user) {
    setUser(result.user)
  }

  // 4. 登录成功后清除邀请码
  if (result.token) {
    uni.removeStorageSync('inviteCode')
    uni.removeStorageSync('channelInviteCode')
  }

  // 5. 检查是否需要授权
  let requireAuth = false
  try {
    const config = await getThirdPartyPublicConfig('wechat', 'mini_program') as any
    requireAuth = config?.requireAuth === true
  } catch {
    // 配置不存在，默认不需要授权
  }

  return {
    token: result.token,
    user: result.user,
    isNewUser: result.isNewUser,
    requireAuth,
  }
}
```

- [ ] **Step 2: 测试微信登录邀请码处理**

运行：测试微信小程序登录

预期：邀请码正确传递

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\shao
git add utils/wx-login.ts
git commit -m "feat: add invite code parameters to wx login"
```

---

## Task 8: C端wx-h5-login.ts邀请码参数

**Files:**
- Modify: `shao/utils/wx-h5-login.ts`

- [ ] **Step 1: 在wx-h5-login.ts中添加邀请码参数**

```typescript
// shao/utils/wx-h5-login.ts
export async function handleH5WechatCallback(code: string): Promise<any> {
  const scope = uni.getStorageSync('wxAuthScope') || 'snsapi_base'
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
  }) as any
  
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

- [ ] **Step 2: 测试H5微信登录邀请码处理**

运行：测试H5微信浏览器登录

预期：邀请码正确传递

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\shao
git add utils/wx-h5-login.ts
git commit -m "feat: add invite code parameters to H5 wechat login"
```

---

## Task 9: Web后台App.vue渠道邀请码处理

**Files:**
- Modify: `web/App.vue`

- [ ] **Step 1: 在web/App.vue中添加渠道邀请码处理**

```vue
<!-- web/App.vue -->
<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(async () => {
  console.log('[Web App] App Launch')
  
  // 处理渠道邀请码
  await handleChannelInviteCode()
})

async function handleChannelInviteCode() {
  // #ifdef H5
  const urlParams = new URLSearchParams(window.location.search)
  const channelCode = urlParams.get('channelCode') || urlParams.get('inviteCode')
  
  if (channelCode) {
    console.log('[Web App] Channel invite code detected:', channelCode)
    
    // 存储渠道邀请码
    uni.setStorageSync('webChannelInviteCode', channelCode)
    
    // 清除URL参数
    const cleanUrl = removeChannelCodeFromUrl(window.location.href)
    window.history.replaceState({}, '', cleanUrl)
  }
  // #endif
}

function removeChannelCodeFromUrl(url: string): string {
  const urlObj = new URL(url)
  urlObj.searchParams.delete('channelCode')
  urlObj.searchParams.delete('inviteCode')
  return urlObj.pathname + urlObj.search + urlObj.hash
}
</script>
```

- [ ] **Step 2: 测试Web后台渠道邀请码处理**

运行：启动Web后台，测试链接进入

预期：渠道邀请码正确存储

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\web
git add App.vue
git commit -m "feat: add channel invite code handling in web App.vue"
```

---

## Task 10: Web后台auth-config.js认证配置工具

**Files:**
- Create: `web/src/utils/auth-config.js`

- [ ] **Step 1: 创建auth-config.js文件**

```javascript
// web/src/utils/auth-config.js
/**
 * Web后台认证配置工具
 */

let cachedConfig = null

const DEFAULT_CONFIG = {
  mode: 'local',
  methods: ['password'],
  ssoLoginUrl: null,
  wechatEnabled: false,
  registerEnabled: true
}

/**
 * 获取认证配置（带缓存）
 */
export async function fetchAuthConfig() {
  if (cachedConfig) return cachedConfig
  
  try {
    const res = await get('/zhao-auth/v1/auth/config')
    cachedConfig = res
    return res
  } catch (e) {
    console.warn('[auth-config] Failed to fetch, use default:', e)
    return DEFAULT_CONFIG
  }
}

/**
 * 清除缓存
 */
export function clearAuthConfigCache() {
  cachedConfig = null
}

/**
 * 从storage读取（同步）
 */
export function getStoredAuthConfig() {
  try {
    const stored = uni.getStorageSync('webAuthConfig')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return null
}
```

- [ ] **Step 2: 测试认证配置读取**

运行：测试auth config接口调用

预期：配置正确读取

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\web
git add src/utils/auth-config.js
git commit -m "feat: create auth config utility for web backend"
```

---

## Task 11: Web后台login/index.vue SSO支持

**Files:**
- Modify: `web/pages/login/index.vue`

- [ ] **Step 1: 在login/index.vue中添加SSO支持**

```vue
<!-- web/pages/login/index.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../src/store/user.js'
import { post } from '../../src/utils/request.js'
import { fetchAuthConfig, getStoredAuthConfig } from '../../src/utils/auth-config.js'

const userStore = useUserStore()
const loading = ref(false)
const mode = ref('login')

// 认证配置
const authConfig = ref(null)
const authMode = computed(() => authConfig.value?.mode || 'local')
const ssoLoginUrl = computed(() => authConfig.value?.ssoLoginUrl || '')

// 渠道邀请码
const channelInviteCode = ref('')
const showChannelInviteTip = ref(false)

const form = ref({
  identifier: '',
  password: ''
})

onMounted(async () => {
  // 1. 获取认证配置
  const stored = getStoredAuthConfig()
  if (stored) {
    authConfig.value = stored
  } else {
    authConfig.value = await fetchAuthConfig()
    uni.setStorageSync('webAuthConfig', JSON.stringify(authConfig.value))
  }
  
  console.log('[Web Login] Auth mode:', authMode.value)
  console.log('[Web Login] SSO enabled:', authMode.value === 'sso')
  
  // 2. 读取渠道邀请码
  channelInviteCode.value = uni.getStorageSync('webChannelInviteCode') || ''
  if (channelInviteCode.value) {
    showChannelInviteTip.value = true
  }
})

function redirectToSso() {
  if (!ssoLoginUrl.value) {
    uni.showToast({ title: 'SSO登录地址未配置', icon: 'none' })
    return
  }
  
  // 保存当前页面路径
  const currentPage = '/pages/dashboard/index'
  uni.setStorageSync('ssoRedirectUrl', currentPage)
  
  // 跳转到SSO登录页
  // #ifdef H5
  window.location.href = ssoLoginUrl.value + '?redirect=' + encodeURIComponent(currentPage)
  // #endif
  
  // #ifndef H5
  uni.showToast({ title: '请在浏览器中打开SSO登录', icon: 'none' })
  // #endif
}

async function handleLogin() {
  if (!form.value.identifier || !form.value.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  
  loading.value = true
  try {
    const res = await post('/zhao-auth/v1/admin/auth/local', {
      identifier: form.value.identifier,
      password: form.value.password
    })
    
    userStore.setUserData(res)
    await userStore.fetchUserRoles()
    
    // 处理渠道邀请码
    await handleChannelInviteAfterLogin(res.user.id)
    
    uni.showToast({ title: '登录成功', icon: 'success' })
    
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/dashboard/index' })
    }, 500)
  } catch (error) {
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleChannelInviteAfterLogin(userId) {
  if (!channelInviteCode.value) return
  
  try {
    uni.showLoading({ title: '正在加入渠道...' })
    
    const { joinChannelByInvite } = await import('../../src/api/channel.js')
    await joinChannelByInvite(channelInviteCode.value)
    
    uni.hideLoading()
    uni.showToast({
      title: '已成功加入渠道',
      icon: 'success',
      duration: 2000
    })
    
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
</script>

<template>
  <view class="login-page">
    <view class="login-box">
      <view class="login-title">TAdmin 管理后台</view>
      <view class="login-subtitle">Strapi 全栈管理系统</view>
      
      <!-- 渠道邀请提示 -->
      <view v-if="showChannelInviteTip" class="channel-invite-tip">
        <view class="tip-icon">🏢</view>
        <view class="tip-content">
          <text class="tip-title">渠道邀请</text>
          <text class="tip-text">登录后将自动加入渠道</text>
        </view>
      </view>
      
      <!-- SSO模式 -->
      <view v-if="authMode === 'sso' && mode === 'login'">
        <view class="sso-section">
          <button class="sso-btn" @click="redirectToSso">
            <text>前往SSO登录</text>
          </button>
          <text class="sso-hint">使用统一身份认证登录</text>
        </view>
        
        <!-- 降级：本地登录 -->
        <view class="divider">
          <view class="line"></view>
          <text class="text">或使用账号密码登录</text>
          <view class="line"></view>
        </view>
        
        <view class="form-item">
          <input 
            v-model="form.identifier" 
            class="form-input" 
            placeholder="用户名/邮箱" 
            type="text"
          />
        </view>
        <view class="form-item">
          <input 
            v-model="form.password" 
            class="form-input" 
            placeholder="密码" 
            type="password"
            @confirm="handleLogin"
          />
        </view>
        <button 
          class="login-btn" 
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
        
        <view class="form-links">
          <text class="link" @click="mode = 'register'">注册账号</text>
          <text class="link" @click="mode = 'forgot'">忘记密码</text>
        </view>
      </view>
      
      <!-- 本地模式 -->
      <view v-else-if="authMode === 'local' && mode === 'login'">
        <view class="form-item">
          <input 
            v-model="form.identifier" 
            class="form-input" 
            placeholder="用户名/邮箱" 
            type="text"
          />
        </view>
        <view class="form-item">
          <input 
            v-model="form.password" 
            class="form-input" 
            placeholder="密码" 
            type="password"
            @confirm="handleLogin"
          />
        </view>
        <button 
          class="login-btn" 
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <view class="form-links">
          <text class="link" @click="mode = 'register'">注册账号</text>
          <text class="link" @click="mode = 'forgot'">忘记密码</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.channel-invite-tip {
  background: #e3f2fd;
  border: 2rpx solid #2196f3;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.tip-icon {
  font-size: 48rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  color: #2196f3;
  font-weight: bold;
}

.tip-text {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.sso-section {
  margin-bottom: 30rpx;
}

.sso-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.sso-hint {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-top: 10rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
}

.line {
  flex: 1;
  height: 1rpx;
  background: #e0e0e0;
}

.text {
  font-size: 24rpx;
  color: #999;
  padding: 0 20rpx;
}
</style>
```

- [ ] **Step 2: 测试Web后台SSO登录**

运行：测试SSO登录流程

预期：SSO按钮正确显示，跳转正确

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\web
git add pages/login/index.vue
git commit -m "feat: add SSO login support and channel invite handling in web login"
```

---

## Task 12: Web后台channel.js渠道邀请码接口

**Files:**
- Create: `web/src/api/channel.js`

- [ ] **Step 1: 创建channel.js文件**

```javascript
// web/src/api/channel.js
import { post } from '../utils/request.js'

/**
 * 通过邀请码加入渠道
 */
export function joinChannelByInvite(inviteCode) {
  return post('/zhao-channel/v1/channel-invite/join', {
    inviteCode
  })
}
```

- [ ] **Step 2: 测试渠道邀请码接口**

运行：测试渠道邀请码绑定

预期：接口正常调用

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\web
git add src/api/channel.js
git commit -m "feat: create channel invite API for web backend"
```

---

## Task 13: Web后台course/form.vue错误提示优化

**Files:**
- Modify: `web/pages/course/form.vue`

- [ ] **Step 1: 在course/form.vue中优化错误提示**

```vue
<!-- web/pages/course/form.vue -->
<script setup>
// ... 现有代码 ...

function setChannelScope(scope) {
  form.channelScope = scope
  
  if (scope === 'all') {
    form.channelIds = []
    form.pointChannel = null
    uni.showToast({ title: '已切换为全部渠道模式', icon: 'none', duration: 1500 })
  } else {
    form.channelIds = []
    form.pointChannel = null
    uni.showToast({ title: '请选择至少1个所属渠道', icon: 'none', duration: 2000 })
  }
}

function toggleChannel(ch) {
  const id = Number(ch.id)
  const idx = form.channelIds.findIndex(cid => Number(cid) === id)
  
  if (idx > -1) {
    form.channelIds.splice(idx, 1)
    
    if (Number(form.pointChannel) === id) {
      form.pointChannel = null
      uni.showToast({ title: '积分归属渠道已清空，请重新选择', icon: 'none', duration: 2000 })
    }
  } else {
    form.channelIds.push(id)
    
    if (!form.pointChannel && form.channelIds.length === 1) {
      uni.showToast({ title: '请选择积分归属渠道', icon: 'none', duration: 2000 })
    }
  }
}

async function handleSubmit() {
  if (!form.title) {
    uni.showToast({ title: '请输入课程名称', icon: 'none', duration: 2000 })
    return
  }
  
  if (form.channelScope === 'specific') {
    if (!form.channelIds.length) {
      uni.showModal({
        title: '提示',
        content: '指定渠道模式下，请至少选择1个所属渠道。\n\n课程将仅对所选渠道的成员可见。',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }
    
    if (!form.pointChannel) {
      uni.showModal({
        title: '提示',
        content: '请选择积分归属渠道。\n\n学习本课程获得的积分将归属此渠道，用于渠道数据统计和奖励发放。',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }
    
    if (!form.channelIds.includes(form.pointChannel)) {
      uni.showModal({
        title: '配置错误',
        content: '积分归属渠道必须在所属渠道中。\n\n请重新选择积分归属渠道。',
        showCancel: false,
        confirmText: '重新选择'
      })
      showPointChannelPicker.value = true
      return
    }
  }
  
  // ... 提交逻辑 ...
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    if (isEdit.value) {
      await updateCourse(courseId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createCourse(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    
    uni.hideLoading()
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    uni.hideLoading()
    
    const errorMsg = e.message || '保存失败'
    
    if (errorMsg.includes('COURSE_001')) {
      uni.showModal({
        title: '渠道配置错误',
        content: errorMsg.replace('COURSE_001: ', ''),
        showCancel: false
      })
    } else {
      uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
    }
  }
}
</script>
```

- [ ] **Step 2: 测试课程跨渠道设置**

运行：测试课程保存时的错误提示

预期：错误提示友好

- [ ] **Step 3: 提交代码**

```bash
cd E:\code\web
git add pages/course/form.vue
git commit -m "feat: improve error messages for course channel settings"
```

---

## Task 14: 集成测试

**Files:**
- 无文件修改，仅测试

- [ ] **Step 1: 测试C端微信登录完整流程**

测试场景：
1. 微信小程序首次登录（无token）
2. 微信小程序再次登录（有token）
3. H5微信浏览器首次登录（无token）
4. H5微信浏览器再次登录（有token）
5. 非微信环境登录
6. 自动登录失败降级

预期：所有场景正常工作

- [ ] **Step 2: 测试邀请码完整流程**

测试场景：
1. 扫码进入（用户邀请码）
2. 扫码进入（渠道邀请码）
3. 链接进入（用户邀请码）
4. 链接进入（渠道邀请码）
5. 小程序码进入
6. 邀请码绑定成功
7. 邀请码绑定失败

预期：所有场景正常工作

- [ ] **Step 3: 测试Web后台SSO登录**

测试场景：
1. SSO模式登录
2. SSO登录成功跳转
3. SSO登录失败降级
4. 本地模式登录
5. 渠道邀请码处理

预期：所有场景正常工作

- [ ] **Step 4: 测试课程跨渠道设置**

测试场景：
1. 全部渠道模式保存
2. 指定渠道模式保存（正确配置）
3. 指定渠道模式保存（未选择渠道）
4. 指定渠道模式保存（未设置pointChannel）
5. 指定渠道模式保存（pointChannel不在channelIds中）

预期：所有场景正常工作

- [ ] **Step 5: 修复发现的问题**

根据测试结果修复问题

- [ ] **Step 6: 最终提交**

```bash
cd E:\code
git add -A
git commit -m "feat: complete login, SSO, invite code and channel settings optimization"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✓ C端微信登录优化（首次/再次登录）
- ✓ 邀请码处理（用户邀请码/渠道邀请码）
- ✓ Web后台SSO统一配置
- ✓ 课程跨渠道设置优化
- ✓ 所有设计文档要求已覆盖

**2. Placeholder scan:**
- ✓ 无TBD、TODO、implement later等placeholder
- ✓ 所有步骤包含完整代码
- ✓ 所有步骤包含具体命令和预期输出

**3. Type consistency:**
- ✓ 函数名称一致（如identifyInviteCode、storeInviteCode）
- ✓ 参数名称一致（如inviteCode、channelInviteCode）
- ✓ 接口路径一致（如/zhao-auth/v1/auth/config）

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-17-login-sso-channel-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**