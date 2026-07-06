import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { useNavigate, useParams, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader, EmptyStateLayout, Main, Box, Flex, Typography, Grid, Card, CardHeader, CardBody, Button, SearchForm, Searchbar, SingleSelect, SingleSelectOption, Table, Thead, Tr, Th, Tbody, Td, Modal, Field, TextInput, Switch, Badge } from "@strapi/design-system";
import { P as PLUGIN_ID } from "./index-C1vpOGHq.mjs";
const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { get } = useFetchClient();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await get(`/admin/plugins/${PLUGIN_ID}/dashboard`);
        setStats(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [get]);
  if (loading) return /* @__PURE__ */ jsx(Loader, { children: "加载中..." });
  if (error) return /* @__PURE__ */ jsx(EmptyStateLayout, { content: `加载失败: ${error}` });
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, alignItems: "stretch", children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "积分管理概览" }),
    /* @__PURE__ */ jsxs(Grid.Root, { gridCols: 4, gap: 4, children: [
      /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "今日活跃用户" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: stats?.activeUsersToday || 0 }) })
      ] }) }),
      /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "累计发放积分" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: stats?.totalPointsIssued?.toLocaleString() || 0 }) })
      ] }) }),
      /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "累计消耗积分" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: stats?.totalPointsSpent?.toLocaleString() || 0 }) })
      ] }) }),
      /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "待处理兑换" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", textColor: stats?.pendingRedemptions > 0 ? "danger600" : void 0, children: stats?.pendingRedemptions || 0 }) })
      ] }) })
    ] }),
    stats?.expiringSoonPoints > 0 && /* @__PURE__ */ jsx(Box, { padding: 4, background: "warning100", borderColor: "warning600", borderStyle: "solid", borderWidth: "1px", borderRadius: 4, children: /* @__PURE__ */ jsxs(Typography, { textColor: "warning600", fontWeight: "bold", children: [
      "即将过期积分: ",
      stats.expiringSoonPoints.toLocaleString(),
      " 分"
    ] }) }),
    /* @__PURE__ */ jsxs(Flex, { gap: 4, wrap: "wrap", children: [
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("records"), children: "积分记录" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("rules"), variant: "secondary", children: "积分规则" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("redemptions"), variant: "secondary", children: "兑换管理" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("products"), variant: "secondary", children: "积分商城" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("verifications"), variant: "secondary", children: "核销管理" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate("config"), variant: "tertiary", children: "系统配置" })
    ] }),
    stats?.topEarnActions?.length > 0 && /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", paddingBottom: 3, children: "今日热门操作" }),
      /* @__PURE__ */ jsx(Grid.Root, { gridCols: 2, gap: 3, children: stats.topEarnActions.map((item) => /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardBody, { children: [
        /* @__PURE__ */ jsx(Typography, { variant: "pi", children: item.action }),
        /* @__PURE__ */ jsxs(Typography, { variant: "epsilon", fontWeight: "bold", children: [
          item.totalPoints,
          " 积分 (",
          item.count,
          " 次)"
        ] })
      ] }) }) }, item.action)) })
    ] })
  ] }) }) });
};
const PointRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");
  const { get, post } = useFetchClient();
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (search) params.userId = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-records`, { params });
      setRecords(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRecords();
  }, [page, typeFilter]);
  const handleAdjust = async () => {
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/point-records/admin-adjust`, {
        userId: parseInt(adjustUserId),
        points: parseInt(adjustPoints),
        remark: adjustRemark
      });
      setAdjustModalOpen(false);
      setAdjustUserId("");
      setAdjustPoints("");
      setAdjustRemark("");
      fetchRecords();
    } catch (e) {
      alert(e.message);
    }
  };
  const totalPages = Math.ceil(total / pageSize);
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
      /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "积分记录" }),
        /* @__PURE__ */ jsx(Button, { onClick: () => setAdjustModalOpen(true), children: "手动调整" })
      ] }),
      /* @__PURE__ */ jsxs(Flex, { gap: 3, children: [
        /* @__PURE__ */ jsx(SearchForm, { children: /* @__PURE__ */ jsx(
          Searchbar,
          {
            placeholder: "搜索用户ID...",
            value: search,
            onClear: () => setSearch(""),
            onChange: (e) => setSearch(e.target.value),
            clearLabel: "清除",
            name: "search",
            children: "搜索用户"
          }
        ) }),
        /* @__PURE__ */ jsx(Box, { width: "200px", children: /* @__PURE__ */ jsxs(
          SingleSelect,
          {
            placeholder: "变动类型",
            value: typeFilter,
            onChange: (v) => setTypeFilter(String(v || "")),
            children: [
              /* @__PURE__ */ jsx(SingleSelectOption, { value: "", children: "全部" }),
              /* @__PURE__ */ jsx(SingleSelectOption, { value: "increase", children: "增加" }),
              /* @__PURE__ */ jsx(SingleSelectOption, { value: "decrease", children: "扣除" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsx(Button, { onClick: fetchRecords, children: "搜索" })
      ] }),
      loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : records.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无积分记录" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(Table, { colCount: 7, rowCount: records.length, children: [
          /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "时间" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "用户" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "变动" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "余额" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "来源" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "备注" }) })
          ] }) }),
          /* @__PURE__ */ jsx(Tbody, { children: records.map((r) => /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: new Date(r.createdAt).toLocaleString() }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.user?.id || r.user }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.action }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(
              Typography,
              {
                variant: "pi",
                textColor: r.type === "increase" ? "success600" : "danger600",
                fontWeight: "bold",
                children: [
                  r.type === "increase" ? "+" : "-",
                  Math.abs(r.points)
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.balance }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.method || "-" }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.remark || "-" }) })
          ] }, r.id)) })
        ] }),
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
            "共 ",
            total,
            " 条记录"
          ] }),
          /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "tertiary",
                disabled: page <= 1,
                onClick: () => setPage((p) => Math.max(1, p - 1)),
                children: "上一页"
              }
            ),
            /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
              page,
              " / ",
              totalPages
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "tertiary",
                disabled: page >= totalPages,
                onClick: () => setPage((p) => p + 1),
                children: "下一页"
              }
            )
          ] })
        ] })
      ] })
    ] }) }),
    adjustModalOpen && /* @__PURE__ */ jsx(Modal.Root, { open: adjustModalOpen, onOpenChange: setAdjustModalOpen, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
      /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsx(Modal.Title, { children: "手动调整积分" }) }),
      /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "用户ID" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: adjustUserId,
              onChange: (e) => setAdjustUserId(e.target.value),
              placeholder: "请输入用户ID"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "调整数量" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: adjustPoints,
              onChange: (e) => setAdjustPoints(e.target.value),
              placeholder: "正数增加，负数扣除"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "备注" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: adjustRemark,
              onChange: (e) => setAdjustRemark(e.target.value),
              placeholder: "调整原因"
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Modal.Footer, { children: [
        /* @__PURE__ */ jsx(Button, { onClick: handleAdjust, children: "确认调整" }),
        /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setAdjustModalOpen(false), children: "取消" })
      ] })
    ] }) })
  ] });
};
const TAB_LIST = [
  { value: "increase", label: "增加规则" },
  { value: "decrease", label: "扣除规则" }
];
const PointRulePage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("increase");
  const { get, put } = useFetchClient();
  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-rules`, {
        params: { category: tab }
      });
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRules();
  }, [tab]);
  const toggleEnabled = async (action, enabled) => {
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/point-rules/${action}`, { enabled });
      setRules(
        (prev) => prev.map((r) => r.action === action ? { ...r, enabled } : r)
      );
    } catch (e) {
      alert(e.message);
    }
  };
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "积分规则管理" }),
    /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", children: TAB_LIST.map((t) => /* @__PURE__ */ jsx(
      Button,
      {
        variant: tab === t.value ? "default" : "secondary",
        onClick: () => setTab(t.value),
        children: t.label
      },
      t.value
    )) }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : rules.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无规则" }) : /* @__PURE__ */ jsxs(Table, { colCount: 6, rowCount: rules.length, children: [
      /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "描述" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "积分值" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "每日上限" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "一次性" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "启用" }) })
      ] }) }),
      /* @__PURE__ */ jsx(Tbody, { children: rules.map((r) => /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: r.action }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.description }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.points }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.limitPerDay > 0 ? r.limitPerDay : "不限" }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: r.isOneTime ? "是" : "否" }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
          Switch,
          {
            checked: r.enabled,
            onCheckedChange: (v) => toggleEnabled(r.action, v)
          }
        ) })
      ] }, r.action)) })
    ] })
  ] }) }) });
};
const RuleTemplatePage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPoints, setDefaultPoints] = useState("");
  const { get, post, del } = useFetchClient();
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/rule-templates`);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTemplates();
  }, []);
  const handleCreate = async () => {
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/rule-templates`, {
        name,
        description,
        defaultPoints: parseInt(defaultPoints),
        category: "increase",
        configSchema: {}
      });
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      setDefaultPoints("");
      fetchTemplates();
    } catch (e) {
      alert(e.message);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("确定删除此模板？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/rule-templates/${id}`);
      fetchTemplates();
    } catch (e) {
      alert(e.message);
    }
  };
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
      /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "规则模板" }),
        /* @__PURE__ */ jsx(Button, { onClick: () => setCreateModalOpen(true), children: "新建模板" })
      ] }),
      loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : templates.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无模板" }) : /* @__PURE__ */ jsxs(Table, { colCount: 5, rowCount: templates.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "名称" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "描述" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "默认积分" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "内置" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: templates.map((t) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: t.name }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: t.description }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: t.defaultPoints }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: t.builtIn ? "是" : "否" }) }),
          /* @__PURE__ */ jsx(Td, { children: !t.builtIn && /* @__PURE__ */ jsx(Button, { variant: "danger-light", size: "S", onClick: () => handleDelete(t.id), children: "删除" }) })
        ] }, t.id)) })
      ] })
    ] }) }),
    createModalOpen && /* @__PURE__ */ jsx(Modal.Root, { open: createModalOpen, onOpenChange: setCreateModalOpen, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
      /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsx(Modal.Title, { children: "新建规则模板" }) }),
      /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "模板名称" }),
          /* @__PURE__ */ jsx(TextInput, { value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "描述" }),
          /* @__PURE__ */ jsx(TextInput, { value: description, onChange: (e) => setDescription(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "默认积分" }),
          /* @__PURE__ */ jsx(TextInput, { value: defaultPoints, onChange: (e) => setDefaultPoints(e.target.value) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Modal.Footer, { children: [
        /* @__PURE__ */ jsx(Button, { onClick: handleCreate, children: "创建" }),
        /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setCreateModalOpen(false), children: "取消" })
      ] })
    ] }) })
  ] });
};
const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockDelta, setStockDelta] = useState("");
  const { get, post, put, del } = useFetchClient();
  const navigate = useNavigate();
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products`, { params: { pageSize: 100 } });
      setProducts(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []);
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "on_shelf" ? "off_shelf" : "on_shelf";
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, { status: newStatus });
      fetchProducts();
    } catch (e) {
      alert(e.message);
    }
  };
  const handleStockAdjust = async () => {
    if (!selectedProduct) return;
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/products/${selectedProduct.id}/stock`, {
        delta: parseInt(stockDelta)
      });
      setStockModalOpen(false);
      setSelectedProduct(null);
      setStockDelta("");
      fetchProducts();
    } catch (e) {
      alert(e.message);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("确定删除此商品？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
      fetchProducts();
    } catch (e) {
      alert(e.message);
    }
  };
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
      /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "积分商城" }),
        /* @__PURE__ */ jsx(Button, { onClick: () => navigate("/plugins/" + PLUGIN_ID + "/products/new"), children: "新建商品" })
      ] }),
      loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : products.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无商品" }) : /* @__PURE__ */ jsxs(Table, { colCount: 6, rowCount: products.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "商品名称" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "所需积分" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "库存" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "配送方式" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: products.map((p) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: p.name }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: p.pointsCost }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: p.stock >= 0 ? p.stock : "不限" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: p.deliveryType }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { textColor: p.status === "on_shelf" ? "success600" : "neutral600", children: p.status === "on_shelf" ? "上架中" : "已下架" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
            /* @__PURE__ */ jsx(Button, { size: "S", variant: "secondary", onClick: () => navigate(`/plugins/${PLUGIN_ID}/products/${p.id}/edit`), children: "编辑" }),
            /* @__PURE__ */ jsx(Button, { size: "S", variant: "secondary", onClick: () => toggleStatus(p.id, p.status), children: p.status === "on_shelf" ? "下架" : "上架" }),
            /* @__PURE__ */ jsx(Button, { size: "S", variant: "secondary", onClick: () => {
              setSelectedProduct(p);
              setStockModalOpen(true);
            }, children: "调库存" }),
            /* @__PURE__ */ jsx(Button, { size: "S", variant: "danger-light", onClick: () => handleDelete(p.id), children: "删除" })
          ] }) })
        ] }, p.id)) })
      ] })
    ] }) }),
    stockModalOpen && /* @__PURE__ */ jsx(Modal.Root, { open: stockModalOpen, onOpenChange: setStockModalOpen, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
      /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsxs(Modal.Title, { children: [
        "调整库存: ",
        selectedProduct?.name
      ] }) }),
      /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Field.Root, { children: [
        /* @__PURE__ */ jsx(Field.Label, { children: "库存变动" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            value: stockDelta,
            onChange: (e) => setStockDelta(e.target.value),
            placeholder: "正数增加，负数减少"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs(Modal.Footer, { children: [
        /* @__PURE__ */ jsx(Button, { onClick: handleStockAdjust, children: "确认" }),
        /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setStockModalOpen(false), children: "取消" })
      ] })
    ] }) })
  ] });
};
const ProductFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [stock, setStock] = useState("0");
  const [deliveryType, setDeliveryType] = useState("self_pickup");
  const [maxPerUser, setMaxPerUser] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
          setName(data.name);
          setDescription(data.description || "");
          setPointsCost(String(data.pointsCost));
          setStock(String(data.stock));
          setDeliveryType(data.deliveryType);
          setMaxPerUser(String(data.maxPerUser || 0));
          setSortOrder(String(data.sortOrder || 0));
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);
  const handleSubmit = async () => {
    const body = {
      name,
      description,
      pointsCost: parseInt(pointsCost),
      stock: parseInt(stock),
      deliveryType,
      maxPerUser: parseInt(maxPerUser),
      sortOrder: parseInt(sortOrder)
    };
    try {
      if (isEdit) {
        await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, body);
      } else {
        await post(`/admin/plugins/${PLUGIN_ID}/products`, body);
      }
      navigate(`/plugins/${PLUGIN_ID}/products`);
    } catch (e) {
      alert(e.message);
    }
  };
  if (loading) return /* @__PURE__ */ jsx(Loader, { children: "加载中..." });
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", maxWidth: "600px", children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: isEdit ? "编辑商品" : "新建商品" }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "商品名称" }),
      /* @__PURE__ */ jsx(TextInput, { value: name, onChange: (e) => setName(e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "描述" }),
      /* @__PURE__ */ jsx(TextInput, { value: description, onChange: (e) => setDescription(e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "所需积分" }),
      /* @__PURE__ */ jsx(TextInput, { value: pointsCost, onChange: (e) => setPointsCost(e.target.value), type: "number" })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "库存（-1为不限）" }),
      /* @__PURE__ */ jsx(TextInput, { value: stock, onChange: (e) => setStock(e.target.value), type: "number" })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "配送方式" }),
      /* @__PURE__ */ jsxs(SingleSelect, { value: deliveryType, onChange: (v) => setDeliveryType(String(v)), children: [
        /* @__PURE__ */ jsx(SingleSelectOption, { value: "self_pickup", children: "到店自提" }),
        /* @__PURE__ */ jsx(SingleSelectOption, { value: "express", children: "快递配送" }),
        /* @__PURE__ */ jsx(SingleSelectOption, { value: "both", children: "两者均可" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "每人限兑" }),
      /* @__PURE__ */ jsx(TextInput, { value: maxPerUser, onChange: (e) => setMaxPerUser(e.target.value), type: "number" })
    ] }),
    /* @__PURE__ */ jsxs(Field.Root, { children: [
      /* @__PURE__ */ jsx(Field.Label, { children: "排序" }),
      /* @__PURE__ */ jsx(TextInput, { value: sortOrder, onChange: (e) => setSortOrder(e.target.value), type: "number" })
    ] }),
    /* @__PURE__ */ jsxs(Flex, { gap: 3, children: [
      /* @__PURE__ */ jsx(Button, { onClick: handleSubmit, children: isEdit ? "保存" : "创建" }),
      /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => navigate(`/plugins/${PLUGIN_ID}/products`), children: "取消" })
    ] })
  ] }) }) });
};
const statusLabels = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消"
};
const statusColors = {
  pending: "warning600",
  approved: "primary600",
  rejected: "danger600",
  shipped: "success600",
  completed: "success600",
  cancelled: "neutral600"
};
const RedemptionPage = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [expressCompany, setExpressCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const { get, put } = useFetchClient();
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-redemptions`, { params });
      setOrders(data.records || []);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);
  const openReview = (order) => {
    setSelectedOrder(order);
    setReviewStatus("");
    setExpressCompany("");
    setTrackingNumber("");
    setReviewModalOpen(true);
  };
  const openDetail = (order) => {
    setDetailOrder(order);
    setDetailModalOpen(true);
  };
  const handleReview = async () => {
    if (!selectedOrder || !reviewStatus) return;
    try {
      const body = { status: reviewStatus };
      if (reviewStatus === "shipped") {
        body.expressCompany = expressCompany;
        body.trackingNumber = trackingNumber;
      }
      await put(`/admin/plugins/${PLUGIN_ID}/point-redemptions/${selectedOrder.id}`, body);
      setReviewModalOpen(false);
      fetchOrders();
    } catch (e) {
      alert(e.message);
    }
  };
  const totalPages = Math.ceil(total / pageSize);
  const getNextActions = (status) => {
    const actions = {
      pending: ["approved", "rejected"],
      approved: ["shipped", "cancelled"],
      shipped: ["completed"]
    };
    return actions[status] || [];
  };
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
      /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "兑换管理" }),
      /* @__PURE__ */ jsx(Box, { width: "200px", children: /* @__PURE__ */ jsxs(
        SingleSelect,
        {
          placeholder: "状态筛选",
          value: statusFilter,
          onChange: (v) => {
            setStatusFilter(String(v || ""));
            setPage(1);
          },
          children: [
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "", children: "全部" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "pending", children: "待审核" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "approved", children: "已通过" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "shipped", children: "已发货" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "completed", children: "已完成" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "rejected", children: "已驳回" }),
            /* @__PURE__ */ jsx(SingleSelectOption, { value: "cancelled", children: "已取消" })
          ]
        }
      ) }),
      loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : orders.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无兑换记录" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(Table, { colCount: 8, rowCount: orders.length, children: [
          /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "商品" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "用户" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "数量" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "积分" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "配送方式" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "时间" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
          ] }) }),
          /* @__PURE__ */ jsx(Tbody, { children: orders.map((o) => /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: o.itemName }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: o.user?.id || o.user }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: o.quantity || 1 }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: o.totalCost || o.pointsCost }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: o.deliveryType === "express" ? "快递" : o.deliveryType === "self_pickup" ? "自提" : "-" }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { textColor: statusColors[o.status] || "neutral600", children: statusLabels[o.status] || o.status }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: new Date(o.createdAt).toLocaleDateString() }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
              /* @__PURE__ */ jsx(Button, { size: "S", variant: "secondary", onClick: () => openDetail(o), children: "详情" }),
              getNextActions(o.status).length > 0 && /* @__PURE__ */ jsx(Button, { size: "S", onClick: () => openReview(o), children: "审核" })
            ] }) })
          ] }, o.id)) })
        ] }),
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
            "共 ",
            total,
            " 条记录"
          ] }),
          /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: page <= 1, onClick: () => setPage((p) => Math.max(1, p - 1)), children: "上一页" }),
            /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
              page,
              " / ",
              totalPages
            ] }),
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: page >= totalPages, onClick: () => setPage((p) => p + 1), children: "下一页" })
          ] })
        ] })
      ] })
    ] }) }),
    reviewModalOpen && selectedOrder && /* @__PURE__ */ jsx(Modal.Root, { open: reviewModalOpen, onOpenChange: setReviewModalOpen, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
      /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsxs(Modal.Title, { children: [
        "审核兑换: ",
        selectedOrder.itemName
      ] }) }),
      /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "审核结果" }),
          /* @__PURE__ */ jsx(SingleSelect, { value: reviewStatus, onChange: (v) => setReviewStatus(String(v)), children: getNextActions(selectedOrder.status).map((s) => /* @__PURE__ */ jsx(SingleSelectOption, { value: s, children: statusLabels[s] || s }, s)) })
        ] }),
        reviewStatus === "shipped" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(Field.Root, { children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "快递公司" }),
            /* @__PURE__ */ jsx(TextInput, { value: expressCompany, onChange: (e) => setExpressCompany(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs(Field.Root, { children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "快递单号" }),
            /* @__PURE__ */ jsx(TextInput, { value: trackingNumber, onChange: (e) => setTrackingNumber(e.target.value) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Modal.Footer, { children: [
        /* @__PURE__ */ jsx(Button, { onClick: handleReview, children: "确认" }),
        /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setReviewModalOpen(false), children: "取消" })
      ] })
    ] }) }),
    detailModalOpen && detailOrder && /* @__PURE__ */ jsx(Modal.Root, { open: detailModalOpen, onOpenChange: setDetailModalOpen, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
      /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsx(Modal.Title, { children: "兑换详情" }) }),
      /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "商品:" }),
          " ",
          detailOrder.itemName
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "积分数:" }),
          " ",
          detailOrder.totalCost || detailOrder.pointsCost
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "数量:" }),
          " ",
          detailOrder.quantity || 1
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "状态:" }),
          " ",
          statusLabels[detailOrder.status]
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "配送方式:" }),
          " ",
          detailOrder.deliveryType === "express" ? "快递配送" : detailOrder.deliveryType === "self_pickup" ? "到店自提" : "未指定"
        ] }),
        detailOrder.deliveryType === "express" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(Typography, { children: [
            /* @__PURE__ */ jsx("strong", { children: "收件人:" }),
            " ",
            detailOrder.receiverName || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            /* @__PURE__ */ jsx("strong", { children: "电话:" }),
            " ",
            detailOrder.receiverPhone || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            /* @__PURE__ */ jsx("strong", { children: "地址:" }),
            " ",
            detailOrder.receiverAddress || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            /* @__PURE__ */ jsx("strong", { children: "快递公司:" }),
            " ",
            detailOrder.expressCompany || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            /* @__PURE__ */ jsx("strong", { children: "快递单号:" }),
            " ",
            detailOrder.trackingNumber || "-"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "备注:" }),
          " ",
          detailOrder.remark || "-"
        ] }),
        /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "创建时间:" }),
          " ",
          new Date(detailOrder.createdAt).toLocaleString()
        ] }),
        detailOrder.completedAt && /* @__PURE__ */ jsxs(Typography, { children: [
          /* @__PURE__ */ jsx("strong", { children: "完成时间:" }),
          " ",
          new Date(detailOrder.completedAt).toLocaleString()
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setDetailModalOpen(false), children: "关闭" }) })
    ] }) })
  ] });
};
const ConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({});
  const { get, put } = useFetchClient();
  useEffect(() => {
    (async () => {
      try {
        const { data } = await get(`/admin/plugins/${PLUGIN_ID}/config`);
        setConfig(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/config`, config);
      alert("保存成功");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) return /* @__PURE__ */ jsx(Loader, { children: "加载中..." });
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, alignItems: "stretch", maxWidth: "600px", children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "系统配置" }),
    /* @__PURE__ */ jsxs(Box, { background: "neutral100", padding: 6, borderRadius: 4, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", paddingBottom: 4, children: "功能开关" }),
      /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx(Typography, { children: "积分模块总开关" }),
          /* @__PURE__ */ jsx(
            Switch,
            {
              checked: config.moduleEnabled,
              onCheckedChange: (v) => updateField("moduleEnabled", v)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx(Typography, { children: "积分获取功能" }),
          /* @__PURE__ */ jsx(
            Switch,
            {
              checked: config.earnEnabled,
              onCheckedChange: (v) => updateField("earnEnabled", v)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx(Typography, { children: "积分兑换功能" }),
          /* @__PURE__ */ jsx(
            Switch,
            {
              checked: config.redeemEnabled,
              onCheckedChange: (v) => updateField("redeemEnabled", v)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx(Typography, { children: "积分过期功能" }),
          /* @__PURE__ */ jsx(
            Switch,
            {
              checked: config.expiryEnabled,
              onCheckedChange: (v) => updateField("expiryEnabled", v)
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Box, { background: "neutral100", padding: 6, borderRadius: 4, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", paddingBottom: 4, children: "有效期设置" }),
      /* @__PURE__ */ jsxs(Grid.Root, { gridCols: 2, gap: 4, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "有效期（天）" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: String(config.expiryDays || 365),
              onChange: (e) => updateField("expiryDays", parseInt(e.target.value) || 0),
              type: "number"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "过期提醒（天）" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: String(config.expiryReminderDays || 7),
              onChange: (e) => updateField("expiryReminderDays", parseInt(e.target.value) || 0),
              type: "number"
            }
          )
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Box, { background: "neutral100", padding: 6, borderRadius: 4, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "delta", paddingBottom: 4, children: "限制设置" }),
      /* @__PURE__ */ jsxs(Grid.Root, { gridCols: 2, gap: 4, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "最低兑换积分" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: String(config.minRedeemPoints || 0),
              onChange: (e) => updateField("minRedeemPoints", parseInt(e.target.value) || 0),
              type: "number"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "每日获取上限" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: String(config.maxDailyEarn || 0),
              onChange: (e) => updateField("maxDailyEarn", parseInt(e.target.value) || 0),
              type: "number"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "默认汇率" }),
          /* @__PURE__ */ jsx(
            TextInput,
            {
              value: String(config.defaultExchangeRate || 1),
              onChange: (e) => updateField("defaultExchangeRate", parseFloat(e.target.value) || 1),
              type: "number"
            }
          )
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: saving, children: "保存配置" }) })
  ] }) }) });
};
const VerificationPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const { get } = useFetchClient();
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/verifications`, {
        params: { page, pageSize }
      });
      setLogs(data.records || []);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLogs();
  }, [page]);
  const totalPages = Math.ceil(total / pageSize);
  const statusLabels2 = {
    pending: "待核销",
    approved: "已核销",
    rejected: "已拒绝"
  };
  const directionLabels = {
    superior_to_subordinate: "上级→下级",
    subordinate_to_superior: "下级→上级"
  };
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "核销管理" }),
    loading ? /* @__PURE__ */ jsx(Loader, { children: "加载中..." }) : logs.length === 0 ? /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无核销记录" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 7, rowCount: logs.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "核销人" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "被核销用户" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "渠道" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "方向" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "方式" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
          /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "时间" }) })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: logs.map((l) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: l.verifier?.id || l.verifier }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: l.verifiedUser?.id || l.verifiedUser || "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: l.channel?.id || l.channel }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: directionLabels[l.direction] || l.direction }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: l.method === "qr_scan" ? "扫码" : "手动" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
            Badge,
            {
              textColor: l.status === "approved" ? "success600" : l.status === "rejected" ? "danger600" : "warning600",
              children: statusLabels2[l.status] || l.status
            }
          ) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", children: new Date(l.createdAt).toLocaleString() }) })
        ] }, l.id)) })
      ] }),
      /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
        /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
          "共 ",
          total,
          " 条记录"
        ] }),
        /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
          /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: page <= 1, onClick: () => setPage((p) => Math.max(1, p - 1)), children: "上一页" }),
          /* @__PURE__ */ jsxs(Typography, { variant: "pi", children: [
            page,
            " / ",
            totalPages
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: page >= totalPages, onClick: () => setPage((p) => p + 1), children: "下一页" })
        ] })
      ] })
    ] })
  ] }) }) });
};
const App = () => {
  return /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "records", element: /* @__PURE__ */ jsx(PointRecordsPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "rules", element: /* @__PURE__ */ jsx(PointRulePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "rule-templates", element: /* @__PURE__ */ jsx(RuleTemplatePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "products", element: /* @__PURE__ */ jsx(ProductPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "products/new", element: /* @__PURE__ */ jsx(ProductFormPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "products/:id/edit", element: /* @__PURE__ */ jsx(ProductFormPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "redemptions", element: /* @__PURE__ */ jsx(RedemptionPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "config", element: /* @__PURE__ */ jsx(ConfigPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "verifications", element: /* @__PURE__ */ jsx(VerificationPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Page.Error, {}) })
  ] });
};
export {
  App
};
