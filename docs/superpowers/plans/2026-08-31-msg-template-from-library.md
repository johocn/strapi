# 消息模板「从模板库添加 / 选用已有模板」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 web 运营端「消息模板」编辑页支持「从公众号模板库添加公共模板」与「选用公众号已添加模板」，自动回填 wxTemplateId 并解析字段，解决微信模板 40037（模板不属于发信公众号）问题。

**Architecture:** 后端在 zhao-sso 的 `sso-wx-menu` 服务新增 `addFromLibrary`（复用其 `fetchApi`/`getAccessToken` 模式），消息控制器暴露 `POST /v1/admin/msg-templates/from-library` 路由；前端在 `edit.vue` 的 wxTemplateId 字段下方加两个操作弹窗，回填表单。无新增依赖。

**Tech Stack:** Node.js / Strapi 插件（zhao-sso）、uni-app H5（web 运营端）、微信 cgi-bin 模板接口。

> 说明：本计划相对 spec 将「通道扩展」收敛为「sso-wx-menu 服务新增方法」，因为公众号模板库/已添加模板接口已集中在该服务（`listTemplates`/`fetchApi`），同一处更契合、避免重复 getAccessToken 逻辑，功能等价。

---

### Task 1: 后端服务新增 addFromLibrary

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-wx-menu.ts`

在 return 对象内、`listTemplates` 之后新增方法：

- [ ] **Step 1: 在 `sso-wx-menu.ts` 的 return 对象中新增 addFromLibrary**

在文件末尾 `listTemplates() {...},` 的 `},` 之后追加：

```ts
    /** 从模板库添加公共模板到公众号，返回新 template_id（透传微信 errcode/errmsg） */
    async addFromLibrary(data: { templateIdShort: string; keywordNameList?: string[] }) {
      const { templateIdShort, keywordNameList } = data || {};
      if (!templateIdShort || !String(templateIdShort).trim()) {
        throwErr("SSO_WX_MENU_400", 400, "缺少模板库编号 template_id_short");
      }
      const body: any = { template_id_short: String(templateIdShort).trim() };
      const kws = (Array.isArray(keywordNameList) ? keywordNameList : [])
        .map((s: any) => String(s).trim())
        .filter(Boolean);
      if (kws.length) body.keyword_name_list = kws;

      if (isMock()) return { template_id: "mock_" + Date.now(), errcode: 0 };

      const accessToken = await wechat().getAccessToken("official_account");
      const res = await axios({
        method: "POST",
        url: "https://api.weixin.qq.com/cgi-bin/template/api_add_template",
        params: { access_token: accessToken },
        data: body,
        timeout: 10000,
      });
      const w = res.data || {};
      if (w.errcode) {
        throwErr("SSO_WX_TPL_ADD", 400, `微信添加模板失败(errcode=${w.errcode}): ${w.errmsg}`);
      }
      return { template_id: w.template_id, errcode: 0 };
    },
```

- [ ] **Step 2: 自检类型引用完整性**

确认 `axios` 已在文件顶部 `import axios from "axios";`（已存在）；`wechat()`、`isMock()`、`throwErr` 均为文件内已有函数，无需新增导入。

---

### Task 2: 消息控制器新增 addFromLibrary + 路由

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\message-controller.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`

- [ ] **Step 1: message-controller.ts 删除模板方法后新增 addFromLibrary**

在 `deleteTemplate(ctx) {...},`（约 66 行）之后追加：

```ts
    /** 从模板库添加公共模板到公众号，并解析字段名返回给前端回填 */
    async addFromLibrary(ctx: any) {
      await wrap(ctx, async () => {
        const wx = strapi.plugin("zhao-sso").service("sso-wx-menu");
        const { templateIdShort, keywordNameList } = ctx.request.body || {};
        const added = await wx.addFromLibrary({ templateIdShort, keywordNameList });
        const list: any = await wx.listTemplates();
        const found = (list.template_list || []).find((t: any) => t.template_id === added.template_id);
        const content = (found && found.content) || "";
        const re = /\{\{(\w+)\.DATA\}\}/g;
        const fields: string[] = [];
        let mm: RegExpExecArray | null;
        while ((mm = re.exec(content))) fields.push(mm[1]);
        return {
          data: {
            templateId: added.template_id,
            title: (found && found.title) || "",
            content,
            fields: Array.from(new Set(fields)),
          },
        };
      });
    },
```

