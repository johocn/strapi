# 消息模板「从模板库添加 / 选用公众号已有模板」设计

## 背景

向用户发送微信模板消息失败（errcode 40037 invalid template_id），根因是：填入消息模板的
`wxTemplateId` 不在**发信公众号**（`sso-oauth-config` 中唯一 wechat/official_account 配置，
当前为 `wx17d58d73062d1899`）名下。微信模板消息只能用「调用 access_token 的公众号自己从模板库
添加的模板」发送，因此需要先把**公共模板（模板库编号，如 3493「活动报名通知」）添加进发信公众号**，
再拿到该公众号名下的私人 template_id 填入消息模板。

现状：后台已有能力
- Strapi admin「模板消息配置」已能列出公众号**已添加**模板（`GET /v1/admin/wx/templates`，
  `wx-menu.listTemplates` → `get_all_private_template`）。
- web 运营端「消息模板」编辑页（`sso/msg-template/edit.vue`）能填 `wxTemplateId` 与
  字段映射 `wxTemplateFields`，并有「发送测试」。

**缺口**：系统内无法「把公共模板加进公众号并自动回填」，只能去公众号后台手动加，再手抄
template_id。本方案补上这个环节（方案 C = 从模板库添加 A + 选用已有模板 B）。

## 目标

在 web 运营端「消息模板」编辑页提供两个能力，目标用户为运营/管理员：
1. **从模板库添加**：输入公众号模板库编号（`template_id_short`），调用微信 `api_add_template`
   把公共模板添加进发信公众号，得到新私人 template_id，并自动回填 `wxTemplateId` 与
   解析 `wxTemplateFields`。
2. **选用公众号已有模板**：从发信公众号已添加模板列表中选择，一键回填 `wxTemplateId` 并解析字段。

## 微信接口（已核对官方文档）

- 从模板库选用：`POST /cgi-bin/template/api_add_template?access_token=ACCESS_TOKEN`
  - body：`{ "template_id_short": "3493", "keyword_name_list": ["时间","地点"] }`
  - `template_id_short`：模板库编号，纯数字（类目模板）或 `TM**`/`OPENTMTM**` 形式。
  - `keyword_name_list`：选用的关键词名，按顺序传；类目模板必填，缺失/不在库返回 40246。
  - 返回：`{ errcode, errmsg, template_id }`。
- 公众号已添加模板列表：`POST /cgi-bin/template/get_all_private_template?access_token=...`
  - 返回 `template_list[]`：`template_id / title / primary_industry / deputy_industry / content`，
    content 中字段形如 `{{thing1.DATA}}`。

## 架构 / 组件

### 后端（zhao-sso 插件）

**1. wechat-template 通道扩展**（`server/src/services/channel/wechat-template.ts`）
- 复用现有 `getAccessToken()`（读 `sso_oauth_configs` provider=wechat/app_type=official_account）。
- 新增 `addFromLibrary({ templateIdShort, keywordNameList? })`
  → `axios.post(/cgi-bin/template/api_add_template)`，`errcode` 非 0 抛错（透传微信 errmsg/errcode）。
  返回 `{ templateId }`。
- 新增 `listPrivateTemplates()` → `get_all_private_template`，返回标准化列表
  `[{ template_id, title, primary_industry, deputy_industry, content }]`，供「选用已有模板」使用。

**2. 消息控制器**（`server/src/controllers/message-controller.ts`）新增 `addFromLibrary(ctx)`
- body：`{ templateIdShort, keywordNameList? }`。
- 流程：调通道 `addFromLibrary` → 得到新 `templateId` → 再 `listPrivateTemplates()`
  中按 `template_id` 命中该模板 → 从 `content` 解析字段名 `/\{\{(\w+)\.DATA\}\}/g`。
- 返回：`{ templateId, title, content, fields: ["thing1","thing3","date5","time13","thing6"] }`。

**3. 路由**（`server/src/routes/admin.ts`，消息中心段，权限统一 `sso.msg.read/write`）
- `POST /v1/admin/msg-templates/from-library` → `message.addFromLibrary`，权限 `sso.msg.write`。
- 「选用已有模板」复用现有 `GET /v1/admin/wx/templates`（已注册，`wx-menu.listTemplates`）。

