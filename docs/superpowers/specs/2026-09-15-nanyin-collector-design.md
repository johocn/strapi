# 南银理财采集源（Z70026 增瑞财富牛）设计文档

**日期**：2026-09-15
**状态**：待用户审阅

---

## 1. 背景与目标

新增「南银理财」数据源采集器，采集产品 **Z70026（南银理财增瑞财富牛（最低持有28天）1号公募人民币理财产品）** 的历史净值。

- 内部销售代码：`Z70026`；登记编码：`Z7003225000398`（中国理财网可查）
- 产品类型：净值型公募理财（2026Q2 末净值 1.016713），归入 `bank-wealth`
- 官网净值页：`https://www.nanyinwealth.com/nanyinwealth/lccp/cpjz/index.html?id=Z70026`

## 2. 现状与约束

- 现有采集器：cbhb（渤银）、hzbank（杭银）、qdccb（青岛银行）、chinawealth（中国理财网），均继承 `BaseCollector`（collectProductInfo/collectNavData/saveToDatabase），在 `collector-factory.ts` 注册
- 南银官网净值接口为**加密接口**（已侦查定位）：
  - `POST https://www.nanyinwealth.com/eportal/ui?moduleId=5&portal.url=/portlet/article-data!queryNetValueList.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2`
  - 请求体 JSON：`{ data: AES加密(productCode/startDate/endDate/currentPage), aesKey: RSA加密(aesKey), timeStamp: AES加密(时间戳) }`
  - 响应 `data.data` 亦为 AES 加密，需用 aesKey 解密得到 `aaData`（字段 date/netValue/cumulativeNetValue）与 `totalCount`
  - RSA 公钥接口：`/eportal/ui?moduleId=5&portal.url=/portlet/login-handle!publicKey.portlet&TopModelId=...`
- **风险遗留**：
  1. 侦查时接口返回 502（未实测通），可能缺 Referer/Cookie 或瞬时反爬
  2. 产品详情结构化接口未确认，产品信息可能需从净值页 HTML 提取或走中国理财网补录
- 插件零新依赖原则（2G 服务器安装依赖易 OOM）：加密用 Node 内置 `crypto` 实现，不引入 jsencrypt/crypto-js

## 3. 方案

### 3.1 新增 `nanyin-collector.ts`（继承 BaseCollector）

**加密工具（模块内私有函数，Node crypto 原生）**：
- `getServerPublicKey()`：GET publicKey.portlet 接口，解析 RSA 公钥（支持 PKCS1/SPKI，公钥可能为 base64 或含头尾，需兼容解析）
- `encryptPayload(payload, aesKey)`：AES-128-ECB-PKCS7 加密 JSON（`crypto.createCipheriv('aes-128-ecb', key, null)`，ECB 无 IV）
- `rsaEncrypt(aesKey, publicKey)`：`crypto.publicEncrypt`（按公钥格式选 padding，默认 RSA_PKCS1_PADDING）
- `decryptData(cipherText, aesKey)`：AES-ECB-PKCS7 解密响应 `data.data`

**`collectProductInfo(productCode)`**：
- 打开净值页 `.../cpjz/index.html?id={productCode}`（Playwright），从页面提取产品名称/风险等级/成立日期等基础字段
- 若页面无结构化信息，抛错提示「产品信息请通过中国理财网补录（登记编码）」

**`collectNavData(productCode)`**：
1. `getServerPublicKey()` → 生成随机 16 字节 aesKey → 组加密请求体
2. POST queryNetValueList.portlet（Headers 带 `Referer: https://www.nanyinwealth.com/nanyinwealth/lccp/cpjz/index.html?id={code}`、浏览器 UA、`Origin: https://www.nanyinwealth.com`）
3. 解密响应 → aaData 净值记录（date/netValue/cumulativeNetValue）→ 映射为标准净值字段（`{ navDate, unitNav, accNav }`），`accNav` 缺省时等于 `unitNav`
4. 按 `totalCount`/currentPage 翻页拉全量（每页 pageSize 取官网默认）
5. 失败（HTTP 非 2xx/解析异常/查不到）→ 抛错提示「改用中国理财网源（登记编码）」，错误信息含登记编码
6. **502 应急预案**：若直连（httpClient/axios）持续 502，改用 Playwright 页面会话内 `page.evaluate` fetch 同源接口（自动携带 Cookie/会话），加密仍在 Node 端完成；若仍不可用，采集失败由用户切换中国理财网兜底源

**`saveToDatabase`**：沿用 BaseCollector 契约（由 collect-job 调用 processNavData 入库，双条件去重已覆盖）

### 3.2 collector-factory.ts 注册

- `COLLECTOR_MAP` 加 `'nanyin': NanyinCollector`、`'南银理财': NanyinCollector`
- `getAvailableSources()` 加 `{ value: 'nanyin', label: '南银理财' }`

### 3.3 管理端 sourceOptions（web 仓库）

- `src/pages/wealth/collect/index.vue` 与产品编辑页的 `sourceOptions`/`sourceValues` 加 `['南银理财', 'nanyin']`

### 3.4 产品数据（生产库，部署时执行）

- 产品：Z70026（南银理财增瑞财富牛（最低持有28天）1号）
  - `product_code=Z70026`、`register_code=Z7003225000398`、`source=南银理财`（或 nanyin，与管理端选项一致）、`product_type=bank-wealth`、`company=南银理财`
- collectRules：source=南银理财

### 3.5 测试（TDD）

1. 加密/解密工具用例：固定 aesKey 加密后解密还原；固定向量断言 AES-ECB 密文正确（用 Node crypto 预计算的已知向量）
2. RSA 公钥解析用例：PKCS1/SPKI 两种格式输入均可解析
3. 净值解析用例：解密后的 aaData JSON → 标准净值字段映射（含 accNav 缺省回退）
4. 采集器集成用例（mock httpClient/Playwright）：collectNavData 正常返回、翻页、失败抛「改用中国理财网」提示

### 3.6 部署与验证

- 重建 dist（自检 grep `nanyin`）→ push → joho pull/restart
- 录入产品 Z70026 → 触发 collect-single → 验证：净值条数 >0、最新日期为近 3 个交易日、单位净值 ≈ 1.0167
- 若官网接口持续 502/不可用：切换产品 source=中国理财网 走现有采集器（登记编码采集），并向用户说明

## 4. 不做（明确排除）

- 南银理财现金管理类产品（货币型）识别：Z70026 为净值型，不涉及 money-wealth 分支
- 中国理财网采集器改造（已有登记编码采集能力）
- 前端 C 端展示改动（净值采集后自动生效）

## 5. 风险与应对

| 风险 | 应对 |
|---|---|
| 加密接口 502 未实测通 | 实现后第一步本地实测；带 Referer/Origin/UA；失败切 Playwright 会话请求；仍不通切中国理财网兜底源 |
| RSA 公钥格式不确定 | 兼容 PKCS1/SPKI、base64/含头尾解析 |
| 产品详情无结构化接口 | 产品信息走中国理财网补录 |
| 翻页字段名不确定 | 按 aaData/totalCount/currentPage 惯例实现，实测修正 |