- [ ] **Step 2: admin.ts 消息中心段新增路由**

在 `adminRoute("POST", "/msg-templates", "message.createTemplate", "sso.msg.write"),`（约 100 行）之后追加一行：

```ts
    adminRoute("POST", "/msg-templates/from-library", "message.addFromLibrary", "sso.msg.write"),
```

- [ ] **Step 3: 类型自检**

`strapi.plugin("zhao-sso").service("sso-wx-menu")` 已在 wx-menu-controller 中使用同款写法；`wrap` 为 message-controller 内已有 helper。

---

### Task 3: 构建 zhao-sso dist 并本地验证接口

**Files:**
- Modify: 无源码（构建产物 `plugins/zhao-sso/dist`）

- [ ] **Step 1: 重建 dist**

Run（zhao-sso 插件目录）：
```bash
cd e:/code/basic/plugins/zhao-sso && npm run build
```
Expected: 构建成功，无 TS 报错；确认 `dist/server` 内含关键字 `addFromLibrary`（Grep 校验）。

- [ ] **Step 2: 本地启动并 curl 验证（可并行于前端开发）**

确认本机 Strapi 1337 在跑（`dev.ps1 status`），用错误编号验证微信错误透传：
```bash
curl -X POST http://localhost:1337/api/zhao-sso/v1/admin/msg-templates/from-library \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin token>" \
  -d '{"templateIdShort":"0","keywordNameList":[]}'
```
Expected: 返回 4xx 或 5xx 且 body 含 `微信添加模板失败(errcode=...)`（本机若非发信公众号环境或未 mock，则验证抛错路径；mock 模式 `MSG_WECHAT_PROVIDER=mock` 返回 `template_id` 以 `mock_` 开头）。真正添加用发信公众号编号在服务器上验证。

---

### Task 4: 前端 API 封装

**Files:**
- Modify: `e:\code\web\src\api\sso.js`

在 `ssoMsgTemplateApi` 对象内（`delete` 行之后）追加两个方法：

- [ ] **Step 1: 追加 addFromLibrary 与 wxPrivateTemplates**

```js
  addFromLibrary: (data) => post(`${ADMIN}/msg-templates/from-library`, data).then(extractItem),
  wxPrivateTemplates: () => get(`${ADMIN}/wx/templates`).then((res) => (res && res.data && res.data.template_list) || []),
```

说明：`extractItem` 抽取 `{ data: {...} }` 结构，后端 `from-library` 返回 `{ data: { templateId, title, content, fields } }`，故前端拿到 `{ templateId, title, content, fields }`。

---

### Task 5: 编辑页增加两个入口弹窗

**Files:**
- Modify: `e:\code\web\src\pages\sso\msg-template\edit.vue`

- [ ] **Step 1: template 部分在 wxTemplateId 输入行下加操作按钮**

在「公众号模板ID」`input`（约 26-28 行）之后插入两个按钮：

```html
      <view class="form-item">
        <text class="form-label">从公众号获取模板</text>
        <view class="pick-ops">
          <view class="btn-add" @click="openFromLibrary">从模板库添加</view>
          <view class="btn-add" @click="openPickExisting">选用已有模板</view>
        </view>
      </view>
```

- [ ] **Step 2: script 引入 ssoMsgTemplateApi（已存在），新增状态与逻辑**

在 `</script>` 之前（`onLoad` 定义之前）追加：

