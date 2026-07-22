import { jsx, jsxs } from "react/jsx-runtime";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Tag, Spin, Radio, TreeSelect, Button, message, Card, Space, Input, Table, Modal, Select, Checkbox, Form, Layout, Menu } from "antd";
import { SearchOutlined, ReloadOutlined, UserOutlined, SafetyOutlined, AuditOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, createContext, useContext } from "react";
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
const PermissionsContext = createContext(defaultContext);
const PermissionsProvider = ({ children }) => {
  const [state, setState] = useState({
    permissions: [],
    channelScope: { all: false, channelIds: [] },
    tenant: null,
    user: null,
    loading: true,
    error: null
  });
  const load = useCallback(async () => {
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
  useEffect(() => {
    load();
  }, [load]);
  const hasPermission = useCallback(
    (action) => state.permissions.includes(action),
    [state.permissions]
  );
  return /* @__PURE__ */ jsx(PermissionsContext.Provider, { value: { ...state, refresh: load, hasPermission }, children });
};
const useMyPermissions = () => useContext(PermissionsContext);
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
  return /* @__PURE__ */ jsx(Tag, { color, children: label });
};
const ChannelScopePicker = ({
  value = { all: false, channelIds: [] },
  onChange,
  channels = [],
  loading = false
}) => {
  const [scope, setScope] = useState(value);
  useEffect(() => setScope(value), [value]);
  const handleChange = (newScope) => {
    setScope(newScope);
    onChange?.(newScope);
  };
  if (loading) return /* @__PURE__ */ jsx(Spin, { size: "small" });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs(
      Radio.Group,
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
          /* @__PURE__ */ jsx(Radio, { value: "all", children: "全部渠道" }),
          /* @__PURE__ */ jsx(Radio, { value: "specific", children: "指定渠道" })
        ]
      }
    ),
    !scope.all && /* @__PURE__ */ jsx(
      TreeSelect,
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
  return /* @__PURE__ */ jsx(Button, { ...rest, disabled: disabled || !allowed });
};
const { Column } = Table;
const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [roles, setRoles] = useState([]);
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsers({ page, pageSize, search });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error(`加载用户失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);
  const loadRoles = useCallback(async () => {
    try {
      const res = await fetchAssignableRoles();
      setRoles(res.data || []);
    } catch {
    }
  }, []);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);
  const showDetail = async (record) => {
    try {
      const res = await fetchUserDetail(record.documentId);
      setDetail(res.data);
      setDetailVisible(true);
    } catch (err) {
      message.error(`加载详情失败: ${err.message}`);
    }
  };
  const handleAssignRole = async (userId, role) => {
    try {
      await assignRole(userId, role);
      message.success("角色已分配");
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err) {
      message.error(`分配失败: ${err.message}`);
    }
  };
  const handleRevokeRole = async (userId, role) => {
    try {
      await revokeRole(userId, role);
      message.success("角色已撤销");
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err) {
      message.error(`撤销失败: ${err.message}`);
    }
  };
  return /* @__PURE__ */ jsxs(Card, { title: "用户管理", children: [
    /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: "搜索用户名/邮箱",
          prefix: /* @__PURE__ */ jsx(SearchOutlined, {}),
          value: search,
          onChange: (e) => setSearch(e.target.value),
          onPressEnter: loadUsers,
          style: { width: 300 }
        }
      ),
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: loadUsers, children: "搜索" })
    ] }),
    /* @__PURE__ */ jsxs(
      Table,
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
          /* @__PURE__ */ jsx(Column, { title: "用户名", dataIndex: "username" }, "username"),
          /* @__PURE__ */ jsx(Column, { title: "邮箱", dataIndex: "email" }, "email"),
          /* @__PURE__ */ jsx(
            Column,
            {
              title: "角色",
              dataIndex: "zhaoRoles",
              render: (roles2) => /* @__PURE__ */ jsx("span", { children: roles2?.map((r) => /* @__PURE__ */ jsx(RoleBadge, { role: r }, r)) })
            },
            "zhaoRoles"
          ),
          /* @__PURE__ */ jsx(
            Column,
            {
              title: "操作",
              render: (_, record) => /* @__PURE__ */ jsx(PermissionButton, { action: "zhao-auth.user.manage", type: "link", onClick: () => showDetail(record), children: "详情" })
            },
            "action"
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        title: "用户详情",
        open: detailVisible,
        onCancel: () => setDetailVisible(false),
        footer: null,
        width: 600,
        children: detail && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "用户名:" }),
            " ",
            detail.username
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "邮箱:" }),
            " ",
            detail.email
          ] }),
          /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "当前角色:" }) }),
          /* @__PURE__ */ jsx("div", { style: { marginBottom: 8 }, children: detail.zhaoRoles?.map((r) => /* @__PURE__ */ jsx(Tag, { closable: true, onClose: () => handleRevokeRole(detail.id, r), children: r }, r)) }),
          /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "分配新角色:" }) }),
          /* @__PURE__ */ jsx(
            Select,
            {
              style: { width: "100%", marginBottom: 16 },
              placeholder: "选择角色",
              onSelect: (role) => handleAssignRole(detail.id, role),
              children: roles.filter((r) => !detail.zhaoRoles?.includes(r.role)).map((r) => /* @__PURE__ */ jsx(Select.Option, { value: r.role, children: r.displayName }, r.role))
            }
          ),
          /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "渠道范围:" }) }),
          /* @__PURE__ */ jsx(
            ChannelScopePicker,
            {
              value: detail.channelScope,
              onChange: async (scope) => {
                try {
                  await updateChannelScope(detail.id, scope);
                  message.success("渠道范围已更新");
                } catch (err) {
                  message.error(`更新失败: ${err.message}`);
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
  const [roles, setRoles] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matrixRes, actionsRes] = await Promise.all([fetchPermissionMatrix(), fetchAllActions()]);
      setRoles(matrixRes.data || []);
      setActions(actionsRes.data || []);
    } catch (err) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
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
      message.error(`更新失败: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };
  const handleReset = async (role) => {
    setSaving(role);
    try {
      const res = await resetRolePermissions(role);
      setRoles((prev) => prev.map((r) => r.role === role ? { ...r, permissions: res.permissions } : r));
      message.success("已恢复默认");
    } catch (err) {
      message.error(`恢复失败: ${err.message}`);
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
      render: (role, record) => /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx("span", { children: record.displayName || role }),
        role === "ADMIN" && /* @__PURE__ */ jsx(Tag, { color: "red", children: "不可改" }),
        record.isSystem && role !== "ADMIN" && /* @__PURE__ */ jsx(Button, { size: "small", icon: /* @__PURE__ */ jsx(ReloadOutlined, {}), onClick: () => handleReset(role), loading: saving === role, children: "恢复默认" })
      ] })
    },
    ...filteredActions.map((action) => ({
      title: action,
      key: action,
      width: 120,
      render: (_, record) => {
        if (record.role === "ADMIN") {
          return /* @__PURE__ */ jsx(Checkbox, { checked: true, disabled: true });
        }
        const has = (record.permissions || []).includes(action);
        return /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: has,
            onChange: (e) => handleToggle(record.role, action, e.target.checked),
            disabled: saving === record.role
          }
        );
      }
    }))
  ];
  return /* @__PURE__ */ jsxs(Card, { title: "权限矩阵", children: [
    /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: "筛选 action（如 zhao-deal）",
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          style: { width: 300 }
        }
      ),
      /* @__PURE__ */ jsx(Button, { onClick: load, loading, children: "刷新" })
    ] }),
    /* @__PURE__ */ jsx(
      Table,
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
  return /* @__PURE__ */ jsx(PermissionMatrix, {});
};
const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLogs({ page, pageSize: 20, action });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, action]);
  useEffect(() => {
    load();
  }, [load]);
  const handleCheck = async (values) => {
    try {
      const res = await checkPermission(Number(values.userId), values.action);
      setCheckResult(res.data);
    } catch (err) {
      message.error(`检查失败: ${err.message}`);
    }
  };
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs(Card, { title: "权限检查工具", children: [
      /* @__PURE__ */ jsxs(Form, { layout: "inline", onFinish: handleCheck, children: [
        /* @__PURE__ */ jsx(Form.Item, { name: "userId", label: "用户ID", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input, { type: "number", placeholder: "1" }) }),
        /* @__PURE__ */ jsx(Form.Item, { name: "action", label: "Action", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input, { placeholder: "zhao-deal.coupon.manage", style: { width: 300 } }) }),
        /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsx(Button, { type: "primary", htmlType: "submit", children: "检查" }) })
      ] }),
      checkResult && /* @__PURE__ */ jsxs("div", { style: { marginTop: 16 }, children: [
        /* @__PURE__ */ jsx(Tag, { color: checkResult.allowed ? "green" : "red", children: checkResult.allowed ? "允许" : "拒绝" }),
        /* @__PURE__ */ jsx("span", { style: { marginLeft: 8 }, children: checkResult.reasons.join("; ") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { title: "操作日志", children: [
      /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "按 action 筛选",
            value: action,
            onChange: (e) => setAction(e.target.value),
            style: { width: 300 }
          }
        ),
        /* @__PURE__ */ jsx(Button, { onClick: load, loading, children: "搜索" })
      ] }),
      /* @__PURE__ */ jsxs(
        Table,
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
            /* @__PURE__ */ jsx(Table.Column, { title: "时间", dataIndex: "createdAt" }, "createdAt"),
            /* @__PURE__ */ jsx(Table.Column, { title: "操作人", dataIndex: "operatorName" }, "operatorName"),
            /* @__PURE__ */ jsx(Table.Column, { title: "动作", dataIndex: "action" }, "action"),
            /* @__PURE__ */ jsx(Table.Column, { title: "目标", dataIndex: "targetType" }, "targetType"),
            /* @__PURE__ */ jsx(Table.Column, { title: "详情", dataIndex: "detail", ellipsis: true }, "detail")
          ]
        }
      )
    ] })
  ] });
};
const { Sider, Content } = Layout;
const menuItems = [
  { key: "users", icon: /* @__PURE__ */ jsx(UserOutlined, {}), label: "用户管理", permission: "zhao-auth.user.manage" },
  { key: "matrix", icon: /* @__PURE__ */ jsx(SafetyOutlined, {}), label: "权限矩阵", permission: "zhao-auth.permission.matrix.edit" },
  { key: "logs", icon: /* @__PURE__ */ jsx(AuditOutlined, {}), label: "操作日志", permission: "zhao-auth.audit-log.view" }
];
const PluginLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useMyPermissions();
  const currentPath = location.pathname.split("/plugins/zhao-auth/")[1] || "users";
  const visibleItems = menuItems.filter((item) => !item.permission || hasPermission(item.permission));
  return /* @__PURE__ */ jsxs(Layout, { children: [
    /* @__PURE__ */ jsx(Sider, { width: 200, style: { background: "#fff" }, children: /* @__PURE__ */ jsx(
      Menu,
      {
        mode: "inline",
        selectedKeys: [currentPath],
        items: visibleItems.map((item) => ({ key: item.key, icon: item.icon, label: item.label })),
        onClick: ({ key }) => navigate(`/plugins/zhao-auth/${key}`)
      }
    ) }),
    /* @__PURE__ */ jsx(Content, { style: { padding: 24, background: "#f0f2f5" }, children })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsx(PermissionsProvider, { children: /* @__PURE__ */ jsx(PluginLayout, { children: /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { path: "/users", element: /* @__PURE__ */ jsx(UserManagementPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "/matrix", element: /* @__PURE__ */ jsx(PermissionMatrixPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "/logs", element: /* @__PURE__ */ jsx(AuditLogPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(UserManagementPage, {}) })
  ] }) }) });
};
export {
  App as default
};
