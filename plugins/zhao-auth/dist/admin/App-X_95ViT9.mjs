import { jsx, jsxs } from "react/jsx-runtime";
import { Layout, Typography } from "antd";
const { Content } = Layout;
const { Title } = Typography;
const App = () => {
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs(Content, { style: { padding: "24px" }, children: [
    /* @__PURE__ */ jsx(Title, { level: 2, children: "认证授权管理" }),
    /* @__PURE__ */ jsx("p", { children: "用户管理 / 角色权限 / 操作日志（建设中）" })
  ] }) });
};
export {
  App as default
};