```js
// ===== 从模板库添加 / 选用已有模板 =====
const libVisible = ref(false)
const libLoading = ref(false)
const libForm = ref({ templateIdShort: '', keywordNames: '' })
const pickVisible = ref(false)
const pickLoading = ref(false)
const pickList = ref([])
const pickActive = ref(0)

function parseFieldsFromContent(content) {
  const fields = []
  const re = /\{\{(\w+)\.DATA\}\}/g
  let mm
  while ((mm = re.exec(content || ''))) fields.push(mm[1])
  return Array.from(new Set(fields))
}
function applyFromLibrary(r) {
  if (!r || !r.templateId) { uni.showToast({ title: '未获得模板ID', icon: 'none' }); return }
  form.value.wxTemplateId = r.templateId
  if (r.content) form.value.content = r.content
  const fields = Array.isArray(r.fields) && r.fields.length ? r.fields : parseFieldsFromContent(r.content)
  form.value.wxTemplateFields = fields.map((name) => ({ key: '', name }))
  if (!Array.isArray(form.value.wxTemplateFields) || !form.value.wxTemplateFields.length) form.value.wxTemplateFields = [{ key: '', name: '' }]
}

async function doFromLibrary() {
  const id = libForm.value.templateIdShort.trim()
  if (!id) { uni.showToast({ title: '请填写模板库编号', icon: 'none' }); return }
  libLoading.value = true
  try {
    const r = await ssoMsgTemplateApi.addFromLibrary({
      templateIdShort: id,
      keywordNameList: libForm.value.keywordNames.split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
    })
    applyFromLibrary(r)
    uni.showToast({ title: '已添加并填充', icon: 'success' })
    libVisible.value = false
  } catch (e) {
    const msg = (e && (e.data && e.data.error || e.message)) || '添加失败'
    uni.showModal({ title: '添加失败', content: msg, showCancel: false })
  } finally {
    libLoading.value = false
  }
}

async function openPickExisting() {
  pickVisible.value = true
  pickLoading.value = true
  pickList.value = []
  pickActive.value = 0
  try {
    pickList.value = await ssoMsgTemplateApi.wxPrivateTemplates()
  } catch (e) {
    uni.showToast({ title: '拉取模板列表失败', icon: 'none' })
  } finally {
    pickLoading.value = false
  }
}
function pickOne() {
  const t = pickList.value[pickActive.value]
  if (!t) return
  form.value.wxTemplateId = t.template_id
  if (t.content) {
    form.value.content = t.content
    const fields = parseFieldsFromContent(t.content)
    if (fields.length) form.value.wxTemplateFields = fields.map((name) => ({ key: '', name }))
  }
  uni.showToast({ title: '已选用', icon: 'success' })
  pickVisible.value = false
}
```

- [ ] **Step 3: template 底部加两个弹窗**

在 `</template>` 之前（发送测试弹窗之后）追加：

```html
    <!-- 从模板库添加弹窗 -->
    <view class="send-mask" v-if="libVisible" @click="libVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">从模板库添加</text>
          <text class="ab-modal-close" @click="libVisible = false">✕</text>
        </view>
        <view class="form-item">
          <text class="form-label">模板库编号 <text class="required">*</text></text>
          <input class="form-input" v-model="libForm.templateIdShort" placeholder="如 3493（微信模板库中模板的编号）" />
        </view>
        <view class="form-item">
          <text class="form-label">关键词名列表（可选，逗号分隔）</text>
          <input class="form-input" v-model="libForm.keywordNames" placeholder="类目模板需按顺序填，如：时间,地点" />
        </view>
        <view class="send-footer">
          <view class="btn-add" @click="libVisible = false">取消</view>
          <button class="btn-save small" @click="doFromLibrary" :disabled="libLoading">{{ libLoading ? '添加中...' : '添加并填充' }}</button>
        </view>
      </view>
    </view>

    <!-- 选用已有模板弹窗 -->
    <view class="send-mask" v-if="pickVisible" @click="pickVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">选用公众号已有模板</text>
          <text class="ab-modal-close" @click="pickVisible = false">✕</text>
        </view>
        <view v-if="pickLoading" class="version-empty">加载中...</view>
        <view v-else-if="pickList.length === 0" class="version-empty">公众号未添加模板</view>
        <view v-else class="pick-list">
          <view
            v-for="(t, i) in pickList"
            :key="t.template_id || i"
            class="pick-item"
            :class="{ active: pickActive === i }"
            @click="pickActive = i"
          >
            <text class="pick-title">{{ t.title || '未命名' }}</text>
            <text class="pick-id">{{ t.template_id }}</text>
            <text class="pick-content">{{ (t.content || '').slice(0, 40) }}</text>
          </view>
        </view>
        <view class="send-footer">
          <view class="btn-add" @click="pickVisible = false">取消</view>
          <button class="btn-save small" :disabled="pickList.length === 0" @click="pickOne">选中并填充</button>
        </view>
      </view>
    </view>
```

