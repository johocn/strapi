# 认证配置分层管控 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 tenant/detail.vue 嵌套 extraConfig 提交 bug，补齐 site-config.vue 的 wechatOpenPlatformEnabled 字段，后端增加防御性顶层 extraConfig 展开，实现认证配置分层管控。

**Architecture:** 前端两页均展开提交 extraConfig 到顶层（不传 extraConfig 字段），后端 updateSite/updateSiteById 识别顶层 extraConfig 字段并展开为 extraData。租户页受模板 fieldConstraints 约束，平台页不受约束。

**Tech Stack:** Vue 3 + uni-app（前端），Strapi v5 + TypeScript（后端插件 zhao-common）

**Spec:** `docs/superpowers/specs/2026-07-04-auth-config-layered-control-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|---------|
| `web/pages/tenant/detail.vue` | 平台管理员租户详情页 | 修改 saveTenant 提交结构 |
| `web/pages/settings/site-config.vue` | 租户管理员站点配置页 | 修改：增加 wechatOpenPlatformEnabled 字段 |
| `basic/plugins/zhao-common/server/src/controllers/config.ts` | 后端配置控制器 | 修改：updateSite 和 updateSiteById 增加顶层 extraConfig 防御展开 |

---

### Task 1: site-config.vue 增加 wechatOpenPlatformEnabled 字段

**Files:**
- Modify: `web/pages/settings/site-config.vue` (form 定义、loadConfig 读取、handleSave 提交、模板增加开关)

- [ ] **Step 1: 在模板的抖音登录开关之后增加微信开放平台开关**

编辑 `web/pages/settings/site-config.vue`，找到抖音登录开关的 view 块（约 L162-169）：

```vue
<!-- 抖音登录 -->
<view class="form-item switch-item" v-if="isFieldVisible('douyinEnabled')">
  <view>
    <text class="form-label">抖音登录</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.douyinEnabled" @change="form.douyinEnabled = $event.detail.value" :disabled="!isFieldEditable('douyinEnabled')" color="#07c160" />
</view>
```

在其后追加：

```vue
<!-- 微信开放平台 -->
<view class="form-item switch-item" v-if="isFieldVisible('wechatOpenPlatformEnabled')">
  <view>
    <text class="form-label">微信开放平台</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.wechatOpenPlatformEnabled" @change="form.wechatOpenPlatformEnabled = $event.detail.value" :disabled="!isFieldEditable('wechatOpenPlatformEnabled')" color="#07c160" />
