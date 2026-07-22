"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const reactRouterDom = require("react-router-dom");
const antd = require("antd");
const icons = require("@ant-design/icons");
const react = require("react");
const API_BASE = "/api/zhao-auth/v1/admin";
async function fetchMyInfo() {
  const res = await fetch(`${API_BASE}/me`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error(`Failed to fetch me: ${res.status}`);
  return res.json();
}
async function fetchUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`${API_BASE}/users?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json();
}
async function fetchUserDetail(documentId) {
  const res = await fetch(`${API_BASE}/users/${documentId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  return res.json();
}
async function assignRole(userId, role) {
  const res = await fetch(`${API_BASE}/users/${userId}/roles`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  if (!res.ok) throw new Error(`Failed to assign role: ${res.status}`);
  return res.json();
}
async function revokeRole(userId, role) {
  const res = await fetch(`${API_BASE}/users/${userId}/roles/${role}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Failed to revoke role: ${res.status}`);
  return res.json();
}
async function updateChannelScope(userId, scope) {
  const res = await fetch(`${API_BASE}/users/${userId}/channel-scope`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scope)
  });
  if (!res.ok) throw new Error(`Failed to update channel scope: ${res.status}`);
  return res.json();
}
async function fetchPermissionMatrix() {
  const res = await fetch(`${API_BASE}/permissions/matrix`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch matrix: ${res.status}`);
  return res.json();
}
async function updateRolePermissions(role, permissions) {
  const res = await fetch(`${API_BASE}/permissions/roles/${role}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions })
  });
  if (!res.ok) throw new Error(`Failed to update role permissions: ${res.status}`);
  return res.json();
}
async function resetRolePermissions(role) {
  const res = await fetch(`${API_BASE}/permissions/roles/${role}/reset`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Failed to reset role permissions: ${res.status}`);
  return res.json();
}
async function fetchAllActions() {
  const res = await fetch(`${API_BASE}/permissions/actions`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch actions: ${res.status}`);
  return res.json();
}
async function fetchLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.action) qs.set("action", params.action);
  const res = await fetch(`${API_BASE}/logs?${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json();
}
async function checkPermission(userId, action) {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action })
  });
  if (!res.ok) throw new Error(`Failed to check permission: ${res.status}`);
  return res.json();
}
async function fetchAssignableRoles() {
  const res = await fetch(`${API_BASE}/roles`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);
  return res.json();
}
const defaultContext = {
  permissions: [],
  channelScope: { all: false, channelIds: [] },
  tenant: null,
  user: null,
  loading: true,
  error: null,
  refresh: () => {
  },
  hasPermission: () => false
};
const PermissionsContext = react.createContext(defaultContext);
const PermissionsProvider = ({ children }) => {
  const [state, setState] = react.useState({
    permissions: [],
    channelScope: { all: false, channelIds: [] },
    tenant: null,
    user: null,
    loading: true,
    error: null
  });
  const load = react.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchMyInfo();
      setState({
        permissions: data.permissions || [],
        channelScope: data.channelScope || { all: false, channelIds: [] },
        tenant: data.tenant || null,
        user: data.user || null,
        loading: false,
        error: null
      });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err }));
    }
  }, []);
  react.useEffect(() => {
    load();
  }, [load]);
  const hasPermission = react.useCallback(
    (action) => state.permissions.includes(action),
    [state.permissions]
  );
  return /* @__PURE__ */ jsxRuntime.jsx(PermissionsContext.Provider, { value: { ...state, refresh: load, hasPermission }, children });
};
const useMyPermissions = () => react.useContext(PermissionsContext);
const ROLE_COLORS = {
  ADMIN: "red",
  CHANNEL_ADMIN: "orange",
  PLUGIN_MANAGER: "blue",
  INSTRUCTOR: "green",
  USER: "default"
};
const ROLE_LABELS = {
  ADMIN: "管理员",
  CHANNEL_ADMIN: "渠道管理员",
  PLUGIN_MANAGER: "插件管理员",
  INSTRUCTOR: "讲师",
  USER: "用户"
};
const RoleBadge = ({ role }) => {
  const color = ROLE_COLORS[role] || "default";
  const label = ROLE_LABELS[role] || role;
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color, children: label });
};
const ChannelScopePicker = ({
  value = { all: false, channelIds: [] },
  onChange,
  channels = [],
  loading = false
}) => {
  const [scope, setScope] = react.useState(value);
  react.useEffect(() => setScope(value), [value]);
  const handleChange = (newScope) => {
    setScope(newScope);
    onChange?.(newScope);
  };
  if (loading) return /* @__PURE__ */ jsxRuntime.jsx(antd.Spin, { size: "small" });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      antd.Radio.Group,
      {
        value: scope.all ? "all" : "specific",
        onChange: (e) => {
          if (e.target.value === "all") {
            handleChange({ all: true, channelIds: [] });
          } else {
            handleChange({ all: false, channelIds: scope.channelIds });
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "all", children: "全部渠道" }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "specific", children: "指定渠道" })
        ]
      }
    ),
    !scope.all && /* @__PURE__ */ jsxRuntime.jsx(
      antd.TreeSelect,
      {
        style: { width: "100%", marginTop: 8 },
        value: scope.channelIds,
        onChange: (ids) => handleChange({ all: false, channelIds: ids }),
        treeData: channels.map((c) => ({ title: c.name, value: c.id, key: c.id })),
        treeCheckable: true,
        placeholder: "选择渠道"
      }
    )
  ] });
};
const PermissionButton = ({
  action,
  hideIfNoPermission = false,
  disabled,
  ...rest
}) => {
  const { hasPermission } = useMyPermissions();
  const actions = Array.isArray(action) ? action : [action];
  const allowed = actions.some((a) => hasPermission(a));
  if (!allowed && hideIfNoPermission) return null;
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { ...rest, disabled: disabled || !allowed });
};
const { Column } = antd.Table;
const UserManagementPage = () => {
  const [users, setUsers] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [page, setPage] = react.useState(1);
  const [pageSize, setPageSize] = react.useState(20);
  const [total, setTotal] = react.useState(0);
  const [search, setSearch] = react.useState("");
  const [detail, setDetail] = react.useState(null);
  const [detailVisible, setDetailVisible] = react.useState(false);
  const [roles, setRoles] = react.useState([]);
  const loadUsers = react.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsers({ page, pageSize, search });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      antd.message.error(`加载用户失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);
  const loadRoles = react.useCallback(async () => {
    try {
      const res = await fetchAssignableRoles();
      setRoles(res.data || []);
    } catch {
    }
  }, []);
  react.useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  react.useEffect(() => {
    loadRoles();
  }, [loadRoles]);
  const showDetail = async (record) => {
    try {
      const res = await fetchUserDetail(record.documentId);
      setDetail(res.data);
      setDetailVisible(true);
    } catch (err) {
      antd.message.error(`加载详情失败: ${err.message}`);
    }
  };
  const handleAssignRole = async (userId, role) => {
    try {
      await assignRole(userId, role);
      antd.message.success("角色已分配");
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err) {
      antd.message.error(`分配失败: ${err.message}`);
    }
  };
  const handleRevokeRole = async (userId, role) => {
    try {
      await revokeRole(userId, role);
      antd.message.success("角色已撤销");
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err) {
      antd.message.error(`撤销失败: ${err.message}`);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { title: "用户管理", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input,
        {
          placeholder: "搜索用户名/邮箱",
          prefix: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}),
          value: search,
          onChange: (e) => setSearch(e.target.value),
          onPressEnter: loadUsers,
          style: { width: 300 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: loadUsers, children: "搜索" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      antd.Table,
      {
        dataSource: users,
        rowKey: "documentId",
        loading,
        pagination: {
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(Column, { title: "用户名", dataIndex: "username" }, "username"),
          /* @__PURE__ */ jsxRuntime.jsx(Column, { title: "邮箱", dataIndex: "email" }, "email"),
          /* @__PURE__ */ jsxRuntime.jsx(
            Column,
            {
              title: "角色",
              dataIndex: "zhaoRoles",
              render: (roles2) => /* @__PURE__ */ jsxRuntime.jsx("span", { children: roles2?.map((r) => /* @__PURE__ */ jsxRuntime.jsx(RoleBadge, { role: r }, r)) })
            },
            "zhaoRoles"
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            Column,
            {
              title: "操作",
              render: (_, record) => /* @__PURE__ */ jsxRuntime.jsx(PermissionButton, { action: "zhao-auth.user.manage", type: "link", onClick: () => showDetail(record), children: "详情" })
            },
            "action"
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "用户详情",
        open: detailVisible,
        onCancel: () => setDetailVisible(false),
        footer: null,
        width: 600,
        children: detail && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "用户名:" }),
            " ",
            detail.username
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "邮箱:" }),
            " ",
            detail.email
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("p", { children: /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "当前角色:" }) }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8 }, children: detail.zhaoRoles?.map((r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { closable: true, onClose: () => handleRevokeRole(detail.id, r), children: r }, r)) }),
          /* @__PURE__ */ jsxRuntime.jsx("p", { children: /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "分配新角色:" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Select,
            {
              style: { width: "100%", marginBottom: 16 },
              placeholder: "选择角色",
              onSelect: (role) => handleAssignRole(detail.id, role),
              children: roles.filter((r) => !detail.zhaoRoles?.includes(r.role)).map((r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Select.Option, { value: r.role, children: r.displayName }, r.role))
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("p", { children: /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "渠道范围:" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(
            ChannelScopePicker,
            {
              value: detail.channelScope,
              onChange: async (scope) => {
                try {
                  await updateChannelScope(detail.id, scope);
                  antd.message.success("渠道范围已更新");
                } catch (err) {
                  antd.message.error(`更新失败: ${err.message}`);
                }
              }
            }
          )
        ] })
      }
    )
  ] });
};
const PermissionMatrix = () => {
  const [roles, setRoles] = react.useState([]);
  const [actions, setActions] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [filter, setFilter] = react.useState("");
  const [saving, setSaving] = react.useState(null);
  const load = react.useCallback(async () => {
    setLoading(true);
    try {
      const [matrixRes, actionsRes] = await Promise.all([fetchPermissionMatrix(), fetchAllActions()]);
      setRoles(matrixRes.data || []);
      setActions(actionsRes.data || []);
    } catch (err) {
      antd.message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);
  react.useEffect(() => {
    load();
  }, [load]);
  const filteredActions = actions.filter((a) => !filter || a.includes(filter));
  const handleToggle = async (role, action, checked) => {
    const roleData = roles.find((r) => r.role === role);
    if (!roleData) return;
    const newPerms = checked ? [.../* @__PURE__ */ new Set([...roleData.permissions || [], action])] : (roleData.permissions || []).filter((p) => p !== action);
    setSaving(role);
    try {
      await updateRolePermissions(role, newPerms);
      setRoles((prev) => prev.map((r) => r.role === role ? { ...r, permissions: newPerms } : r));
    } catch (err) {
      antd.message.error(`更新失败: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };
  const handleReset = async (role) => {
    setSaving(role);
    try {
      const res = await resetRolePermissions(role);
      setRoles((prev) => prev.map((r) => r.role === role ? { ...r, permissions: res.permissions } : r));
      antd.message.success("已恢复默认");
    } catch (err) {
      antd.message.error(`恢复失败: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };
  const columns = [
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      fixed: "left",
      width: 180,
      render: (role, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { children: record.displayName || role }),
        role === "ADMIN" && /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: "red", children: "不可改" }),
        record.isSystem && role !== "ADMIN" && /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: () => handleReset(role), loading: saving === role, children: "恢复默认" })
      ] })
    },
    ...filteredActions.map((action) => ({
      title: action,
      key: action,
      width: 120,
      render: (_, record) => {
        if (record.role === "ADMIN") {
          return /* @__PURE__ */ jsxRuntime.jsx(antd.Checkbox, { checked: true, disabled: true });
        }
        const has = (record.permissions || []).includes(action);
        return /* @__PURE__ */ jsxRuntime.jsx(
          antd.Checkbox,
          {
            checked: has,
            onChange: (e) => handleToggle(record.role, action, e.target.checked),
            disabled: saving === record.role
          }
        );
      }
    }))
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { title: "权限矩阵", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input,
        {
          placeholder: "筛选 action（如 zhao-deal）",
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          style: { width: 300 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: load, loading, children: "刷新" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Table,
      {
        dataSource: roles,
        columns,
        rowKey: "role",
        loading,
        scroll: { x: "max-content" },
        pagination: false
      }
    )
  ] });
};
const PermissionMatrixPage = () => {
  return /* @__PURE__ */ jsxRuntime.jsx(PermissionMatrix, {});
};
const AuditLogPage = () => {
  const [logs, setLogs] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [page, setPage] = react.useState(1);
  const [total, setTotal] = react.useState(0);
  const [action, setAction] = react.useState("");
  const [checkResult, setCheckResult] = react.useState(null);
  const load = react.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLogs({ page, pageSize: 20, action });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      antd.message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, action]);
  react.useEffect(() => {
    load();
  }, [load]);
  const handleCheck = async (values) => {
    try {
      const res = await checkPermission(Number(values.userId), values.action);
      setCheckResult(res.data);
    } catch (err) {
      antd.message.error(`检查失败: ${err.message}`);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { title: "权限检查工具", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { layout: "inline", onFinish: handleCheck, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "userId", label: "用户ID", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { type: "number", placeholder: "1" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "action", label: "Action", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "zhao-deal.coupon.manage", style: { width: 300 } }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", htmlType: "submit", children: "检查" }) })
      ] }),
      checkResult && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: checkResult.allowed ? "green" : "red", children: checkResult.allowed ? "允许" : "拒绝" }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { marginLeft: 8 }, children: checkResult.reasons.join("; ") })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { title: "操作日志", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Input,
          {
            placeholder: "按 action 筛选",
            value: action,
            onChange: (e) => setAction(e.target.value),
            style: { width: 300 }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: load, loading, children: "搜索" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(
        antd.Table,
        {
          dataSource: logs,
          rowKey: "id",
          loading,
          pagination: {
            current: page,
            total,
            onChange: (p) => setPage(p)
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Table.Column, { title: "时间", dataIndex: "createdAt" }, "createdAt"),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Table.Column, { title: "操作人", dataIndex: "operatorName" }, "operatorName"),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Table.Column, { title: "动作", dataIndex: "action" }, "action"),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Table.Column, { title: "目标", dataIndex: "targetType" }, "targetType"),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Table.Column, { title: "详情", dataIndex: "detail", ellipsis: true }, "detail")
          ]
        }
      )
    ] })
  ] });
};
const { Sider, Content } = antd.Layout;
const menuItems = [
  { key: "users", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.UserOutlined, {}), label: "用户管理", permission: "zhao-auth.user.manage" },
  { key: "matrix", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SafetyOutlined, {}), label: "权限矩阵", permission: "zhao-auth.permission.matrix.edit" },
  { key: "logs", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.AuditOutlined, {}), label: "操作日志", permission: "zhao-auth.audit-log.view" }
];
const PluginLayout = ({ children }) => {
  const navigate = reactRouterDom.useNavigate();
  const location = reactRouterDom.useLocation();
  const { hasPermission } = useMyPermissions();
  const currentPath = location.pathname.split("/plugins/zhao-auth/")[1] || "users";
  const visibleItems = menuItems.filter((item) => !item.permission || hasPermission(item.permission));
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Layout, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(Sider, { width: 200, style: { background: "#fff" }, children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Menu,
      {
        mode: "inline",
        selectedKeys: [currentPath],
        items: visibleItems.map((item) => ({ key: item.key, icon: item.icon, label: item.label })),
        onClick: ({ key }) => navigate(`/plugins/zhao-auth/${key}`)
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(Content, { style: { padding: 24, background: "#f0f2f5" }, children })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsx(PermissionsProvider, { children: /* @__PURE__ */ jsxRuntime.jsx(PluginLayout, { children: /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/users", element: /* @__PURE__ */ jsxRuntime.jsx(UserManagementPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/matrix", element: /* @__PURE__ */ jsxRuntime.jsx(PermissionMatrixPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/logs", element: /* @__PURE__ */ jsxRuntime.jsx(AuditLogPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(UserManagementPage, {}) })
  ] }) }) });
};
exports.default = App;
