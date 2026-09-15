# 南银理财采集源（Z70026 增瑞财富牛）实施计划

**日期**：2026-09-15
**状态**：已批准，进入实施

设计文档：`docs/superpowers/specs/2026-09-15-nanyin-collector-design.md`

---

## 1. 任务拆解与顺序

| # | 任务 | 产出 | 验证方式 |
|---|------|------|----------|
| 1 | 加密工具 `nanyin-utils.ts` | AES-128-ECB 加密/解密、RSA 公钥解析与加密（Node crypto 原生，零新依赖） | 单测：固定向量断言 + 解密还原 |
| 2 | 采集器 `nanyin-collector.ts` | 继承 BaseCollector；`collectProductInfo`（Playwright 净值页提取）+ `collectNavData`（加密接口 + 翻页 + 502 应急） | 单测：mock httpClient/Playwright |
| 3 | 注册配置 | `collector-factory.ts` 加 `nanyin/南银理财` | grep 断言 |
| 4 | 管理端选项（web 仓库） | `collect/index.vue` + 产品编辑页 sourceOptions 加 `南银理财` | 人工核对 |
| 5 | 测试（TDD） | 4 组用例（工具/公钥/净值映射/采集器） | `npm test` 通过 |
| 6 | 构建与提交 | `npm run build` 重建 dist + 自检 `grep nanyin dist` + git commit/push | grep 命中 |
| 7 | 部署与验证 | joho pull/restart + 录入 Z70026 + collect-single 触发采集 | curl 验证净值条数/最新日期/≈1.0167 |

## 2. 接口契约（已侦查确认）

- 公钥：`GET /eportal/ui?moduleId=5&portal.url=/portlet/login-handle!publicKey.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2`
- 净值：`POST /eportal/ui?moduleId=5&portal.url=/portlet/article-data!queryNetValueList.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2`
- 请求体：`{ data: AES(JSON), aesKey: RSA(aesKey), timeStamp: AES(时间戳) }`
- 响应：`data.data` AES 解密 → `{ aaData: [{date, netValue, cumulativeNetValue}], totalCount, currentPage }`
- 加密：AES-128-ECB-PKCS7（无 IV），RSA PKCS1 加密 16 字节随机 aesKey

## 3. 关键实现点

- 公钥解析兼容 PKCS1/SPKI、base64/含头尾；解析失败重试 raw base64
- 请求头带 `Referer`（净值页 URL）/`Origin`/浏览器 UA；失败切 Playwright `page.evaluate` fetch 会话内请求（502 应急预案）
- 净值映射：`date→navDate`（`YYYY-MM-DD`）、`netValue→unitNav`、`cumulativeNetValue→accNav`（缺省回退 unitNav）
- 翻页：按 totalCount/currentPage 循环拉全量，pageSize 取官网默认
- 采集失败统一抛错：「改用中国理财网源（登记编码 Z7003225000398）」

## 4. 部署数据（joho 生产库）

- 产品：`product_code=Z70026`、`register_code=Z7003225000398`、`source=南银理财`、`product_type=bank-wealth`、`company=南银理财`
- collectRules：`source=南银理财`
- 兜底：若官网接口持续不可用 → 改 `source=中国理财网` 走登记编码采集

## 5. 风险

- 加密接口未实测通 → 本地实现后第一步实测，带 Referer/Origin/UA，502 切 Playwright 会话，仍不通切兜底源
- 翻页/字段名与侦查不一致 → 实测修正