</view>
```

- [ ] **Step 2: 在 form 初始值中增加 wechatOpenPlatformEnabled**

找到 form 定义（约 L466 开始的 `const form = ref({`），在 `wechatOfficialAccountEnabled: false,` 之后增加一行：

```js
  wechatOfficialAccountEnabled: false,
  wechatOpenPlatformEnabled: false,
  alipayEnabled: false,
```

- [ ] **Step 3: 在 loadConfig 中读取 wechatOpenPlatformEnabled**

找到 loadConfig 函数中的字段回填（约 L587-590），在 `wechatOfficialAccountEnabled: data.wechatOfficialAccountEnabled ?? false,` 之后增加：

```js
        wechatOfficialAccountEnabled: data.wechatOfficialAccountEnabled ?? false,
        wechatOpenPlatformEnabled: data.wechatOpenPlatformEnabled ?? false,
        alipayEnabled: data.alipayEnabled ?? false,
```

- [ ] **Step 4: 在 handleSave 中提交 wechatOpenPlatformEnabled**

找到 handleSave 函数中的提交对象（约 L685-688），在 `wechatOfficialAccountEnabled: form.value.wechatOfficialAccountEnabled,` 之后增加：

```js
      wechatMiniProgramEnabled: form.value.wechatMiniProgramEnabled,
      wechatOfficialAccountEnabled: form.value.wechatOfficialAccountEnabled,
      wechatOpenPlatformEnabled: form.value.wechatOpenPlatformEnabled,
      alipayEnabled: form.value.alipayEnabled,
```

- [ ] **Step 5: 验证前端编译无错**

启动前端 dev server（如已启动则热更新），打开 `http://localhost:5175/#/pages/settings/site-config`，确认页面正常加载且认证配置区域显示"微信开放平台"开关。

Expected: 页面无报错，开关可见且可切换。

- [ ] **Step 6: Commit**

```bash
cd e:/code
git add web/pages/settings/site-config.vue
git commit -m "feat(site-config): 补齐 wechatOpenPlatformEnabled 字段"
```

---

### Task 2: tenant/detail.vue 修复 saveTenant 嵌套 extraConfig 提交

**Files:**
- Modify: `web/pages/tenant/detail.vue` (saveTenant 函数)

- [ ] **Step 1: 修改 saveTenant 提交结构，展开 extraConfig 到顶层**

编辑 `web/pages/tenant/detail.vue`，找到 saveTenant 函数中构造 data 的代码（约 L956-975）：

原代码：
```js
  const mergedExtraConfig = {
    ...cleanedOriginal,
    ...formData.authConfig
  }

  const data = {
    siteName: formData.siteName,
    domain: formData.domain,
    siteDescription: formData.siteDescription,
    icpNumber: formData.icpNumber,
    customerServiceUrl: formData.customerServiceUrl,
    logo: formData.logoId ?? undefined,
    favicon: formData.faviconId ?? undefined,
    seoKeywords: formData.seoKeywords,
    seoDescription: formData.seoDescription,
    tencentMapKey: formData.tencentMapKey,
    shareTitle: formData.shareTitle,
    shareDescription: formData.shareDescription,
    shareImage: formData.shareImageId ?? undefined,
    sharePath: formData.sharePath,
    channels: selectedChannels.value.map(ch => ch.documentId || ch.id),
    featureFlags: formData.featureFlags,
    extraConfig: mergedExtraConfig,
    themeConfig: JSON.stringify(themeConfig.value)
  }
```

改为（删除 `extraConfig: mergedExtraConfig` 行，改为 `...mergedExtraConfig` 展开到顶层）：
```js
  const mergedExtraConfig = {
    ...cleanedOriginal,
    ...formData.authConfig
  }

  const data = {
    siteName: formData.siteName,
    domain: formData.domain,
    siteDescription: formData.siteDescription,
    icpNumber: formData.icpNumber,
    customerServiceUrl: formData.customerServiceUrl,
    logo: formData.logoId ?? undefined,
    favicon: formData.faviconId ?? undefined,
    seoKeywords: formData.seoKeywords,
    seoDescription: formData.seoDescription,
    tencentMapKey: formData.tencentMapKey,
    shareTitle: formData.shareTitle,
    shareDescription: formData.shareDescription,
    shareImage: formData.shareImageId ?? undefined,
    sharePath: formData.sharePath,
    channels: selectedChannels.value.map(ch => ch.documentId || ch.id),
    featureFlags: formData.featureFlags,
    ...mergedExtraConfig,
    themeConfig: JSON.stringify(themeConfig.value)
  }
```

- [ ] **Step 2: 验证前端编译无错**

打开 `http://localhost:5175/#/pages/tenant/detail?documentId=dog3pw7ncjb3gmy8gnrhuxoi&mode=edit`，修改认证模式或三方登录开关，点击保存。

Expected: 保存成功，刷新页面后值正确。

- [ ] **Step 3: Commit**

```bash
cd e:/code
git add web/pages/tenant/detail.vue
git commit -m "fix(tenant-detail): 展开 extraConfig 提交，消除嵌套脏数据源头"
```

---

### Task 3: 后端 updateSiteById 增加顶层 extraConfig 防御展开

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/controllers/config.ts` (updateSiteById 字段分类循环)

- [ ] **Step 1: 在 updateSiteById 的字段分类循环中增加 extraConfig 展开防御**

编辑 `basic/plugins/zhao-common/server/src/controllers/config.ts`，找到 updateSiteById 函数中的字段分类循环（约 L485-504）：

```ts
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
```

改为（在循环开头加 extraConfig 顶层字段防御）：
```ts
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        // 防御：前端若传顶层 extraConfig 对象（旧客户端行为），展开为 extraData 字段
        if (key === "extraConfig" && value && typeof value === "object" && !Array.isArray(value)) {
          for (const [ek, ev] of Object.entries(value as Record<string, any>)) {
            extraData[ek] = ev;
          }
          continue;
        }
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
```

- [ ] **Step 2: 构建插件**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
```

Expected: build complete，无 TS 错误。

- [ ] **Step 3: 重启 Strapi 让新 dist 生效**

停止旧 Strapi 进程，在 `e:/code/basic` 重新运行 `npm run develop`，等待启动完成。

Expected: Strapi 启动成功，监听 1337 端口。

- [ ] **Step 4: 验证防御逻辑（curl 测试）**

登录获取 token 后，发送带顶层 extraConfig 的 PUT 请求模拟旧客户端：

```bash
$loginResp = curl.exe -s -X POST "http://localhost:1337/api/zhao-auth/v1/admin/auth/local" -H "Content-Type: application/json" --data '{"identifier":"1117","password":"a123456"}'
$token = ($loginResp | ConvertFrom-Json).jwt
# 写测试 body 到文件
@'
{"data":{"extraConfig":{"authMode":"third","registerEnabled":true,"wechatMiniProgramEnabled":true}}}
'@ | Set-Content -Path e:\code\basic\test-defensive.json -Encoding UTF8
$resp = curl.exe -s -X PUT "http://localhost:1337/api/zhao-common/v1/admin/config/site/dog3pw7ncjb3gmy8gnrhuxoi" -H "Content-Type: application/json" -H "Authorization: Bearer $token" --data "@e:\code\basic\test-defensive.json"
# 验证响应中 authMode=third, registerEnabled=true, wechatMiniProgramEnabled=true
$resp | Select-String -Pattern '"(authMode|registerEnabled|wechatMiniProgramEnabled)":(true|false|"[^"]*")' -AllMatches | ForEach-Object { $_.Matches.Value }
# 验证无嵌套 extraConfig
$resp -match '"extraConfig":\s*\{'
# 清理
Remove-Item e:\code\basic\test-defensive.json -Force
```

Expected:
- authMode:"third", registerEnabled:True, wechatMiniProgramEnabled:True
- 第二条命令返回 False（无嵌套 extraConfig）

- [ ] **Step 5: Commit**

```bash
cd e:/code
git add basic/plugins/zhao-common/server/src/controllers/config.ts
git commit -m "fix(config): updateSiteById 防御性展开顶层 extraConfig 字段"
```

---

### Task 4: 后端 updateSite 增加顶层 extraConfig 防御展开

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/controllers/config.ts` (updateSite 字段分类循环)

- [ ] **Step 1: 在 updateSite 的字段分类循环中增加 extraConfig 展开防御**

编辑 `basic/plugins/zhao-common/server/src/controllers/config.ts`，找到 updateSite 函数中的字段分类循环（约 L343-362）：

```ts
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
```

改为（在循环开头加 extraConfig 顶层字段防御）：
```ts
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        // 防御：前端若传顶层 extraConfig 对象（旧客户端行为），展开为 extraData 字段
        if (key === "extraConfig" && value && typeof value === "object" && !Array.isArray(value)) {
          for (const [ek, ev] of Object.entries(value as Record<string, any>)) {
            extraData[ek] = ev;
          }
          continue;
        }
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }
```

- [ ] **Step 2: 构建插件**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
```

Expected: build complete，无 TS 错误。

- [ ] **Step 3: 重启 Strapi**

停止旧 Strapi 进程，在 `e:/code/basic` 重新运行 `npm run develop`，等待启动完成。

Expected: Strapi 启动成功。

- [ ] **Step 4: 验证防御逻辑（curl 测试无 id 端点）**

```bash
$loginResp = curl.exe -s -X POST "http://localhost:1337/api/zhao-auth/v1/admin/auth/local" -H "Content-Type: application/json" --data '{"identifier":"1117","password":"a123456"}'
$token = ($loginResp | ConvertFrom-Json).jwt
@'
{"data":{"extraConfig":{"authMode":"local","registerEnabled":false,"wechatMiniProgramEnabled":false}}}
'@ | Set-Content -Path e:\code\basic\test-defensive2.json -Encoding UTF8
$resp = curl.exe -s -X PUT "http://localhost:1337/api/zhao-common/v1/admin/config/site" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -H "x-site-id: dog3pw7ncjb3gmy8gnrhuxoi" --data "@e:\code\basic\test-defensive2.json"
$resp | Select-String -Pattern '"(authMode|registerEnabled|wechatMiniProgramEnabled)":(true|false|"[^"]*")' -AllMatches | ForEach-Object { $_.Matches.Value }
$resp -match '"extraConfig":\s*\{'
Remove-Item e:\code\basic\test-defensive2.json -Force
```

Expected:
- authMode:"local", registerEnabled:False, wechatMiniProgramEnabled:False
- 第二条命令返回 False（无嵌套 extraConfig）

- [ ] **Step 5: Commit**

```bash
cd e:/code
git add basic/plugins/zhao-common/server/src/controllers/config.ts
git commit -m "fix(config): updateSite 防御性展开顶层 extraConfig 字段"
```

---

### Task 5: 端到端验证

**Files:** 无文件改动，仅验证

- [ ] **Step 1: 平台页保存验证**

1. 打开 `http://localhost:5175/#/pages/tenant/detail?documentId=dog3pw7ncjb3gmy8gnrhuxoi&mode=edit`
2. 修改认证模式为"三方认证"
3. 勾选微信开放平台、微信小程序、取消抖音
4. 点击保存
5. 刷新页面（F5）

Expected: 所有修改的值正确回填，无丢失。

- [ ] **Step 2: 租户页保存验证**

1. 打开 `http://localhost:5175/#/pages/settings/site-config`
2. 确认"微信开放平台"开关可见
3. 切换"微信开放平台"开关
4. 点击保存
5. 刷新页面

Expected: 微信开放平台开关值正确回填。

- [ ] **Step 3: 字段对齐验证**

对比两页认证配置区域，确认都包含以下 5 个开关：
- 微信公众号（wechatOfficialAccountEnabled）
- 微信小程序（wechatMiniProgramEnabled）
- 微信开放平台（wechatOpenPlatformEnabled）
- 支付宝（alipayEnabled）
- 抖音（douyinEnabled）

Expected: 两页字段集一致。

- [ ] **Step 4: 数据库脏数据验证**

通过 psql 或 Strapi Content-Type Builder 查询 site-config 表 id=25 的 extraConfig 字段：

```sql
SELECT extra_config FROM site_config WHERE id = 25;
```

Expected: extraConfig 为扁平 JSON，无嵌套 extraConfig 字段。

- [ ] **Step 5: 无 commit（验证任务）**

如所有验证通过，本计划完成。
