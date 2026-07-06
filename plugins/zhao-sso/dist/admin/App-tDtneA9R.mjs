import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import { Loader, Box, Flex, Typography, Button, Grid, Card, CardHeader, CardBody, Table, Thead, Tr, Th, Tbody, Td, TextInput, SingleSelect, SingleSelectOption, EmptyStateLayout, Status, Modal, Field, Main } from "@strapi/design-system";
import { useState, useEffect, useCallback } from "react";
import { ArrowClockwise, Pencil, Plus } from "@strapi/icons";
const DashboardTab = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [channelReport, setChannelReport] = useState([]);
  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, reportRes] = await Promise.all([
        get(`${API_PREFIX}/dashboard`),
        get(`${API_PREFIX}/channel-report`)
      ]);
      setStats(dashRes.data?.stats || null);
      setChannelReport(reportRes.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (loading) return /* @__PURE__ */ jsx(Loader, { children: "加载中..." });
  const cards = [
    { label: "总用户数", value: stats?.totalUsers || 0, color: void 0 },
    { label: "活跃用户", value: stats?.activeUsers || 0, color: "success600" },
    { label: "封禁用户", value: stats?.blockedUsers || 0, color: "danger600" },
    { label: "今日登录", value: stats?.todayLogins || 0, color: "primary600" },
    { label: "应用数", value: stats?.totalApps || 0, color: void 0 },
    { label: "渠道数", value: stats?.totalChannels || 0, color: void 0 }
  ];
  return /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
    /* @__PURE__ */ jsxs(Flex, { paddingBottom: 4, justifyContent: "space-between", children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", children: "数据概览" }),
      /* @__PURE__ */ jsx(Button, { variant: "secondary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: load, children: "刷新" })
    ] }),
    /* @__PURE__ */ jsx(Grid.Root, { gridCols: 3, gap: 4, children: cards.map((c) => /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: c.label }) }),
      /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(
        Typography,
        {
          variant: "alpha",
          fontWeight: "bold",
          textColor: c.color,
          children: c.value
        }
      ) })
    ] }) }, c.label)) }),
    channelReport.length > 0 && /* @__PURE__ */ jsxs(Box, { paddingTop: 6, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", children: "渠道报告" }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 3, background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 4, rowCount: channelReport.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道编码" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道名称" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "注册数" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "登录数" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: channelReport.map((ch) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.channel_code }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.channel_name }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.registrations }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.logins }) })
        ] }, ch.channel_code)) })
      ] }) })
    ] })
  ] });
};
const UsersTab = () => {
  const { get, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const pageSize = 25;
  const load = useCallback(
    async (p = page, s = search, st = statusFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize)
        });
        if (s) params.set("search", s);
        if (st) params.set("status", st);
        const { data } = await get(`${API_PREFIX}/users?${params}`);
        setUsers(data?.data || []);
        setTotal(data?.meta?.pagination?.total || 0);
        setPage(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );
  useEffect(() => {
    load(1);
  }, []);
  const handleSearch = () => load(1, search, statusFilter);
  const handleEdit = (user) => {
    setEditForm({
      id: user.id,
      nickname: user.nickname || "",
      username: user.username || "",
      status: user.status || "active"
    });
    setEditOpen(true);
  };
  const handleSave = async () => {
    try {
      await put(`${API_PREFIX}/users/${editForm.id}`, editForm);
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };
  const totalPages = Math.ceil(total / pageSize);
  return /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
    /* @__PURE__ */ jsxs(Flex, { gap: 2, paddingBottom: 4, wrap: "wrap", children: [
      /* @__PURE__ */ jsx(
        TextInput,
        {
          placeholder: "搜索邮箱/用户名/手机号",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleSearch()
        }
      ),
      /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          value: statusFilter,
          onValueChange: (v) => {
            setStatusFilter(v);
            load(1, search, v);
          },
          placeholder: "全部状态",
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "active", children: "活跃" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "blocked", children: "封禁" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "inactive", children: "未激活" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: handleSearch, children: "搜索" })
    ] }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : users.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无用户数据" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 10, rowCount: users.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "ID" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "UUID" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "用户名" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "昵称" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "邮箱" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "手机号" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "注册渠道" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "注册时间" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: users.map((u) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.id }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: u.uuid }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.username || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.nickname || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.email || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.mobile || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
            Status,
            {
              variant: u.status === "active" ? "success" : u.status === "blocked" ? "danger" : "neutral",
              children: /* @__PURE__ */ jsx(Typography, { children: u.status === "active" ? "活跃" : u.status === "blocked" ? "封禁" : u.status })
            }
          ) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: u.register_channel || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: u.created_at ? new Date(u.created_at).toLocaleString() : "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
            Button,
            {
              size: "S",
              variant: "tertiary",
              startIcon: /* @__PURE__ */ jsx(Pencil, {}),
              onClick: () => handleEdit(u),
              children: "编辑"
            }
          ) })
        ] }, u.id)) })
      ] }) }),
      /* @__PURE__ */ jsxs(
        Flex,
        {
          paddingTop: 4,
          justifyContent: "space-between",
          alignItems: "center",
          children: [
            /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
              "共 ",
              total,
              " 条，第 ",
              page,
              "/",
              totalPages,
              " 页"
            ] }),
            /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  disabled: page <= 1,
                  onClick: () => load(page - 1),
                  children: "上一页"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  disabled: page >= totalPages,
                  onClick: () => load(page + 1),
                  children: "下一页"
                }
              )
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: editOpen,
        onOpenChange: (open) => {
          if (!open) setEditOpen(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "编辑用户" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxs(Field.Root, { name: "username", required: true, children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "用户名" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: editForm.username,
                  onChange: (e) => setEditForm({ ...editForm, username: e.target.value })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "nickname", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "昵称" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: editForm.nickname,
                  onChange: (e) => setEditForm({ ...editForm, nickname: e.target.value })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "status", required: true, children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "状态" }),
              /* @__PURE__ */ jsxs(
                SingleSelect,
                {
                  value: editForm.status,
                  onValueChange: (v) => setEditForm({ ...editForm, status: v }),
                  children: [
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "active", children: "活跃" }),
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "blocked", children: "封禁" }),
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "inactive", children: "未激活" })
                  ]
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setEditOpen(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: handleSave, children: "保存" })
          ] }) })
        ] })
      }
    )
  ] });
};
const emptyForm$1 = {
  app_code: "",
  app_name: "",
  app_secret: "",
  redirect_uris: "",
  allowed_grant_types: "authorization_code,refresh_token",
  is_active: "true",
  description: ""
};
const AppsTab = () => {
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm$1 });
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/apps`);
      setApps(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const handleCreate = async () => {
    try {
      await post(`${API_PREFIX}/apps`, {
        app_code: form.app_code,
        app_name: form.app_name,
        app_secret: form.app_secret || void 0,
        redirect_uris: form.redirect_uris ? form.redirect_uris.split(",").map((s) => s.trim()) : [],
        allowed_grant_types: form.allowed_grant_types ? form.allowed_grant_types.split(",").map((s) => s.trim()) : ["authorization_code", "refresh_token"],
        is_active: form.is_active === "true",
        description: form.description || void 0
      });
      setCreateOpen(false);
      setForm({ ...emptyForm$1 });
      load();
    } catch (e) {
      console.error(e);
    }
  };
  const handleEditSave = async () => {
    if (!editId) return;
    try {
      const body = {
        app_name: form.app_name,
        redirect_uris: form.redirect_uris ? form.redirect_uris.split(",").map((s) => s.trim()) : [],
        allowed_grant_types: form.allowed_grant_types ? form.allowed_grant_types.split(",").map((s) => s.trim()) : ["authorization_code", "refresh_token"],
        is_active: form.is_active === "true",
        description: form.description || void 0
      };
      if (form.app_secret) body.app_secret = form.app_secret;
      await put(`${API_PREFIX}/apps/${editId}`, body);
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };
  const openEdit = (app) => {
    setEditId(app.id);
    setForm({
      app_code: app.app_code || "",
      app_name: app.app_name || "",
      app_secret: "",
      redirect_uris: Array.isArray(app.redirect_uris) ? app.redirect_uris.join(", ") : "",
      allowed_grant_types: Array.isArray(app.allowed_grant_types) ? app.allowed_grant_types.join(", ") : "authorization_code, refresh_token",
      is_active: String(app.is_active ?? true),
      description: app.description || ""
    });
    setEditOpen(true);
  };
  const formFields = () => /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
    /* @__PURE__ */ jsxs(Field.Root, { name: "app_code", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "应用编码" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.app_code,
          onChange: (e) => setForm({ ...form, app_code: e.target.value }),
          disabled: editOpen
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "app_name", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "应用名称" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.app_name,
          onChange: (e) => setForm({ ...form, app_name: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "app_secret", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "应用密钥" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          placeholder: editOpen ? "留空则不修改" : "留空使用默认值",
          value: form.app_secret,
          onChange: (e) => setForm({ ...form, app_secret: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "redirect_uris", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "回调地址 (逗号分隔)" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.redirect_uris,
          onChange: (e) => setForm({ ...form, redirect_uris: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "allowed_grant_types", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "授权类型 (逗号分隔)" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.allowed_grant_types,
          onChange: (e) => setForm({ ...form, allowed_grant_types: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "is_active", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "启用状态" }),
      /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          value: form.is_active,
          onValueChange: (v) => setForm({ ...form, is_active: v }),
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "true", children: "启用" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "false", children: "禁用" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "description", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "描述" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.description,
          onChange: (e) => setForm({ ...form, description: e.target.value })
        }
      )
    ] })
  ] });
  return /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
    /* @__PURE__ */ jsxs(Flex, { paddingBottom: 4, justifyContent: "space-between", children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", children: "应用列表" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          startIcon: /* @__PURE__ */ jsx(Plus, {}),
          onClick: () => {
            setForm({ ...emptyForm$1 });
            setCreateOpen(true);
          },
          children: "新建应用"
        }
      )
    ] }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : apps.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无应用" }) : /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 7, rowCount: apps.length, children: [
      /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "ID" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "应用编码" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "应用名称" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "回调地址" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "授权类型" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
      ] }) }),
      /* @__PURE__ */ jsx(Tbody, { children: apps.map((app) => /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: app.id }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: app.app_code }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: app.app_name }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: Array.isArray(app.redirect_uris) ? app.redirect_uris.join(", ") : "-" }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: Array.isArray(app.allowed_grant_types) ? app.allowed_grant_types.join(", ") : "-" }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Status, { variant: app.is_active ? "success" : "neutral", children: /* @__PURE__ */ jsx(Typography, { children: app.is_active ? "启用" : "禁用" }) }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "S",
            variant: "tertiary",
            startIcon: /* @__PURE__ */ jsx(Pencil, {}),
            onClick: () => openEdit(app),
            children: "编辑"
          }
        ) })
      ] }, app.id)) })
    ] }) }),
    /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: createOpen,
        onOpenChange: (open) => {
          if (!open) setCreateOpen(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "新建应用" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: formFields() }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setCreateOpen(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: handleCreate, children: "创建" })
          ] }) })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: editOpen,
        onOpenChange: (open) => {
          if (!open) setEditOpen(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "编辑应用" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: formFields() }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setEditOpen(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: handleEditSave, children: "保存" })
          ] }) })
        ] })
      }
    )
  ] });
};
const emptyForm = {
  channel_code: "",
  channel_name: "",
  channel_type: "organic",
  utm_template: "",
  is_active: "true",
  description: ""
};
const CHANNEL_TYPES = [
  { value: "organic", label: "自然流量" },
  { value: "paid", label: "付费推广" },
  { value: "social", label: "社交媒体" },
  { value: "referral", label: "推荐引流" },
  { value: "offline", label: "线下渠道" },
  { value: "other", label: "其他" }
];
const ChannelsTab = () => {
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/channels`);
      setChannels(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const handleCreate = async () => {
    try {
      await post(`${API_PREFIX}/channels`, {
        channel_code: form.channel_code,
        channel_name: form.channel_name,
        channel_type: form.channel_type,
        utm_template: form.utm_template || void 0,
        is_active: form.is_active === "true",
        description: form.description || void 0
      });
      setCreateOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch (e) {
      console.error(e);
    }
  };
  const handleEditSave = async () => {
    if (!editId) return;
    try {
      await put(`${API_PREFIX}/channels/${editId}`, {
        channel_name: form.channel_name,
        channel_type: form.channel_type,
        utm_template: form.utm_template || void 0,
        is_active: form.is_active === "true",
        description: form.description || void 0
      });
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };
  const openEdit = (ch) => {
    setEditId(ch.id);
    setForm({
      channel_code: ch.channel_code || "",
      channel_name: ch.channel_name || "",
      channel_type: ch.channel_type || "organic",
      utm_template: ch.utm_template || "",
      is_active: String(ch.is_active ?? true),
      description: ch.description || ""
    });
    setEditOpen(true);
  };
  const formFields = () => /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
    /* @__PURE__ */ jsxs(Field.Root, { name: "channel_code", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "渠道编码" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.channel_code,
          onChange: (e) => setForm({ ...form, channel_code: e.target.value }),
          disabled: editOpen
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "channel_name", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "渠道名称" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.channel_name,
          onChange: (e) => setForm({ ...form, channel_name: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "channel_type", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "渠道类型" }),
      /* @__PURE__ */ jsx(
        SingleSelect,
        {
          value: form.channel_type,
          onValueChange: (v) => setForm({ ...form, channel_type: v }),
          children: CHANNEL_TYPES.map((t) => /* @__PURE__ */ jsx(SingleSelectOption, { value: t.value, children: t.label }, t.value))
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "utm_template", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "UTM 模板" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.utm_template,
          onChange: (e) => setForm({ ...form, utm_template: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "is_active", required: true, children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "启用状态" }),
      /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          value: form.is_active,
          onValueChange: (v) => setForm({ ...form, is_active: v }),
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "true", children: "启用" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "false", children: "禁用" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { name: "description", children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "描述" }),
      /* @__PURE__ */ jsx(
        TextInput,
        {
          value: form.description,
          onChange: (e) => setForm({ ...form, description: e.target.value })
        }
      )
    ] })
  ] });
  const typeLabel = (v) => CHANNEL_TYPES.find((t) => t.value === v)?.label || v;
  return /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
    /* @__PURE__ */ jsxs(Flex, { paddingBottom: 4, justifyContent: "space-between", children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", children: "渠道列表" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          startIcon: /* @__PURE__ */ jsx(Plus, {}),
          onClick: () => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
          },
          children: "新建渠道"
        }
      )
    ] }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : channels.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无渠道" }) : /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 7, rowCount: channels.length, children: [
      /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "ID" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道编码" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道名称" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "类型" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "UTM 模板" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
      ] }) }),
      /* @__PURE__ */ jsx(Tbody, { children: channels.map((ch) => /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.id }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.channel_code }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: ch.channel_name }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: typeLabel(ch.channel_type) }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: ch.utm_template || "-" }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Status, { variant: ch.is_active ? "success" : "neutral", children: /* @__PURE__ */ jsx(Typography, { children: ch.is_active ? "启用" : "禁用" }) }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "S",
            variant: "tertiary",
            startIcon: /* @__PURE__ */ jsx(Pencil, {}),
            onClick: () => openEdit(ch),
            children: "编辑"
          }
        ) })
      ] }, ch.id)) })
    ] }) }),
    /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: createOpen,
        onOpenChange: (open) => {
          if (!open) setCreateOpen(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "新建渠道" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: formFields() }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setCreateOpen(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: handleCreate, children: "创建" })
          ] }) })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: editOpen,
        onOpenChange: (open) => {
          if (!open) setEditOpen(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "编辑渠道" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: formFields() }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setEditOpen(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: handleEditSave, children: "保存" })
          ] }) })
        ] })
      }
    )
  ] });
};
const LoginLogsTab = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loginType, setLoginType] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const pageSize = 25;
  const load = useCallback(
    async (p = page, lt = loginType, sf = successFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize)
        });
        if (lt) params.set("login_type", lt);
        if (sf) params.set("success", sf);
        const { data } = await get(`${API_PREFIX}/login-logs?${params}`);
        setLogs(data?.data || []);
        setTotal(data?.meta?.pagination?.total || 0);
        setPage(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [page, loginType, successFilter]
  );
  useEffect(() => {
    load(1);
  }, []);
  const totalPages = Math.ceil(total / pageSize);
  return /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
    /* @__PURE__ */ jsxs(Flex, { gap: 2, paddingBottom: 4, wrap: "wrap", children: [
      /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          value: loginType,
          onValueChange: (v) => {
            setLoginType(v);
            load(1, v, successFilter);
          },
          placeholder: "全部类型",
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "password", children: "密码登录" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "wechat", children: "微信登录" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "alipay", children: "支付宝登录" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "token", children: "Token 刷新" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          value: successFilter,
          onValueChange: (v) => {
            setSuccessFilter(v);
            load(1, loginType, v);
          },
          placeholder: "全部结果",
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "true", children: "成功" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "false", children: "失败" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Button, { variant: "secondary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: () => load(), children: "刷新" })
    ] }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : logs.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无登录日志" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 8, rowCount: logs.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "ID" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "用户" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "登录类型" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "结果" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "IP" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "User-Agent" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "时间" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: logs.map((log) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: log.id }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: log.user?.nickname || log.user?.username || log.user?.email || log.user_id || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: log.login_type }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Status, { variant: log.success ? "success" : "danger", children: /* @__PURE__ */ jsx(Typography, { children: log.success ? "成功" : "失败" }) }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: log.ip || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: log.user_agent || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: log.channel_code || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: log.created_at ? new Date(log.created_at).toLocaleString() : "-" }) })
        ] }, log.id)) })
      ] }) }),
      /* @__PURE__ */ jsxs(
        Flex,
        {
          paddingTop: 4,
          justifyContent: "space-between",
          alignItems: "center",
          children: [
            /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
              "共 ",
              total,
              " 条，第 ",
              page,
              "/",
              totalPages,
              " 页"
            ] }),
            /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  disabled: page <= 1,
                  onClick: () => load(page - 1),
                  children: "上一页"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  disabled: page >= totalPages,
                  onClick: () => load(page + 1),
                  children: "下一页"
                }
              )
            ] })
          ]
        }
      )
    ] })
  ] });
};
const API_PREFIX = "/admin/plugins/zhao-sso";
const tabs = [
  { value: "dashboard", label: "仪表盘" },
  { value: "users", label: "用户管理" },
  { value: "apps", label: "应用管理" },
  { value: "channels", label: "渠道管理" },
  { value: "logs", label: "登录日志" }
];
const HomePage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(
      Box,
      {
        paddingTop: 6,
        paddingBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
        background: "neutral0",
        children: /* @__PURE__ */ jsx(Flex, { justifyContent: "space-between", alignItems: "center", children: /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", tag: "h1", children: "SSO 统一登录管理" }) }) })
      }
    ),
    /* @__PURE__ */ jsx(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, children: /* @__PURE__ */ jsx(Flex, { gap: 2, children: tabs.map((t) => /* @__PURE__ */ jsx(
      Button,
      {
        variant: activeTab === t.value ? "default" : "secondary",
        onClick: () => setActiveTab(t.value),
        children: t.label
      },
      t.value
    )) }) }),
    /* @__PURE__ */ jsxs(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
      activeTab === "dashboard" && /* @__PURE__ */ jsx(DashboardTab, {}),
      activeTab === "users" && /* @__PURE__ */ jsx(UsersTab, {}),
      activeTab === "apps" && /* @__PURE__ */ jsx(AppsTab, {}),
      activeTab === "channels" && /* @__PURE__ */ jsx(ChannelsTab, {}),
      activeTab === "logs" && /* @__PURE__ */ jsx(LoginLogsTab, {})
    ] })
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Page.Error, {}) })
  ] });
};
export {
  App
};