### 前端（web 运营端 `pages/sso/msg-template/edit.vue`）

在「公众号模板ID wxTemplateId」字段行下方增加两个操作：

1. **从模板库添加**（新增弹窗）
   - 输入：模板库编号（必填）、关键词名列表（可选，逗号分隔；类目模板建议填）。
   - 提交 `POST /msg-templates/from-library`。
   - 成功：自动回填 `form.wxTemplateId = templateId`、`form.content = content`，
     `form.wxTemplateFields = fields.map(name => ({ key:"", name }))`（key 留空待业务方填语义）。
   - 失败：按 errcode 提示，`40246` 提示补填关键词名。

2. **选用公众号已有模板**（新增弹窗）
   - `GET /wx/templates` 拉列表，下拉/列表选择。
   - 选中：回填 `form.wxTemplateId`，并从 `content` 解析字段预填 `wxTemplateFields`（同上规则）。

填充后沿用已有「发送测试」验证（错误码如 40037 会明确展示）。

前端 API 封装：在 `web/src/api/sso.js` 的 `ssoMsgTemplateApi` 增加 `addFromLibrary`。

## 数据流

```
编辑页「从模板库添加」────────────┐
   │  template_id_short[, keyword_name_list] │
   ▼                                        │  POST /v1/admin/msg-templates/from-library
[message.addFromLibrary]  ──────────────► [wechat-template.addFromLibrary] → api_add_template
   │                                         │          返回新 template_id
   │  listPrivateTemplates() 命中该模板        │
   │  content 解析字段名                      │
   ▼                                        ┘
返回 { templateId, title, content, fields[] }
编辑页回填 wxTemplateId + wxTemplateFields(content 解析) + content
   │「发送测试」验证
   ▼
[wechat-template.send] → 发送模板消息
```

## 错误处理

- 微信返回非 0 `errcode`：抛错并透传 `errmsg` 与 `errcode`（如 `40037 invalid template_id`、
  `40246 invalid keyword_name_list`、`200013 模板被封禁`、账号模板数满等）。
- 找不到发信公众号配置：沿用通道现有错误（`未找到公众号`）。
- 添加成功但 `listPrivateTemplates` 未命中新模板：仍返回 `{ templateId }`，字段解析降级为空数组，
  前端只回填 ID、不预填字段。

## 风险与取舍

- **字段 `key` 语义不可自动推导**：`thing1` 究竟对应「活动名称」还是其他，需业务方确认。
  故前端自动填 `name`（微信字段名）、`key` 留空，保存前由运营核对并填写业务含义。
  这与现有 `act_confirm` 的映射约定一致。
- **类目模板关键词**：`keyword_name_list` 为类目模板必填，界面做成可选输入；返回 40246 时提示补填。
- **范围收敛**：仅改 web 运营端编辑页与 zhao-sso 后端接口，不改 Strapi admin 的模板列表
  （避免双端重复开发）。`addFromLibrary` 后端能力后续如需也可被 admin 复用。
- **不新增前端/后端依赖**：走既有 axios/fetch；遵循【web/shao 铁律】不动 vue/deps。

## 测试

- 后端：`from-library` 接口用 curl 本机验证（发信公众号配置下，用错误编号应返回微信错误码并被透传）。
- 前端：H5 构建后用「发送测试」验证真实下发（需先给目标用户绑定 openid）。

## 交付物清单

后端（zhao-sso）：
- [ ] `channel/wechat-template.ts`：新增 `addFromLibrary`、`listPrivateTemplates`
- [ ] `controllers/message-controller.ts`：新增 `addFromLibrary`
- [ ] `routes/admin.ts`：新增 `POST /msg-templates/from-library`
- [ ] 重建 zhao-sso `dist` 并提交

前端（web）：
- [ ] `api/sso.js`：`ssoMsgTemplateApi.addFromLibrary`
- [ ] `pages/sso/msg-template/edit.vue`：「从模板库添加」「选用已有模板」两个入口与弹窗
- [ ] H5 构建并发布

## 部署

- 后端走 zhao-sso 无新增依赖部署：构建 dist → git push → 服务器 `deploy-zhao-sso.sh`。
- 前端走 `deploy-h5.ps1` 发布 h.joho.cn。