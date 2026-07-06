import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { Loader, Main, Box, Flex, Typography, Button, Grid, Card, CardHeader, CardBody, Status, EmptyStateLayout, Table, Thead, Tr, Th, Tbody, Td, Modal, Field, TextInput } from "@strapi/design-system";
import { ArrowClockwise, Play, Trash, Plus } from "@strapi/icons";
const API_PREFIX = "/admin/plugins/zhao-oss";
const statusVariant = {
  success: "success",
  failed: "danger",
  pending: "primary",
  syncing: "warning",
  deleted: "neutral"
};
const statusText = {
  success: "成功",
  failed: "失败",
  pending: "待同步",
  syncing: "同步中",
  deleted: "已删除"
};
const TAB_LIST = [
  { value: "dashboard", label: "仪表盘" },
  { value: "records", label: "同步记录" },
  { value: "settings", label: "配置管理" },
  { value: "actions", label: "操作中心" }
];
const HomePage = () => {
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [config, setConfig] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncFileId, setSyncFileId] = useState("");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLimit, setBatchLimit] = useState("50");
  const [batchOffset, setBatchOffset] = useState("0");
  const [batchResult, setBatchResult] = useState(null);
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/sync/dashboard`);
      setDashboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);
  const loadHealth = useCallback(async () => {
    try {
      const { data } = await get(`${API_PREFIX}/sync/health`);
      setHealth(data);
    } catch (e) {
      console.error(e);
    }
  }, [get]);
  const loadRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/sync/records?page=${page}&pageSize=20`);
      setRecords(data?.data || []);
      setRecordsTotal(data?.meta?.pagination?.total || 0);
      setRecordsPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/settings`);
      setConfig(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);
  useEffect(() => {
    loadDashboard();
    loadHealth();
  }, [loadDashboard, loadHealth]);
  const handleTriggerSync = async (fileId) => {
    try {
      await post(`${API_PREFIX}/sync/trigger`, { fileId });
      loadRecords(recordsPage);
    } catch (e) {
      console.error(e);
    }
  };
  const handleBatchSync = async (limit, offset) => {
    try {
      const { data } = await post(`${API_PREFIX}/sync/batch`, { limit, offset });
      setBatchResult(data);
      loadRecords(recordsPage);
    } catch (e) {
      console.error(e);
    }
  };
  const handleDeleteRemote = async (recordId) => {
    if (!window.confirm("确定删除远程文件?")) return;
    try {
      await del(`${API_PREFIX}/sync/remote/${recordId}`);
      loadRecords(recordsPage);
    } catch (e) {
      console.error(e);
    }
  };
  if (loading && !dashboard) return /* @__PURE__ */ jsx(Loader, { children: "加载中..." });
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(Box, { paddingTop: 6, paddingBottom: 4, paddingLeft: 10, paddingRight: 10, background: "neutral0", children: /* @__PURE__ */ jsx(Flex, { justifyContent: "space-between", alignItems: "center", children: /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", tag: "h1", children: "OSS 备份管理" }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 1, children: /* @__PURE__ */ jsx(Typography, { variant: "epsilon", textColor: "neutral600", tag: "p", children: "多媒体文件统一存储备份迁移" }) })
    ] }) }) }),
    /* @__PURE__ */ jsx(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, children: /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", children: TAB_LIST.map((t) => /* @__PURE__ */ jsx(
      Button,
      {
        variant: activeTab === t.value ? "default" : "secondary",
        onClick: () => {
          setActiveTab(t.value);
          if (t.value === "records" && records.length === 0) loadRecords(1);
          if (t.value === "settings" && !config) loadConfig();
        },
        children: t.label
      },
      t.value
    )) }) }),
    /* @__PURE__ */ jsxs(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
      activeTab === "dashboard" && /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
        /* @__PURE__ */ jsxs(Grid.Root, { gridCols: 4, gap: 4, children: [
          /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "总文件数" }) }),
            /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: dashboard?.stats?.total || 0 }) })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "已同步" }) }),
            /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", textColor: "success600", children: dashboard?.stats?.synced || 0 }) })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "同步失败" }) }),
            /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", textColor: "danger600", children: dashboard?.stats?.failed || 0 }) })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "待同步" }) }),
            /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", textColor: "primary600", children: dashboard?.stats?.pending || 0 }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "健康状态" }),
            /* @__PURE__ */ jsx(Button, { size: "S", variant: "tertiary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: loadHealth, children: "刷新" })
          ] }) }),
          /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs(Flex, { gap: 4, children: [
            /* @__PURE__ */ jsxs(Typography, { children: [
              "提供者: ",
              health?.provider || "-"
            ] }),
            /* @__PURE__ */ jsx(Status, { variant: health?.healthy ? "success" : "danger", children: /* @__PURE__ */ jsx(Typography, { children: health?.healthy ? "正常" : "异常" }) })
          ] }) })
        ] })
      ] }),
      activeTab === "records" && /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
        /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
          /* @__PURE__ */ jsx(Button, { variant: "secondary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: () => loadRecords(recordsPage), children: "刷新" }),
          /* @__PURE__ */ jsx(Button, { variant: "secondary", startIcon: /* @__PURE__ */ jsx(Play, {}), onClick: () => setShowBatchModal(true), children: "批量重试" })
        ] }),
        records.length === 0 ? /* @__PURE__ */ jsx(Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无同步记录" }) }) : /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 5, rowCount: records.length, children: [
          /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "文件 ID" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "提供者" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "同步时间" }) }),
            /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
          ] }) }),
          /* @__PURE__ */ jsx(Tbody, { children: records.map((record) => /* @__PURE__ */ jsxs(Tr, { children: [
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: record.fileId }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Status, { variant: statusVariant[record.status] || "neutral", children: /* @__PURE__ */ jsx(Typography, { children: statusText[record.status] || record.status }) }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: record.provider }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: record.lastSyncedAt ? new Date(record.lastSyncedAt).toLocaleString() : "-" }) }),
            /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
              record.status === "failed" && /* @__PURE__ */ jsx(Button, { size: "S", variant: "tertiary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: () => handleTriggerSync(record.fileId), children: "重试" }),
              record.status === "success" && /* @__PURE__ */ jsx(Button, { size: "S", variant: "danger-light", startIcon: /* @__PURE__ */ jsx(Trash, {}), onClick: () => handleDeleteRemote(record.id), children: "删除" })
            ] }) })
          ] }, record.id)) })
        ] }) }),
        recordsTotal > 20 && /* @__PURE__ */ jsxs(Flex, { justifyContent: "center", gap: 2, paddingTop: 4, children: [
          /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: recordsPage <= 1, onClick: () => loadRecords(recordsPage - 1), children: "上一页" }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            recordsPage,
            " / ",
            Math.ceil(recordsTotal / 20)
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "tertiary", disabled: recordsPage >= Math.ceil(recordsTotal / 20), onClick: () => loadRecords(recordsPage + 1), children: "下一页" })
        ] })
      ] }),
      activeTab === "settings" && /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 4, maxWidth: "600px", alignItems: "stretch", children: config ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Typography, { variant: "delta", children: "OSS 配置" }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
          /* @__PURE__ */ jsxs(Typography, { children: [
            "提供者: ",
            config.provider || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            "存储桶: ",
            config.bucket || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            "区域: ",
            config.region || "-"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            "路径前缀: ",
            config.basePath || "uploads"
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            "最大重试: ",
            config.maxRetries || 3
          ] }),
          /* @__PURE__ */ jsxs(Typography, { children: [
            "超时(ms): ",
            config.uploadTimeoutMs || 3e4
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Button, { variant: "secondary", startIcon: /* @__PURE__ */ jsx(ArrowClockwise, {}), onClick: () => loadConfig(), children: "刷新配置" })
      ] }) : /* @__PURE__ */ jsx(Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无配置信息" }) }) }),
      activeTab === "actions" && /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "单个文件同步" }) }),
          /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Button, { startIcon: /* @__PURE__ */ jsx(Play, {}), onClick: () => setShowSyncModal(true), children: "触发同步" }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "批量同步" }) }),
          /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, alignItems: "stretch", children: [
            /* @__PURE__ */ jsx(Button, { startIcon: /* @__PURE__ */ jsx(Plus, {}), onClick: () => setShowBatchModal(true), children: "批量同步" }),
            batchResult && /* @__PURE__ */ jsxs(Flex, { gap: 4, children: [
              /* @__PURE__ */ jsxs(Typography, { children: [
                "总计: ",
                batchResult.total
              ] }),
              /* @__PURE__ */ jsxs(Typography, { textColor: "success600", children: [
                "成功: ",
                batchResult.success
              ] }),
              /* @__PURE__ */ jsxs(Typography, { textColor: "danger600", children: [
                "失败: ",
                batchResult.failed
              ] })
            ] })
          ] }) })
        ] })
      ] })
    ] }),
    showSyncModal && /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: showSyncModal,
        onOpenChange: (open) => {
          if (!open) setShowSyncModal(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "单个文件同步" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: /* @__PURE__ */ jsxs(Field.Root, { name: "fileId", required: true, children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "文件 ID" }),
            /* @__PURE__ */ jsx(
              TextInput,
              {
                value: syncFileId,
                onChange: (e) => setSyncFileId(e.target.value),
                placeholder: "请输入文件 ID"
              }
            )
          ] }) }) }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setShowSyncModal(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: () => {
              const id = parseInt(syncFileId);
              if (!isNaN(id)) {
                handleTriggerSync(id);
                setSyncFileId("");
                setShowSyncModal(false);
              }
            }, children: "同步" })
          ] }) })
        ] })
      }
    ),
    showBatchModal && /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: showBatchModal,
        onOpenChange: (open) => {
          if (!open) setShowBatchModal(false);
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "批量同步" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxs(Field.Root, { name: "limit", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "每次数量" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: batchLimit,
                  onChange: (e) => setBatchLimit(e.target.value),
                  placeholder: "50"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "offset", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "起始偏移" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: batchOffset,
                  onChange: (e) => setBatchOffset(e.target.value),
                  placeholder: "0"
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(Button, { variant: "tertiary", onClick: () => setShowBatchModal(false), children: "取消" }),
            /* @__PURE__ */ jsx(Button, { onClick: () => {
              const limit = parseInt(batchLimit) || 50;
              const offset = parseInt(batchOffset) || 0;
              handleBatchSync(limit, offset);
              setShowBatchModal(false);
            }, children: "批量同步" })
          ] }) })
        ] })
      }
    )
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
