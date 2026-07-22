"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const antd = require("antd");
const { Content } = antd.Layout;
const { Title } = antd.Typography;
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Layout, { children: /* @__PURE__ */ jsxRuntime.jsxs(Content, { style: { padding: "24px" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Title, { level: 2, children: "认证授权管理" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { children: "用户管理 / 角色权限 / 操作日志（建设中）" })
  ] }) });
};
exports.default = App;