- [ ] **Step 4: script 引入 useRef 无新增，补充 ref 导入**

`ref` 已 import（文件首部 `import { ref, computed } from 'vue'`），无需改。检查 `ssoMsgTemplateApi` 已在 `import { ... ssoMsgTemplateApi ... } from '../../../api/sso.js'`（已存在，edit.vue 第 209 行）。

- [ ] **Step 5: 增补 style（复用现有 class 基础上加 pick-list 样式）**

在 `</style>` 前追加：

```css
.pick-ops { display: flex; gap: 16rpx; }
.btn-add { display: inline-block; padding: 12rpx 28rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 26rpx; margin-top: 12rpx; }
.pick-list { max-height: 50vh; overflow-y: auto; margin-top: 12rpx; }
.pick-item { padding: 16rpx; border: 1rpx solid #e5e5e5; border-radius: 8rpx; margin-bottom: 12rpx; display: flex; flex-direction: column; gap: 4rpx; }
.pick-item.active { border-color: #1677ff; background: #e6f4ff; }
.pick-title { font-size: 28rpx; font-weight: bold; color: #333; }
.pick-id { font-size: 22rpx; color: #1677ff; word-break: break-all; }
.pick-content { font-size: 22rpx; color: #999; }
```

> 注意：`.btn-add`、`.send-mask`、`.send-modal`、`.send-modal-header`、`.send-modal-title`、`.ab-modal-close`、`.send-footer`、`.btn-save.small`、`.form-item`、`.form-input`、`.form-label`、`.required`、`.version-empty` 均为该文件已有 class，复用即可。

---

### Task 6: 前端构建发布 + 线上验证

**Files:**
- Modify: 无源码（H5 构建产物）

- [ ] **Step 1: 本地 H5 构建**

Run:
```powershell
powershell -NoProfile -File e:\code\web\build\build-h5.ps1  # 若存在；否则按项目现有 vite 构建命令
```
Expected: 构建成功输出 `dist/build/h5`。

- [ ] **Step 2: 发布到 h.joho.cn**

Run:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File e:\code\deploy-h5.ps1
```
Expected: 上传完成，硬刷新验证「消息模板」编辑页出现两个新按钮。

- [ ] **Step 3: 线上验证**

在发信公众号（wx17d58d73062d1899）下，对某消息模板用「从模板库添加」填编号 3493「活动报名通知」→ 得到该公众号名下新的 template_id 并自动回填字段 → 保存后「发送测试」验证走通（成功即可，目标用户需已关注）。若返回 40246 则补填关键词名后重试。

---

## Self-Review 记录

- **Spec coverage**：需求 A（从模板库添加）→ Task1-3 + 7；需求 B（选用已有模板）→ Task4 `wxPrivateTemplates` + Task5 `openPickExisting`；回填/字段解析 → Task5 `applyFromLibrary`/`parseFieldsFromContent`；验证 → Task3/6。覆盖完整。
- **Placeholder scan**：无 TBD/TODO；所有改动步骤均给出完整代码与命令及预期输出。
- **Type consistency**：方法名统一 `addFromLibrary`、返回字段 `templateId/title/content/fields` 在 Task2 与 Task5 一致；`ssoMsgTemplateApi.wxPrivateTemplates` 与 Task5 调用一致。