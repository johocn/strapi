# 青岛银行产品净值来源路由 + 采集网址公示 设计

日期：2026-09-14
状态：待评审
关联方案：方案 A（按产品显式配置净值源）

## 1. 背景

zhao-wealth 理财产品净值采集现有双源：渤银理财（cbhb）、杭银理财（hzbank）。现接入青岛银行（青银理财）产品线，出现两类采集场景：

1. 多数青岛银行产品：官网可查，走青岛银行官网接口采集
2. 特例 CCRSFDKFJZ09A：官网查询不到净值，需改走**中国理财网**采集（以登记编码为入口）

同时新增透明度需求：产品需记录**采集网址（净值来源）**，C 端展示时输出，告知客户净值来源，客户可自行查阅校验。

## 2. 目标

1. 新增青岛银行官网采集器（qdccb），官网可查产品走官网
2. 中国理财网（chinawealth）作为可选净值源，供官网查不到的产品使用
3. 产品新增"采集网址"字段，入库记录，C 端展示净值来源链接

## 3. 方案细化（方案 A）

### 3.1 数据模型

`wealth-product` 新增字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `navSourceUrl` | string | 采集网址（净值来源）。qdccb 源=青岛银行官网净值查询页；chinawealth 源=理财网产品详情页（`...?prodRegCode={registerCode}`，可直达） |

不新增表。采集网址属于产品属性，随产品入库；已入库产品可后台编辑补充。

### 3.2 采集器

#### (1) 新建 qingdao-collector.ts（QingdaoCollector extends BaseCollector）

**实现方式：Playwright 页面内 fetch（已验证：纯 HTTP 直连返回 0 条，浏览器环境必需）**

- `collectProductInfo(productCode)`：
  - Playwright 打开官网净值查询页 → 页面内 `fetch('/eportal/ui?portal.url=/portlet/finance!queryData.portlet', { method: 'POST', body: params })`（相对路径自动带 cookie/Referer）
  - 表单参数：`moduleId`（3567249ec8ca464d8c77a548570c2928）、`pageSize`、`pageNo`、`prdCode`（**完整产品代码，含类型后缀**，如 `CCRSFDKFJZ03A9`；接口对代码有后缀截断处理，传不完整代码会查空）、`portal.url`、`start`、`end`
  - 返回产品字段（名称/代码/登记编码/风险等级等）+ `navSourceUrl`（官网净值查询页 URL：`https://www.qdccb.com/eportal/ui?pageId=cad5fba118244923ab077d6071fc4b4d&aisiteOutPageId=b9d7863b63f74689b5fe16de82f45bce`，客户可在此页搜索产品代码）
  - **字段映射需实测**：返回 result 数组元素字段名以本机验证脚本为准（候选键：productCode/prdCode/cpdm、productName/prdName/cpmc、registerCode/djbm/regCode、riskLevel/fxdj）
- `collectNavData(productCode, options)`：
  - 同上打开页面 → 页面内 `fetch('/eportal/ui?portal.url=/portlet/finance!queryNavData.portlet', ...)`
  - 返回净值数组 `[{ navDate, unitNav, accNav, ... }]`（候选键：navDate/gzrq、unitNav/dwjz、accNav/ljjz，以实测为准）+ 官网 URL

#### (2) ChinawealthCollector 注册进 factory

- factory 键：`'chinawealth'` / `'中国理财网'`
- **修复 `collectNavData` 参数约定**：现有调用方约定 `collectNavData(productCode, { registerCode })`（见 collect.ts collectNavSync），而理财网查询必须以登记编码为入口。改造：`registerCode` 优先取 `options.registerCode`，无则回退第一参数（兼容旧调用）
- `collectProductInfo` 保持按登记编码查询（`collectByRegisterCode`），故**中国理财网源的产品信息采集输入为登记编码**
- 返回 `navSourceUrl` = `https://xinxipilu.chinawealth.com.cn/queryMenu/prodType/prodTypeDetail?prodRegCode={registerCode}`

#### (3) collector-factory.ts 注册

```ts
'qdccb': QingdaoCollector,
'青岛银行': QingdaoCollector,
'chinawealth': ChinawealthCollector,
'中国理财网': ChinawealthCollector,
```

