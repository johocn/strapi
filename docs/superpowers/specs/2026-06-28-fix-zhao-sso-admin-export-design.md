# 修复 zhao-sso 插件 admin 导出错误

## 问题

Strapi 后台 `/admin` 加载报错：
```
Uncaught SyntaxError: The requested module '/admin/plugins/zhao-sso/strapi-admin.js' does not provide an export named 'default' (at app.js:12:8)
```

## 根本原因

1. **package.json 缺 `./strapi-admin` exports 字段**：`e:\code\basic\plugins\zhao-sso\package.json` 只有 `./strapi-server` exports，没有 `./strapi-admin`。Strapi v5 vite 编译 admin 时通过 package.json exports 解析插件入口；缺字段时回退加载 `strapi-admin.js`（CJS：`module.exports = require(...)`），浏览器以 ESM 解析 CJS → "does not provide an export named 'default'"。
2. **server 是空壳**：`basic/plugins/zhao-sso/server/src/index.ts` 只有空的 `register/bootstrap/destroy`，SSO 业务逻辑全在 `e:\code\plugins\zhao-sso`（完整版）。

## 对比验证

| 目录 | package.json strapi-admin exports | server 源码 | admin 源码 |
|---|---|---|---|
| `basic/plugins/zhao-sso` | ❌ 缺失 | 空壳 | 完整 |
| `e:/code/plugins/zhao-sso` | ✅ 有 | 完整（510KB dist） | 完整 |
| `basic/plugins/zhao-oss` | ✅ 有 | 完整 | 完整 |

## 方案

将完整版 server 同步到 basic/plugins/zhao-sso，并补 package.json exports，保持 config/plugins.ts 相对路径一致性。

## 改动范围

目标目录：`e:\code\basic\plugins\zhao-sso`
参考目录：`e:\code\plugins\zhao-sso`（完整版）

### 步骤

1. **复制 server 源码**：删除 `basic/plugins/zhao-sso/server`，用完整版 `e:\code\plugins\zhao-sso\server` 替换（含 content-types、controllers、services、routes、bootstrap、register、config、types）。

2. **替换 tsconfig.json**：basic 版是自定义配置（手写 target/module），完整版继承 `@strapi/typescript-utils/tsconfigs/server`（Strapi 插件标准）。用完整版替换。

3. **修改 package.json**：
   - 补 `./strapi-admin` exports 字段：
     ```json
     "./strapi-admin": {
       "types": "./dist/admin/src/index.d.ts",
       "source": "./admin/src/index.ts",
       "import": "./dist/admin/index.mjs",
       "require": "./dist/admin/index.js",
       "default": "./dist/admin/index.js"
     }
     ```
   - 补 `dependencies`：`bcryptjs`, `uuid`
   - 补 `devDependencies`：`@types/bcryptjs`, `@types/uuid`, `jest`, `ts-jest`, `ts-node`
   - 补 `peerDependencies`：`@strapi/design-system`, `@strapi/icons`, `react`, `react-dom`, `react-intl`, `react-router-dom`, `styled-components`
   - 补 `scripts`：`watch:link`, `test`

4. **统一 strapi-server.js**：改为 `module.exports = require("./dist/server/index.js")`。

5. **安装依赖 + 构建**：
   - `cd e:\code\basic\plugins\zhao-sso && npm install`
   - `npm run build`

6. **验证**：重启 Strapi，访问 `/admin`，确认无报错且 SSO 菜单可见。

## 不改动的部分

- `config/plugins.ts`：保持 `./plugins/zhao-sso` 相对路径
- `admin/src`：basic 版已与完整版一致
- 其他插件：不受影响

## 风险点

- `@strapi/typescript-utils` 必须在 node_modules 可用（basic 项目根应有，构建时验证）
- server 源码若引用 basic 项目不存在的类型，`npm run build` 会报错，需据错修复
