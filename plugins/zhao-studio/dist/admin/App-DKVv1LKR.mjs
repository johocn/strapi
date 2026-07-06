import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { Layout, Menu, Card, Typography, Tag, Space, Row, Col, Form, Input, Select, Switch, Button, List, Checkbox, Modal, Divider, message, Spin, Table, Tabs, Popconfirm, InputNumber, DatePicker, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { HomeOutlined, CloudDownloadOutlined, SendOutlined, BarChartOutlined, SettingOutlined, RobotOutlined } from "@ant-design/icons";
import React, { useState, useEffect } from "react";
import { p as pluginId } from "./index-CMyxY-yX.mjs";
import ReactECharts from "echarts-for-react";
const { Sider, Content } = Layout;
const menuItems = [
  { key: "", icon: /* @__PURE__ */ jsx(HomeOutlined, {}), label: "仪表盘" },
  { key: "collect", icon: /* @__PURE__ */ jsx(CloudDownloadOutlined, {}), label: "采集管理" },
  { key: "publish", icon: /* @__PURE__ */ jsx(SendOutlined, {}), label: "内容发布" },
  { key: "stats/basic", icon: /* @__PURE__ */ jsx(BarChartOutlined, {}), label: "基础统计" },
  { key: "stats/advanced", icon: /* @__PURE__ */ jsx(BarChartOutlined, {}), label: "高级统计" },
  { key: "stats/pro", icon: /* @__PURE__ */ jsx(BarChartOutlined, {}), label: "专业统计" },
  { key: "platforms", icon: /* @__PURE__ */ jsx(SettingOutlined, {}), label: "平台配置" },
  { key: "accounts", icon: /* @__PURE__ */ jsx(SettingOutlined, {}), label: "账号配置" },
  { key: "ad-slots", icon: /* @__PURE__ */ jsx(SettingOutlined, {}), label: "广告位配置" },
  { key: "ai-config", icon: /* @__PURE__ */ jsx(RobotOutlined, {}), label: "AI 配置" }
];
const PluginLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split("/plugins/zhao-studio/")[1] || "";
  const selectedKey = pathParts.split("?")[0];
  return /* @__PURE__ */ jsxs(Layout, { style: { minHeight: "calc(100vh - 64px)" }, children: [
    /* @__PURE__ */ jsx(Sider, { width: 200, theme: "light", children: /* @__PURE__ */ jsx(
      Menu,
      {
        mode: "inline",
        selectedKeys: [selectedKey],
        style: { height: "100%", borderRight: 0 },
        items: menuItems,
        onClick: ({ key }) => navigate(`/plugins/zhao-studio${key ? "/" + key : ""}`)
      }
    ) }),
    /* @__PURE__ */ jsx(Content, { style: { padding: 24, background: "#f5f5f5" }, children })
  ] });
};
function formatNumber(num) {
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + "M";
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + "K";
  }
  return num.toString();
}
function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}
const { Text: Text$c, Title: Title$c } = Typography;
const OverviewCard = ({ title, value, change, unit = "", type = "number" }) => {
  const formatValue = () => {
    if (type === "percent") {
      return formatPercent(value);
    }
    if (type === "duration") {
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    }
    return formatNumber(value) + (unit ? ` ${unit}` : "");
  };
  const getChangeTag = () => {
    if (change === 0) {
      return /* @__PURE__ */ jsx(Tag, { children: "持平" });
    }
    if (change > 0) {
      return /* @__PURE__ */ jsxs(Tag, { color: "success", children: [
        "↑ ",
        change,
        "%"
      ] });
    }
    return /* @__PURE__ */ jsxs(Tag, { color: "error", children: [
      "↓ ",
      Math.abs(change),
      "%"
    ] });
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(Text$c, { type: "secondary", children: title }),
    /* @__PURE__ */ jsx(Title$c, { level: 3, style: { marginTop: 8, marginBottom: 8 }, children: formatValue() }),
    getChangeTag()
  ] });
};
const { Title: Title$b, Paragraph: Paragraph$1, Text: Text$b } = Typography;
const HomePage = () => {
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(Title$b, { level: 2, children: "内容工作室" }),
      /* @__PURE__ */ jsx(Paragraph$1, { type: "secondary", children: "定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$b, { level: 4, children: "今日概览" }),
      /* @__PURE__ */ jsxs(Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsx(Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsx(OverviewCard, { title: "采集文章", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsx(Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsx(OverviewCard, { title: "发布文章", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsx(Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsx(OverviewCard, { title: "总浏览", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsx(Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsx(OverviewCard, { title: "广告收入", value: 0, change: 0, unit: "元" }) })
      ] })
    ] })
  ] });
};
const baseUrl = `/admin/plugins/${pluginId}`;
const collectApi = {
  // 采集源管理
  async getSources() {
    const response = await fetch(`${baseUrl}/sources`);
    return response.json();
  },
  async createSource(data) {
    const response = await fetch(`${baseUrl}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    return response.json();
  },
  async updateSource(id, data) {
    const response = await fetch(`${baseUrl}/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    return response.json();
  },
  async deleteSource(id) {
    const response = await fetch(`${baseUrl}/sources/${id}`, {
      method: "DELETE"
    });
    return response.json();
  },
  // 采集任务管理
  async createTask(sourceId) {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId })
    });
    return response.json();
  },
  async getTasks() {
    const response = await fetch(`${baseUrl}/tasks`);
    return response.json();
  },
  async getTask(id) {
    const response = await fetch(`${baseUrl}/tasks/${id}`);
    return response.json();
  },
  async fetchSelectedContent(taskId, selectedTitles) {
    const response = await fetch(`${baseUrl}/tasks/${taskId}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedTitles })
    });
    return response.json();
  },
  async confirmImport(taskId, confirmedContents) {
    const response = await fetch(`${baseUrl}/tasks/${taskId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedContents })
    });
    return response.json();
  }
};
function useCollectSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getSources();
      setSources(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const createSource = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.createSource(data);
      await fetchSources();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const updateSource = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.updateSource(id, data);
      await fetchSources();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const deleteSource = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await collectApi.deleteSource(id);
      await fetchSources();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSources();
  }, []);
  return {
    sources,
    loading,
    error,
    fetchSources,
    createSource,
    updateSource,
    deleteSource
  };
}
function useCollectTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getTasks();
      setTasks(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const createTask = async (sourceId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.createTask(sourceId);
      await fetchTasks();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const getTask = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getTask(id);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const fetchSelectedContent = async (taskId, selectedTitles) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.fetchSelectedContent(taskId, selectedTitles);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const confirmImport = async (taskId, confirmedContents) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.confirmImport(taskId, confirmedContents);
      await fetchTasks();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTasks();
  }, []);
  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    getTask,
    fetchSelectedContent,
    confirmImport
  };
}
const SourceConfig = ({ source, onSave, onCancel }) => {
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (source) {
      form.setFieldsValue(source);
    } else {
      form.resetFields();
    }
  }, [source, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSave(values);
    });
  };
  return /* @__PURE__ */ jsxs(Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsx(Form.Item, { name: "name", label: "名称", rules: [{ required: true, message: "请输入名称" }], children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "url", label: "URL", rules: [{ required: true, message: "请输入URL" }], children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "type", label: "类型", initialValue: "custom", children: /* @__PURE__ */ jsx(Select, { options: [
      { value: "template", label: "模板" },
      { value: "custom", label: "自定义" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "template", label: "模板", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "titleSelector", label: "标题选择器", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "contentSelector", label: "内容选择器", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "authorSelector", label: "作者选择器", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "dateSelector", label: "日期选择器", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsx(Switch, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsxs(Space, { children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$a } = Typography;
const TitleSelector = ({ titles, onSelectionChange, onFetchContent }) => {
  const [selected, setSelected] = React.useState([]);
  const handleToggle = (title) => {
    const next = selected.includes(title) ? selected.filter((t) => t !== title) : [...selected, title];
    setSelected(next);
    onSelectionChange(next);
  };
  const handleSelectAll = () => {
    setSelected(titles);
    onSelectionChange(titles);
  };
  const handleClear = () => {
    setSelected([]);
    onSelectionChange([]);
  };
  return /* @__PURE__ */ jsxs(
    Card,
    {
      title: "选择要采集的标题",
      extra: /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: handleSelectAll, children: "全选" }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: handleClear, children: "清空" })
      ] }),
      children: [
        /* @__PURE__ */ jsx(
          List,
          {
            dataSource: titles,
            renderItem: (title) => /* @__PURE__ */ jsx(List.Item, { children: /* @__PURE__ */ jsx(
              Checkbox,
              {
                checked: selected.includes(title),
                onChange: () => handleToggle(title),
                children: title
              }
            ) })
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { marginTop: 16, textAlign: "right" }, children: /* @__PURE__ */ jsxs(Button, { type: "primary", onClick: onFetchContent, disabled: selected.length === 0, children: [
          "获取内容（",
          selected.length,
          "）"
        ] }) })
      ]
    }
  );
};
const { Title: Title$9, Paragraph, Text: Text$a } = Typography;
const ContentPreview = ({ contents, onConfirm, onCancel }) => {
  const [excluded, setExcluded] = React.useState([]);
  const handleToggle = (title) => {
    setExcluded(
      (prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };
  const handleConfirm = () => {
    const confirmed = contents.filter((c) => !excluded.includes(c.title));
    onConfirm(confirmed);
  };
  return /* @__PURE__ */ jsx(
    Card,
    {
      title: "内容预览",
      extra: /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "返回" }),
        /* @__PURE__ */ jsxs(Button, { type: "primary", onClick: handleConfirm, children: [
          "确认导入（",
          contents.length - excluded.length,
          "）"
        ] })
      ] }),
      children: /* @__PURE__ */ jsx(
        List,
        {
          dataSource: contents,
          renderItem: (item) => /* @__PURE__ */ jsx(
            List.Item,
            {
              actions: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    size: "small",
                    onClick: () => handleToggle(item.title),
                    children: excluded.includes(item.title) ? "恢复" : "排除"
                  },
                  "toggle"
                )
              ],
              children: /* @__PURE__ */ jsx(
                List.Item.Meta,
                {
                  title: /* @__PURE__ */ jsxs(Space, { children: [
                    /* @__PURE__ */ jsx(Text$a, { strong: true, children: item.title }),
                    excluded.includes(item.title) && /* @__PURE__ */ jsx(Tag, { color: "error", children: "已排除" })
                  ] }),
                  description: /* @__PURE__ */ jsxs(Fragment, { children: [
                    item.author && /* @__PURE__ */ jsxs(Text$a, { type: "secondary", children: [
                      "作者: ",
                      item.author
                    ] }),
                    item.date && /* @__PURE__ */ jsxs(Text$a, { type: "secondary", children: [
                      " 日期: ",
                      item.date
                    ] }),
                    /* @__PURE__ */ jsx(
                      Paragraph,
                      {
                        ellipsis: { rows: 3 },
                        style: { marginTop: 8, marginBottom: 0 },
                        children: item.content
                      }
                    )
                  ] })
                }
              )
            }
          )
        }
      )
    }
  );
};
const { Title: Title$8, Text: Text$9 } = Typography;
const CollectPage = () => {
  const {
    sources,
    loading: sourcesLoading,
    createSource,
    updateSource,
    deleteSource
  } = useCollectSources();
  const {
    createTask,
    fetchSelectedContent,
    confirmImport
  } = useCollectTasks();
  const [showSourceModal, setShowSourceModal] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState(null);
  const [currentTask, setCurrentTask] = React.useState(null);
  const [selectedTitles, setSelectedTitles] = React.useState([]);
  const [fetchedContents, setFetchedContents] = React.useState([]);
  const [step, setStep] = React.useState("list");
  const handleCreateSource = () => {
    setEditingSource(null);
    setShowSourceModal(true);
  };
  const handleEditSource = (source) => {
    setEditingSource(source);
    setShowSourceModal(true);
  };
  const handleSaveSource = async (data) => {
    if (editingSource) {
      await updateSource(editingSource.id, data);
    } else {
      await createSource(data);
    }
    setShowSourceModal(false);
  };
  const handleStartCollect = async (sourceId) => {
    const task = await createTask(sourceId);
    setCurrentTask(task);
    setStep("select");
  };
  const handleFetchContent = async () => {
    const contents = await fetchSelectedContent(currentTask.id, selectedTitles);
    setFetchedContents(contents);
    setStep("preview");
  };
  const handleConfirmImport = async (confirmedContents) => {
    await confirmImport(currentTask.id, confirmedContents);
    setStep("list");
    setCurrentTask(null);
    setSelectedTitles([]);
    setFetchedContents([]);
  };
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$8, { level: 3, children: "采集管理" }),
      /* @__PURE__ */ jsx(Text$9, { type: "secondary", children: "定向采集内容" })
    ] }),
    step === "list" && /* @__PURE__ */ jsx(
      Card,
      {
        title: "采集源列表",
        extra: /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleCreateSource, children: "创建采集源" }),
        children: /* @__PURE__ */ jsx(
          List,
          {
            loading: sourcesLoading,
            dataSource: sources,
            renderItem: (source) => /* @__PURE__ */ jsx(
              List.Item,
              {
                actions: [
                  /* @__PURE__ */ jsx(Button, { onClick: () => handleEditSource(source), children: "编辑" }, "edit"),
                  /* @__PURE__ */ jsx(Button, { type: "primary", onClick: () => handleStartCollect(source.id), children: "开始采集" }, "collect"),
                  /* @__PURE__ */ jsx(Button, { danger: true, onClick: () => deleteSource(source.id), children: "删除" }, "delete")
                ],
                children: /* @__PURE__ */ jsx(
                  List.Item.Meta,
                  {
                    title: /* @__PURE__ */ jsxs(Space, { children: [
                      /* @__PURE__ */ jsx(Text$9, { strong: true, children: source.name }),
                      /* @__PURE__ */ jsx(Tag, { color: source.type === "template" ? "success" : "warning", children: source.type === "template" ? "模板" : "自定义" }),
                      /* @__PURE__ */ jsx(Tag, { color: source.isActive ? "success" : "error", children: source.isActive ? "启用" : "禁用" })
                    ] }),
                    description: /* @__PURE__ */ jsx(Text$9, { type: "secondary", children: source.url })
                  }
                )
              }
            )
          }
        )
      }
    ),
    step === "select" && currentTask && /* @__PURE__ */ jsx(
      TitleSelector,
      {
        titles: currentTask.titles || [],
        onSelectionChange: setSelectedTitles,
        onFetchContent: handleFetchContent
      }
    ),
    step === "preview" && /* @__PURE__ */ jsx(
      ContentPreview,
      {
        contents: fetchedContents,
        onConfirm: handleConfirmImport,
        onCancel: () => setStep("select")
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showSourceModal,
        title: editingSource ? "编辑采集源" : "创建采集源",
        onCancel: () => setShowSourceModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsx(
          SourceConfig,
          {
            source: editingSource,
            onSave: handleSaveSource,
            onCancel: () => setShowSourceModal(false)
          }
        )
      }
    )
  ] });
};
const API_BASE$5 = "/api/zhao-studio/v1/admin/ai";
const useAIConfig = () => {
  const [config, setConfig] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$5}/config`);
      const json = await res.json();
      setConfig(json.data || null);
    } catch (err) {
      console.error("fetchConfig error:", err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);
  const updateConfig = async (data) => {
    const res = await fetch(`${API_BASE$5}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("保存失败");
    await fetchConfig();
  };
  const testConfig = async (data) => {
    const res = await fetch(`${API_BASE$5}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: data.provider,
        apiKey: data.apiKey,
        endpoint: data.endpoint || data.apiBase
      })
    });
    if (!res.ok) throw new Error("测试失败");
    return res.json();
  };
  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  return { config, loading, updateConfig, testConfig };
};
const AIConfigForm = ({ config, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const { testConfig } = useAIConfig();
  React.useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    } else {
      form.resetFields();
    }
  }, [config, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      await testConfig(values);
      message.success("配置测试成功");
    } catch {
      message.error("配置测试失败");
    }
  };
  return /* @__PURE__ */ jsxs(Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsx(Form.Item, { name: "provider", label: "AI 服务商", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Select, { options: [
      { value: "openai", label: "OpenAI" },
      { value: "azure", label: "Azure OpenAI" },
      { value: "claude", label: "Anthropic Claude" },
      { value: "qwen", label: "阿里通义千问" },
      { value: "wenxin", label: "百度文心一言" },
      { value: "zhipu", label: "智谱 GLM" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "apiKey", label: "API Key", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input.Password, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "apiBase", label: "API Base URL", children: /* @__PURE__ */ jsx(Input, { placeholder: "留空使用默认" }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "model", label: "模型名称", children: /* @__PURE__ */ jsx(Input, { placeholder: "gpt-4, gpt-3.5-turbo 等" }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "temperature", label: "温度参数", initialValue: 0.7, children: /* @__PURE__ */ jsx(Select, { options: [
      { value: 0, label: "0 (精确)" },
      { value: 0.3, label: "0.3 (低)" },
      { value: 0.7, label: "0.7 (中)" },
      { value: 1, label: "1.0 (高)" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "maxTokens", label: "最大 Token 数", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsx(Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsx(Switch, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsxs(Space, { children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsx(Button, { onClick: handleTest, children: "测试配置" }),
      /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$7, Text: Text$8 } = Typography;
const AIConfigPage = () => {
  const { config, loading, updateConfig } = useAIConfig();
  if (loading && !config) {
    return /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 100 }, children: /* @__PURE__ */ jsx(Spin, {}) });
  }
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$7, { level: 3, children: "AI 配置" }),
      /* @__PURE__ */ jsx(Text$8, { type: "secondary", children: "配置 AI 服务商参数" })
    ] }),
    /* @__PURE__ */ jsx(Card, { title: "配置详情", children: /* @__PURE__ */ jsx(
      AIConfigForm,
      {
        config,
        onSave: async (data) => {
          try {
            await updateConfig(data);
            message.success("保存成功");
          } catch {
            message.error("保存失败");
          }
        },
        onCancel: () => message.info("已取消")
      }
    ) })
  ] });
};
const normalizeRecord = (record) => {
  if (!record) {
    return {};
  }
  return { ...record, id: record.documentId || record.id || "" };
};
const normalizeList = (list = []) => list.map(normalizeRecord);
const usePublishRecords = (params) => {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.platformId) query.set("platformId", params.platformId);
      if (params?.accountId) query.set("accountId", params.accountId);
      const url = `/api/zhao-studio/v1/admin/records${query.toString() ? "?" + query : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      const list = json.data || [];
      const normalized = list.map((r) => {
        const normalized2 = normalizeRecord(r);
        return {
          ...normalized2,
          platformName: r.platformName || r.platform?.name || "-",
          errorMessage: r.errorMessage || r.error || ""
        };
      });
      setRecords(normalized);
    } catch (err) {
      console.error("fetchRecords error:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [params?.platformId, params?.accountId]);
  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  return { records, loading, refetch: fetchRecords };
};
const { Text: Text$7 } = Typography;
const PublishRecordList = ({ platformId, accountId }) => {
  const { records, loading } = usePublishRecords({ platformId, accountId });
  const columns = [
    { title: "标题", dataIndex: "title", key: "title" },
    {
      title: "平台",
      dataIndex: "platformName",
      key: "platformName"
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          pending: "default",
          publishing: "processing",
          success: "success",
          failed: "error"
        };
        const labelMap = {
          pending: "待发布",
          publishing: "发布中",
          success: "成功",
          failed: "失败"
        };
        return /* @__PURE__ */ jsx(Tag, { color: colorMap[status] || "default", children: labelMap[status] || status });
      }
    },
    { title: "发布时间", dataIndex: "publishedAt", key: "publishedAt" },
    {
      title: "错误信息",
      dataIndex: "errorMessage",
      key: "errorMessage",
      render: (msg) => msg ? /* @__PURE__ */ jsx(Text$7, { type: "danger", children: msg }) : "-"
    }
  ];
  return /* @__PURE__ */ jsx(
    Table,
    {
      columns,
      dataSource: records,
      rowKey: "id",
      loading,
      pagination: { pageSize: 10 }
    }
  );
};
const API_BASE$4 = "/api/zhao-studio/v1/admin";
const usePublishPlatforms = () => {
  const [platforms, setPlatforms] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const fetchPlatforms = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$4}/platforms`);
      const json = await res.json();
      setPlatforms(normalizeList(json.data || []));
    } catch (err) {
      console.error("fetchPlatforms error:", err);
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const createPlatform = async (data) => {
    const res = await fetch(`${API_BASE$4}/platforms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("创建失败");
    await fetchPlatforms();
  };
  const updatePlatform = async (id, data) => {
    const res = await fetch(`${API_BASE$4}/platforms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("更新失败");
    await fetchPlatforms();
  };
  const deletePlatform = async (id) => {
    const res = await fetch(`${API_BASE$4}/platforms/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("删除失败");
    await fetchPlatforms();
  };
  React.useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);
  return { platforms, loading, createPlatform, updatePlatform, deletePlatform };
};
const API_BASE$3 = "/api/zhao-studio/v1/admin";
const usePublishAccounts = () => {
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const fetchAccounts = React.useCallback(async (platformId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$3}/accounts`);
      const json = await res.json();
      let list = normalizeList(json.data || []);
      if (platformId) {
        list = list.filter(
          (a) => a.platformId === platformId || a.platform?.documentId === platformId
        );
      }
      setAccounts(list);
    } catch (err) {
      console.error("fetchAccounts error:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const createAccount = async (data) => {
    const res = await fetch(`${API_BASE$3}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("创建失败");
    await fetchAccounts();
  };
  const updateAccount = async (id, data) => {
    const res = await fetch(`${API_BASE$3}/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("更新失败");
    await fetchAccounts();
  };
  const deleteAccount = async (id) => {
    const res = await fetch(`${API_BASE$3}/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("删除失败");
    await fetchAccounts();
  };
  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
};
const API_BASE$2 = "/api/zhao-studio/v1/admin";
const usePublishActions = () => {
  const [loading, setLoading] = React.useState(false);
  const publish = async ({ articleIds, platformId, accountId }) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        articleIds.map(
          (articleId) => fetch(`${API_BASE$2}/articles/${articleId}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platformId, accountId })
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 篇文章发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };
  const publishArticle = async (articleId, accountIds) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        accountIds.map(
          (accountId) => fetch(`${API_BASE$2}/articles/${articleId}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId })
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 个账号发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };
  return { publish, publishArticle, loading };
};
const PublishPanel = ({ articleIds }) => {
  const { platforms } = usePublishPlatforms();
  const { accounts, fetchAccounts } = usePublishAccounts();
  const { publish, loading } = usePublishActions();
  const [selectedPlatform, setSelectedPlatform] = React.useState();
  const [selectedAccount, setSelectedAccount] = React.useState();
  React.useEffect(() => {
    if (selectedPlatform) {
      fetchAccounts(selectedPlatform);
    }
  }, [selectedPlatform, fetchAccounts]);
  const handlePublish = async () => {
    if (!selectedPlatform || !selectedAccount) {
      message.warning("请选择平台和账号");
      return;
    }
    if (articleIds.length === 0) {
      message.warning("请选择要发布的文章");
      return;
    }
    try {
      await publish({
        articleIds,
        platformId: selectedPlatform,
        accountId: selectedAccount
      });
      message.success("发布任务已创建");
    } catch (err) {
      message.error("发布失败");
    }
  };
  return /* @__PURE__ */ jsx(
    Tabs,
    {
      items: [
        {
          key: "publish",
          label: "发布",
          children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "middle", style: { width: "100%" }, children: [
            /* @__PURE__ */ jsx(
              Select,
              {
                placeholder: "选择平台",
                style: { width: "100%" },
                value: selectedPlatform,
                onChange: (v) => {
                  setSelectedPlatform(v);
                  setSelectedAccount(void 0);
                },
                options: platforms.map((p) => ({ value: p.id, label: p.name }))
              }
            ),
            /* @__PURE__ */ jsx(
              Select,
              {
                placeholder: "选择账号",
                style: { width: "100%" },
                value: selectedAccount,
                onChange: setSelectedAccount,
                options: accounts.map((a) => ({ value: a.id, label: a.name })),
                disabled: !selectedPlatform
              }
            ),
            /* @__PURE__ */ jsxs(
              Button,
              {
                type: "primary",
                onClick: handlePublish,
                loading,
                disabled: articleIds.length === 0,
                children: [
                  "发布选中文章（",
                  articleIds.length,
                  "）"
                ]
              }
            )
          ] }) })
        },
        {
          key: "records",
          label: "发布记录",
          children: /* @__PURE__ */ jsx(PublishRecordList, {})
        }
      ]
    }
  );
};
const { Title: Title$6, Text: Text$6 } = Typography;
const PublishPage = () => {
  const [selectedArticleIds, setSelectedArticleIds] = React.useState([]);
  const [articles, setArticles] = React.useState([]);
  React.useEffect(() => {
    setArticles([]);
  }, []);
  const columns = [
    {
      title: "选择",
      key: "select",
      render: (_, record) => ({
        children: /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: selectedArticleIds.includes(record.id),
            onChange: (e) => {
              setSelectedArticleIds(
                (prev) => e.target.checked ? [...prev, record.id] : prev.filter((id) => id !== record.id)
              );
            }
          }
        )
      })
    },
    { title: "标题", dataIndex: "title", key: "title" },
    { title: "状态", dataIndex: "status", key: "status" },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt" }
  ];
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$6, { level: 3, children: "内容发布" }),
      /* @__PURE__ */ jsx(Text$6, { type: "secondary", children: "多渠道内容分发" })
    ] }),
    /* @__PURE__ */ jsx(Card, { title: "待发布文章", children: /* @__PURE__ */ jsx(
      Table,
      {
        columns,
        dataSource: articles,
        rowKey: "id",
        pagination: { pageSize: 10 },
        locale: { emptyText: "暂无待发布文章" }
      }
    ) }),
    selectedArticleIds.length > 0 && /* @__PURE__ */ jsx(Card, { title: "发布操作", children: /* @__PURE__ */ jsx(PublishPanel, { articleIds: selectedArticleIds }) })
  ] });
};
const PlatformForm = ({ platform, onSave, onCancel }) => {
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (platform) {
      form.setFieldsValue(platform);
    } else {
      form.resetFields();
    }
  }, [platform, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxs(Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsx(Form.Item, { name: "name", label: "平台名称", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "type", label: "平台类型", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Select, { options: [
      { value: "wechat", label: "微信公众号" },
      { value: "toutiao", label: "今日头条" },
      { value: "douyin", label: "抖音" },
      { value: "xhs", label: "小红书" },
      { value: "web", label: "网站" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "appId", label: "AppID", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "appSecret", label: "AppSecret", children: /* @__PURE__ */ jsx(Input.Password, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "callbackUrl", label: "回调URL", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsx(Switch, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsxs(Space, { children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$5, Text: Text$5 } = Typography;
const PlatformConfigPage = () => {
  const { platforms, loading, createPlatform, updatePlatform, deletePlatform } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "类型", dataIndex: "type", key: "type" },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => /* @__PURE__ */ jsx(Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsx(
          Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deletePlatform(record.documentId || record.id);
                message.success("删除成功");
              } catch {
                message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsx(Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$5, { level: 3, children: "平台配置" }),
      /* @__PURE__ */ jsx(Text$5, { type: "secondary", children: "管理发布平台" })
    ] }),
    /* @__PURE__ */ jsx(
      Card,
      {
        title: "平台列表",
        extra: /* @__PURE__ */ jsx(Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增平台" }),
        children: /* @__PURE__ */ jsx(Table, { columns, dataSource: platforms, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showModal,
        title: editing ? "编辑平台" : "新增平台",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsx(
          PlatformForm,
          {
            platform: editing,
            onSave: async (data) => {
              try {
                if (editing) {
                  await updatePlatform(editing.documentId || editing.id, data);
                } else {
                  await createPlatform(data);
                }
                message.success("保存成功");
                setShowModal(false);
              } catch {
                message.error("保存失败");
              }
            },
            onCancel: () => setShowModal(false)
          }
        )
      }
    )
  ] });
};
const AccountForm = ({ account, platforms = [], onSave, onCancel }) => {
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (account) {
      form.setFieldsValue(account);
    } else {
      form.resetFields();
    }
  }, [account, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxs(Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsx(Form.Item, { name: "name", label: "账号名称", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "platformId", label: "所属平台", rules: [{ required: true }], children: /* @__PURE__ */ jsx(
      Select,
      {
        options: platforms.map((p) => ({ value: p.documentId || p.id, label: p.name })),
        placeholder: "选择平台"
      }
    ) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "accountId", label: "平台账号ID", children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "accessToken", label: "Access Token", children: /* @__PURE__ */ jsx(Input.Password, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "refreshToken", label: "Refresh Token", children: /* @__PURE__ */ jsx(Input.Password, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsx(Switch, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsxs(Space, { children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$4, Text: Text$4 } = Typography;
const AccountConfigPage = () => {
  const { accounts, loading, createAccount, updateAccount, deleteAccount } = usePublishAccounts();
  const { platforms } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    {
      title: "平台",
      dataIndex: "platformName",
      key: "platformName",
      render: (v) => v || "-"
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => /* @__PURE__ */ jsx(Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsx(
          Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deleteAccount(record.documentId || record.id);
                message.success("删除成功");
              } catch {
                message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsx(Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$4, { level: 3, children: "账号配置" }),
      /* @__PURE__ */ jsx(Text$4, { type: "secondary", children: "管理各平台的发布账号" })
    ] }),
    /* @__PURE__ */ jsx(
      Card,
      {
        title: "账号列表",
        extra: /* @__PURE__ */ jsx(Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增账号" }),
        children: /* @__PURE__ */ jsx(Table, { columns, dataSource: accounts, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showModal,
        title: editing ? "编辑账号" : "新增账号",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsx(
          AccountForm,
          {
            account: editing,
            platforms,
            onSave: async (data) => {
              try {
                if (editing) {
                  await updateAccount(editing.documentId || editing.id, data);
                } else {
                  await createAccount(data);
                }
                message.success("保存成功");
                setShowModal(false);
              } catch {
                message.error("保存失败");
              }
            },
            onCancel: () => setShowModal(false)
          }
        )
      }
    )
  ] });
};
const POSITION_TO_BACKEND = {
  header: "header",
  footer: "footer",
  sidebar: "sidebar",
  inarticle: "article-content"
};
const POSITION_TO_FRONTEND = {
  header: "header",
  footer: "footer",
  sidebar: "sidebar",
  "article-content": "inarticle",
  "list-page": "sidebar",
  "home-page": "header"
};
const TYPE_TO_BACKEND = {
  image: "banner",
  text: "native",
  video: "popup"
};
const TYPE_TO_FRONTEND = {
  banner: "image",
  native: "text",
  popup: "video",
  "product-link": "image"
};
const API_BASE$1 = "/api/zhao-studio/v1/admin/ad-slots";
const normalizeSlot = (slot) => {
  const normalized = normalizeRecord(slot);
  return {
    ...normalized,
    adCode: slot.code || slot.adCode || "",
    position: POSITION_TO_FRONTEND[slot.position] || slot.position,
    type: TYPE_TO_FRONTEND[slot.type] || slot.type || "image"
  };
};
const mapToBackend = (data) => {
  const { adCode, position, type, ...rest } = data;
  return {
    ...rest,
    code: adCode,
    position: POSITION_TO_BACKEND[position] || position,
    type: TYPE_TO_BACKEND[type] || type
  };
};
const useAdSlots = () => {
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const fetchSlots = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE$1);
      const json = await res.json();
      const list = (json.data || []).map(normalizeSlot);
      setSlots(list);
    } catch (err) {
      console.error("fetchSlots error:", err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const createSlot = async (data) => {
    const res = await fetch(API_BASE$1, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapToBackend(data))
    });
    if (!res.ok) throw new Error("创建失败");
    await fetchSlots();
  };
  const updateSlot = async (id, data) => {
    const res = await fetch(`${API_BASE$1}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapToBackend(data))
    });
    if (!res.ok) throw new Error("更新失败");
    await fetchSlots();
  };
  const deleteSlot = async (id) => {
    const res = await fetch(`${API_BASE$1}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("删除失败");
    await fetchSlots();
  };
  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);
  return { slots, loading, createSlot, updateSlot, deleteSlot };
};
const AdSlotForm = ({ slot, onSave, onCancel }) => {
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (slot) {
      form.setFieldsValue(slot);
    } else {
      form.resetFields();
    }
  }, [slot, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxs(Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsx(Form.Item, { name: "name", label: "广告位名称", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Input, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "position", label: "广告位置", rules: [{ required: true }], children: /* @__PURE__ */ jsx(Select, { options: [
      { value: "header", label: "顶部" },
      { value: "footer", label: "底部" },
      { value: "sidebar", label: "侧边栏" },
      { value: "inarticle", label: "文章内嵌" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "type", label: "广告类型", children: /* @__PURE__ */ jsx(Select, { options: [
      { value: "image", label: "图片" },
      { value: "text", label: "文字" },
      { value: "video", label: "视频" }
    ] }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "width", label: "宽度", children: /* @__PURE__ */ jsx(InputNumber, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "height", label: "高度", children: /* @__PURE__ */ jsx(InputNumber, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "adCode", label: "广告代码", children: /* @__PURE__ */ jsx(Input.TextArea, { rows: 4 }) }),
    /* @__PURE__ */ jsx(Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsx(Switch, {}) }),
    /* @__PURE__ */ jsx(Form.Item, { children: /* @__PURE__ */ jsxs(Space, { children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsx(Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$3, Text: Text$3 } = Typography;
const AdSlotConfigPage = () => {
  const { slots, loading, createSlot, updateSlot, deleteSlot } = useAdSlots();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "位置", dataIndex: "position", key: "position" },
    { title: "类型", dataIndex: "type", key: "type" },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => /* @__PURE__ */ jsx(Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsx(
          Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deleteSlot(record.documentId || record.id);
                message.success("删除成功");
              } catch {
                message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsx(Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$3, { level: 3, children: "广告位配置" }),
      /* @__PURE__ */ jsx(Text$3, { type: "secondary", children: "管理广告位" })
    ] }),
    /* @__PURE__ */ jsx(
      Card,
      {
        title: "广告位列表",
        extra: /* @__PURE__ */ jsx(Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增广告位" }),
        children: /* @__PURE__ */ jsx(Table, { columns, dataSource: slots, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showModal,
        title: editing ? "编辑广告位" : "新增广告位",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsx(
          AdSlotForm,
          {
            slot: editing,
            onSave: async (data) => {
              try {
                if (editing) {
                  await updateSlot(editing.documentId || editing.id, data);
                } else {
                  await createSlot(data);
                }
                message.success("保存成功");
                setShowModal(false);
              } catch {
                message.error("保存失败");
              }
            },
            onCancel: () => setShowModal(false)
          }
        )
      }
    )
  ] });
};
const StatsChart = ({
  data,
  type = "line",
  height = 300,
  loading = false,
  title
}) => {
  const option = {
    title: title ? { text: title } : void 0,
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date)
    },
    yAxis: { type: "value" },
    series: [
      {
        data: data.map((d) => d.value),
        type,
        smooth: type === "line",
        itemStyle: { color: "#1677ff" }
      }
    ],
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true }
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx(Spin, {}) });
  }
  return /* @__PURE__ */ jsx(ReactECharts, { option, style: { height } });
};
const StatsTable = ({ data, loading = false }) => {
  const columns = [
    { title: "指标", dataIndex: "name", key: "name" },
    {
      title: "数值",
      dataIndex: "value",
      key: "value",
      render: (value, record) => `${value.toLocaleString()}${record.unit ? " " + record.unit : ""}`
    },
    {
      title: "变化",
      dataIndex: "change",
      key: "change",
      render: (change) => {
        if (change === void 0 || change === 0) return /* @__PURE__ */ jsx(Tag, { children: "持平" });
        return change > 0 ? /* @__PURE__ */ jsxs(Tag, { color: "success", children: [
          "↑ ",
          change,
          "%"
        ] }) : /* @__PURE__ */ jsxs(Tag, { color: "error", children: [
          "↓ ",
          Math.abs(change),
          "%"
        ] });
      }
    }
  ];
  return /* @__PURE__ */ jsx(
    Table,
    {
      columns,
      dataSource: data,
      loading,
      pagination: false,
      rowKey: "key"
    }
  );
};
const API_BASE = "/api/zhao-studio/v1/admin/stats";
const STAT_NAMES = {
  totalArticles: "总文章数",
  totalViews: "总浏览量",
  totalPublishes: "总发布数",
  totalRevenue: "总收入",
  totalUsers: "总用户数",
  totalAdClicks: "广告点击数",
  avgReadTime: "平均阅读时长",
  totalPageViews: "页面浏览量"
};
const useStats = ({ type }) => {
  const [stats, setStats] = React.useState([]);
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const endpoints = type === "basic" ? ["/overview"] : type === "advanced" ? ["/overview", "/articles"] : ["/overview", "/articles", "/ad-slots", "/devices"];
        const responses = await Promise.all(
          endpoints.map(
            (e) => fetch(`${API_BASE}${e}`).then((r) => r.json()).catch(() => ({ data: {} }))
          )
        );
        const allStats = [];
        responses.forEach((json, i) => {
          const data = json.data || {};
          if (i === 0) {
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === "number" || typeof value === "string") {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  allStats.push({
                    key,
                    name: STAT_NAMES[key] || key,
                    value: numValue
                  });
                }
              }
            });
          } else if (Array.isArray(data)) {
            data.forEach((item) => {
              allStats.push({
                key: item.id || item.documentId || item.name || Math.random().toString(),
                name: item.name || item.title || item.platformName || "未命名",
                value: Number(item.value || item.count || item.views || 0),
                unit: item.unit
              });
            });
          }
        });
        setStats(allStats);
        const overview = responses[0]?.data || {};
        const chart = overview.timeSeries || overview.daily || overview.timeline || [];
        if (Array.isArray(chart)) {
          setChartData(
            chart.map((d) => ({
              date: d.date || d.time || d.dateKey || "",
              value: Number(d.value || d.count || d.views || 0)
            }))
          );
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error("useStats fetchAll error:", err);
        setStats([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [type]);
  return { stats, chartData, loading };
};
const { Title: Title$2, Text: Text$2 } = Typography;
const { RangePicker: RangePicker$2 } = DatePicker;
const StatsBasicPage = () => {
  const { stats, chartData, loading } = useStats({ type: "basic" });
  const [dateRange, setDateRange] = React.useState();
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$2, { level: 3, children: "基础统计" }),
      /* @__PURE__ */ jsx(Text$2, { type: "secondary", children: "文章浏览量、发布量等基础指标" })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsx(Text$2, { children: "时间范围：" }),
        /* @__PURE__ */ jsx(RangePicker$2, { onChange: setDateRange })
      ] }),
      /* @__PURE__ */ jsxs(Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsx(Col, { xs: 24, lg: 12, children: /* @__PURE__ */ jsx(Card, { title: "趋势图", size: "small", children: /* @__PURE__ */ jsx(StatsChart, { data: chartData || [], type: "line", loading }) }) }),
        /* @__PURE__ */ jsx(Col, { xs: 24, lg: 12, children: /* @__PURE__ */ jsx(Card, { title: "指标明细", size: "small", children: /* @__PURE__ */ jsx(StatsTable, { data: stats || [], loading }) }) })
      ] })
    ] })
  ] });
};
const { Title: Title$1, Text: Text$1 } = Typography;
const { RangePicker: RangePicker$1 } = DatePicker;
const StatsAdvancedPage = () => {
  const { stats, chartData, loading } = useStats({ type: "advanced" });
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title$1, { level: 3, children: "高级统计" }),
      /* @__PURE__ */ jsx(Text$1, { type: "secondary", children: "多维度数据分析" })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsx(Text$1, { children: "时间范围：" }),
        /* @__PURE__ */ jsx(RangePicker$1, {})
      ] }),
      /* @__PURE__ */ jsx(
        Tabs,
        {
          items: [
            {
              key: "overview",
              label: "总览",
              children: /* @__PURE__ */ jsxs(Row, { gutter: [16, 16], children: [
                /* @__PURE__ */ jsx(Col, { xs: 24, lg: 14, children: /* @__PURE__ */ jsx(Card, { title: "趋势", size: "small", children: /* @__PURE__ */ jsx(StatsChart, { data: chartData || [], type: "line", loading, height: 350 }) }) }),
                /* @__PURE__ */ jsx(Col, { xs: 24, lg: 10, children: /* @__PURE__ */ jsx(Card, { title: "明细", size: "small", children: /* @__PURE__ */ jsx(StatsTable, { data: stats || [], loading }) }) })
              ] })
            },
            {
              key: "comparison",
              label: "对比分析",
              children: /* @__PURE__ */ jsx(Card, { title: "对比图表", size: "small", children: /* @__PURE__ */ jsx(StatsChart, { data: chartData || [], type: "bar", loading, height: 350 }) })
            }
          ]
        }
      )
    ] })
  ] });
};
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const StatsProPage = () => {
  const { stats, chartData, loading } = useStats({ type: "pro" });
  const [chartType, setChartType] = React.useState("line");
  return /* @__PURE__ */ jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Title, { level: 3, children: "专业统计" }),
      /* @__PURE__ */ jsx(Text, { type: "secondary", children: "完整业务数据分析" })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsx(Text, { children: "时间范围：" }),
        /* @__PURE__ */ jsx(RangePicker, {}),
        /* @__PURE__ */ jsx(Text, { children: "图表类型：" }),
        /* @__PURE__ */ jsx(
          Select,
          {
            value: chartType,
            onChange: setChartType,
            style: { width: 120 },
            options: [
              { value: "line", label: "折线图" },
              { value: "bar", label: "柱状图" }
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsx(Col, { xs: 24, children: /* @__PURE__ */ jsx(Card, { title: "主图表", size: "small", children: /* @__PURE__ */ jsx(StatsChart, { data: chartData || [], type: chartType, loading, height: 400 }) }) }),
        /* @__PURE__ */ jsx(Col, { xs: 24, children: /* @__PURE__ */ jsx(Card, { title: "完整明细", size: "small", children: /* @__PURE__ */ jsx(StatsTable, { data: stats || [], loading }) }) })
      ] })
    ] })
  ] });
};
const App = () => /* @__PURE__ */ jsx(ConfigProvider, { prefixCls: "zs", iconPrefixCls: "zs-icon", locale: zhCN, children: /* @__PURE__ */ jsx(PluginLayout, { children: /* @__PURE__ */ jsxs(Routes, { children: [
  /* @__PURE__ */ jsx(Route, { path: "/", element: /* @__PURE__ */ jsx(HomePage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/collect", element: /* @__PURE__ */ jsx(CollectPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/ai-config", element: /* @__PURE__ */ jsx(AIConfigPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/publish", element: /* @__PURE__ */ jsx(PublishPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/platforms", element: /* @__PURE__ */ jsx(PlatformConfigPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/accounts", element: /* @__PURE__ */ jsx(AccountConfigPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/ad-slots", element: /* @__PURE__ */ jsx(AdSlotConfigPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/stats/basic", element: /* @__PURE__ */ jsx(StatsBasicPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/stats/advanced", element: /* @__PURE__ */ jsx(StatsAdvancedPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "/stats/pro", element: /* @__PURE__ */ jsx(StatsProPage, {}) }),
  /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx("div", { children: "404" }) })
] }) }) });
export {
  App as default
};