`getAvailableSources()` 增加 `{ value: 'qdccb', label: '青岛银行' }`、`{ value: 'chinawealth', label: '中国理财网' }`。

### 3.3 净值路由（按产品配置，复用现有机制）

- 净值采集器选择已由 `collectRules.source` 驱动（collect.ts / collect-job.ts），**逻辑无需改动**
- collect-config 创建时 source 值决定净值来源：
  - `'qdccb'` → 青岛银行官网净值
  - `'chinawealth'` → 中国理财网净值（**依赖产品 `registerCode` 已入库**）
- CCRSFDKFJZ09A 入库时 source=`'chinawealth'`；其余青岛银行产品 source=`'qdccb'`

### 3.4 采集网址入库

- `collectConfirm` 接收可选字段 `navSourceUrl`，随产品创建写入 `wealth-product`
- 采集流程中 `mergedData.navSourceUrl`（采集器返回）自动填充编辑表单，前端可改

### 3.5 前端改动

#### (1) 管理端（e:\code\web，TAdmin）

- `src/pages/wealth/collect/index.vue`：
  - `sourceOptions` / `sourceValues` 增加 `青岛银行(qdccb)`、`中国理财网(chinawealth)`
  - 选中中国理财网源时，输入框 placeholder 提示"登记编码"
  - 编辑表单（editForm）增加"采集网址"输入框，确认入库时提交 `navSourceUrl`

#### (2) C 端（e:\code\strapi-wealth，v.joho.cn/wealth）

- 产品详情页新增"净值来源"展示块：发行机构名 + 采集网址链接（点击跳转外部查阅）
- 产品无 `navSourceUrl` 时不渲染该块

### 3.6 API 约定

- `POST /api/zhao-wealth/admin/collect`：source 支持 `qdccb` / `chinawealth`；query 语义——qdccb=产品代码，chinawealth=登记编码
- `POST /api/zhao-wealth/admin/collect-confirm`：新增可选字段 `navSourceUrl`
- C 端产品详情接口返回 `navSourceUrl`

## 4. 数据流

```
[管理端采集中心] 选源+输码
  → collect(source, query)
  → 采集器 collectProductInfo（qdccb=产品代码 / chinawealth=登记编码）
  → 有 registerCode 则中国理财网校验（collectByRegisterCode）
  → mergedData（含 navSourceUrl）
  → 前端编辑（采集网址可改）
  → collectConfirm → product.navSourceUrl + collect-config.source
  → [净值采集] collectRules.source 路由：qdccb→官网 / chinawealth→理财网（用 registerCode）
  → 净值入库 wealth-nav
  → [C 端] 产品详情展示净值 + 净值来源链接（navSourceUrl）
```

## 5. 错误处理

| 场景 | 行为 |
|---|---|
| qdccb 官网查不到产品（空 result） | 返回 404"未找到匹配产品"，提示改用中国理财网源（需登记编码） |
| chinawealth 净值采集时产品无 registerCode | 报错"请先补充登记编码"，不静默失败 |
| navSourceUrl 缺失 | C 端隐藏来源块，不影响展示与其他数据 |
| qdccb 产品代码不完整（后缀截断） | 采集空结果；文档与前端 placeholder 均提示输入完整代码（含类型后缀） |

## 6. 验证计划

1. 本机 curl 验证 qdccb 信息/净值接口（`CCRSFDKFJZ03A9` 已有 103 条净值基线）
2. 验证 CCRSFDKFJZ09A 走 chinawealth 源：产品信息采集（登记编码入口）+ 净值采集
3. 管理端采集中心：qdccb 采集 → 编辑采集网址 → 入库 → 触发净值 → 入库成功
4. C 端产品详情：来源链接展示与跳转
5. 配置校验：CCRSFDKFJZ09A 的 collect-config.source=`chinawealth`，其余青岛银行产品=`qdccb`

## 7. 部署注意（铁律）

- **插件 dist 部署铁律**：zhao-wealth `server/src` 改动后必须 `npm run build` 重建 dist，连同 dist 一起 git commit + push，再走 deploy.sh；只提交源码不重建 dist 会静默失效
- 管理端 web：uni build 构建部署
- C 端 strapi-wealth：构建部署到 v.joho.cn/wealth（`base: '/wealth/'`）
