"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const antd = require("antd");
const zhCN = require("antd/locale/zh_CN");
const reactRouterDom = require("react-router-dom");
const icons = require("@ant-design/icons");
const React = require("react");
const ReactECharts = require("echarts-for-react");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const zhCN__default = /* @__PURE__ */ _interopDefault(zhCN);
const React__default = /* @__PURE__ */ _interopDefault(React);
const ReactECharts__default = /* @__PURE__ */ _interopDefault(ReactECharts);
const { Sider, Content } = antd.Layout;
const menuItems = [
  { key: "", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.HomeOutlined, {}), label: "仪表盘" },
  { key: "collect", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CloudDownloadOutlined, {}), label: "采集管理" },
  { key: "publish", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SendOutlined, {}), label: "内容发布" },
  { key: "stats/basic", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.BarChartOutlined, {}), label: "基础统计" },
  { key: "stats/advanced", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.BarChartOutlined, {}), label: "高级统计" },
  { key: "stats/pro", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.BarChartOutlined, {}), label: "专业统计" },
  { key: "platforms", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SettingOutlined, {}), label: "平台配置" },
  { key: "accounts", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SettingOutlined, {}), label: "账号配置" },
  { key: "ad-slots", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SettingOutlined, {}), label: "广告位配置" },
  { key: "sync-events", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SyncOutlined, {}), label: "同步事件" },
  { key: "ai-config", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.RobotOutlined, {}), label: "AI 配置" }
];
const PluginLayout = ({ children }) => {
  const navigate = reactRouterDom.useNavigate();
  const location = reactRouterDom.useLocation();
  const pathParts = location.pathname.split("/plugins/zhao-studio/")[1] || "";
  const selectedKey = pathParts.split("?")[0];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Layout, { style: { minHeight: "calc(100vh - 64px)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Sider, { width: 200, theme: "light", children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Menu,
      {
        mode: "inline",
        selectedKeys: [selectedKey],
        style: { height: "100%", borderRight: 0 },
        items: menuItems,
        onClick: ({ key }) => navigate(`/plugins/zhao-studio${key ? "/" + key : ""}`)
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(Content, { style: { padding: 24, background: "#f5f5f5" }, children })
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
const { Text: Text$c, Title: Title$c } = antd.Typography;
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
      return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: "持平" });
    }
    if (change > 0) {
      return /* @__PURE__ */ jsxRuntime.jsxs(antd.Tag, { color: "success", children: [
        "↑ ",
        change,
        "%"
      ] });
    }
    return /* @__PURE__ */ jsxRuntime.jsxs(antd.Tag, { color: "error", children: [
      "↓ ",
      Math.abs(change),
      "%"
    ] });
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(Text$c, { type: "secondary", children: title }),
    /* @__PURE__ */ jsxRuntime.jsx(Title$c, { level: 3, style: { marginTop: 8, marginBottom: 8 }, children: formatValue() }),
    getChangeTag()
  ] });
};
const { Title: Title$b, Paragraph: Paragraph$1, Text: Text$b } = antd.Typography;
const HomePage = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$b, { level: 2, children: "内容工作室" }),
      /* @__PURE__ */ jsxRuntime.jsx(Paragraph$1, { type: "secondary", children: "定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$b, { level: 4, children: "今日概览" }),
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "采集文章", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "发布文章", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "总浏览", value: 0, change: 0 }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "广告收入", value: 0, change: 0, unit: "元" }) })
      ] })
    ] })
  ] });
};
const baseUrl$1 = "/api/zhao-studio/v1/admin";
const collectApi = {
  // 采集源管理
  async getSources() {
    const response = await fetch(`${baseUrl$1}/sources`);
    return response.json();
  },
  async createSource(data) {
    const response = await fetch(`${baseUrl$1}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    return response.json();
  },
  async updateSource(id, data) {
    const response = await fetch(`${baseUrl$1}/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    return response.json();
  },
  async deleteSource(id) {
    const response = await fetch(`${baseUrl$1}/sources/${id}`, {
      method: "DELETE"
    });
    return response.json();
  },
  // 采集任务管理
  async createTask(sourceId) {
    const response = await fetch(`${baseUrl$1}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId })
    });
    return response.json();
  },
  async getTasks() {
    const response = await fetch(`${baseUrl$1}/tasks`);
    return response.json();
  },
  async getTask(id) {
    const response = await fetch(`${baseUrl$1}/tasks/${id}`);
    return response.json();
  },
  async fetchSelectedContent(taskId, selectedTitles) {
    const response = await fetch(`${baseUrl$1}/tasks/${taskId}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedTitles })
    });
    return response.json();
  },
  async confirmImport(taskId, confirmedContents) {
    const response = await fetch(`${baseUrl$1}/tasks/${taskId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedContents })
    });
    return response.json();
  }
};
function useCollectSources() {
  const [sources, setSources] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getSources();
      setSources(response || []);
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
      return response;
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
      return response;
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
  React.useEffect(() => {
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
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getTasks();
      setTasks(response || []);
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
      return response;
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
      return response;
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
      return response;
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
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
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
  const [form] = antd.Form.useForm();
  React__default.default.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "name", label: "名称", rules: [{ required: true, message: "请输入名称" }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "url", label: "URL", rules: [{ required: true, message: "请输入URL" }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "type", label: "类型", initialValue: "custom", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: "template", label: "模板" },
      { value: "custom", label: "自定义" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "template", label: "模板", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "titleSelector", label: "标题选择器", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "contentSelector", label: "内容选择器", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "authorSelector", label: "作者选择器", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "dateSelector", label: "日期选择器", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$a } = antd.Typography;
const TitleSelector = ({ titles, onSelectionChange, onFetchContent }) => {
  const [selected, setSelected] = React__default.default.useState([]);
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
  return /* @__PURE__ */ jsxRuntime.jsxs(
    antd.Card,
    {
      title: "选择要采集的标题",
      extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", onClick: handleSelectAll, children: "全选" }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", onClick: handleClear, children: "清空" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.List,
          {
            dataSource: titles,
            renderItem: (title) => /* @__PURE__ */ jsxRuntime.jsx(antd.List.Item, { children: /* @__PURE__ */ jsxRuntime.jsx(
              antd.Checkbox,
              {
                checked: selected.includes(title),
                onChange: () => handleToggle(title),
                children: title
              }
            ) })
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginTop: 16, textAlign: "right" }, children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Button, { type: "primary", onClick: onFetchContent, disabled: selected.length === 0, children: [
          "获取内容（",
          selected.length,
          "）"
        ] }) })
      ]
    }
  );
};
const { Title: Title$9, Paragraph, Text: Text$a } = antd.Typography;
const ContentPreview = ({ contents, onConfirm, onCancel }) => {
  const [excluded, setExcluded] = React__default.default.useState([]);
  const handleToggle = (title) => {
    setExcluded(
      (prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };
  const handleConfirm = () => {
    const confirmed = contents.filter((c) => !excluded.includes(c.title));
    onConfirm(confirmed);
  };
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Card,
    {
      title: "内容预览",
      extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "返回" }),
        /* @__PURE__ */ jsxRuntime.jsxs(antd.Button, { type: "primary", onClick: handleConfirm, children: [
          "确认导入（",
          contents.length - excluded.length,
          "）"
        ] })
      ] }),
      children: /* @__PURE__ */ jsxRuntime.jsx(
        antd.List,
        {
          dataSource: contents,
          renderItem: (item) => /* @__PURE__ */ jsxRuntime.jsx(
            antd.List.Item,
            {
              actions: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  antd.Button,
                  {
                    size: "small",
                    onClick: () => handleToggle(item.title),
                    children: excluded.includes(item.title) ? "恢复" : "排除"
                  },
                  "toggle"
                )
              ],
              children: /* @__PURE__ */ jsxRuntime.jsx(
                antd.List.Item.Meta,
                {
                  title: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
                    /* @__PURE__ */ jsxRuntime.jsx(Text$a, { strong: true, children: item.title }),
                    excluded.includes(item.title) && /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: "error", children: "已排除" })
                  ] }),
                  description: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                    item.author && /* @__PURE__ */ jsxRuntime.jsxs(Text$a, { type: "secondary", children: [
                      "作者: ",
                      item.author
                    ] }),
                    item.date && /* @__PURE__ */ jsxRuntime.jsxs(Text$a, { type: "secondary", children: [
                      " 日期: ",
                      item.date
                    ] }),
                    /* @__PURE__ */ jsxRuntime.jsx(
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
const { Title: Title$8, Text: Text$9 } = antd.Typography;
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
  const [showSourceModal, setShowSourceModal] = React__default.default.useState(false);
  const [editingSource, setEditingSource] = React__default.default.useState(null);
  const [currentTask, setCurrentTask] = React__default.default.useState(null);
  const [selectedTitles, setSelectedTitles] = React__default.default.useState([]);
  const [fetchedContents, setFetchedContents] = React__default.default.useState([]);
  const [step, setStep] = React__default.default.useState("list");
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
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$8, { level: 3, children: "采集管理" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$9, { type: "secondary", children: "定向采集内容" })
    ] }),
    step === "list" && /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "采集源列表",
        extra: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleCreateSource, children: "创建采集源" }),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.List,
          {
            loading: sourcesLoading,
            dataSource: sources,
            renderItem: (source) => /* @__PURE__ */ jsxRuntime.jsx(
              antd.List.Item,
              {
                actions: [
                  /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: () => handleEditSource(source), children: "编辑" }, "edit"),
                  /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => handleStartCollect(source.id), children: "开始采集" }, "collect"),
                  /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { danger: true, onClick: () => deleteSource(source.id), children: "删除" }, "delete")
                ],
                children: /* @__PURE__ */ jsxRuntime.jsx(
                  antd.List.Item.Meta,
                  {
                    title: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
                      /* @__PURE__ */ jsxRuntime.jsx(Text$9, { strong: true, children: source.name }),
                      /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: source.type === "template" ? "success" : "warning", children: source.type === "template" ? "模板" : "自定义" }),
                      /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: source.isActive ? "success" : "error", children: source.isActive ? "启用" : "禁用" })
                    ] }),
                    description: /* @__PURE__ */ jsxRuntime.jsx(Text$9, { type: "secondary", children: source.url })
                  }
                )
              }
            )
          }
        )
      }
    ),
    step === "select" && currentTask && /* @__PURE__ */ jsxRuntime.jsx(
      TitleSelector,
      {
        titles: currentTask.titles || [],
        onSelectionChange: setSelectedTitles,
        onFetchContent: handleFetchContent
      }
    ),
    step === "preview" && /* @__PURE__ */ jsxRuntime.jsx(
      ContentPreview,
      {
        contents: fetchedContents,
        onConfirm: handleConfirmImport,
        onCancel: () => setStep("select")
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: showSourceModal,
        title: editingSource ? "编辑采集源" : "创建采集源",
        onCancel: () => setShowSourceModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsxRuntime.jsx(
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
  const [config, setConfig] = React__default.default.useState(null);
  const [loading, setLoading] = React__default.default.useState(false);
  const fetchConfig = React__default.default.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$5}/config`);
      const json = await res.json();
      setConfig(json || null);
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
  React__default.default.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  return { config, loading, updateConfig, testConfig };
};
const AIConfigForm = ({ config, onSave, onCancel }) => {
  const [form] = antd.Form.useForm();
  const { testConfig } = useAIConfig();
  React__default.default.useEffect(() => {
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
      antd.message.success("配置测试成功");
    } catch {
      antd.message.error("配置测试失败");
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "provider", label: "AI 服务商", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: "openai", label: "OpenAI" },
      { value: "azure", label: "Azure OpenAI" },
      { value: "claude", label: "Anthropic Claude" },
      { value: "qwen", label: "阿里通义千问" },
      { value: "wenxin", label: "百度文心一言" },
      { value: "zhipu", label: "智谱 GLM" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "apiKey", label: "API Key", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.Password, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "apiBase", label: "API Base URL", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "留空使用默认" }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "model", label: "模型名称", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "gpt-4, gpt-3.5-turbo 等" }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "temperature", label: "温度参数", initialValue: 0.7, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: 0, label: "0 (精确)" },
      { value: 0.3, label: "0.3 (低)" },
      { value: 0.7, label: "0.7 (中)" },
      { value: 1, label: "1.0 (高)" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "maxTokens", label: "最大 Token 数", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Divider, {}),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: handleTest, children: "测试配置" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$7, Text: Text$8 } = antd.Typography;
const AIConfigPage = () => {
  const { config, loading, updateConfig } = useAIConfig();
  if (loading && !config) {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { textAlign: "center", padding: 100 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Spin, {}) });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$7, { level: 3, children: "AI 配置" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$8, { type: "secondary", children: "配置 AI 服务商参数" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "配置详情", children: /* @__PURE__ */ jsxRuntime.jsx(
      AIConfigForm,
      {
        config,
        onSave: async (data) => {
          try {
            await updateConfig(data);
            antd.message.success("保存成功");
          } catch {
            antd.message.error("保存失败");
          }
        },
        onCancel: () => antd.message.info("已取消")
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
  const [records, setRecords] = React__default.default.useState([]);
  const [loading, setLoading] = React__default.default.useState(false);
  const fetchRecords = React__default.default.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.platformId) query.set("platformId", params.platformId);
      if (params?.accountId) query.set("accountId", params.accountId);
      const url = `/api/zhao-studio/v1/admin/records${query.toString() ? "?" + query : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      const list = json || [];
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
  React__default.default.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  return { records, loading, refetch: fetchRecords };
};
const { Text: Text$7 } = antd.Typography;
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
        return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: colorMap[status] || "default", children: labelMap[status] || status });
      }
    },
    { title: "发布时间", dataIndex: "publishedAt", key: "publishedAt" },
    {
      title: "错误信息",
      dataIndex: "errorMessage",
      key: "errorMessage",
      render: (msg) => msg ? /* @__PURE__ */ jsxRuntime.jsx(Text$7, { type: "danger", children: msg }) : "-"
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Table,
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
  const [platforms, setPlatforms] = React__default.default.useState([]);
  const [loading, setLoading] = React__default.default.useState(false);
  const fetchPlatforms = React__default.default.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$4}/platforms`);
      const json = await res.json();
      setPlatforms(normalizeList(json || []));
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
  React__default.default.useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);
  return { platforms, loading, createPlatform, updatePlatform, deletePlatform };
};
const API_BASE$3 = "/api/zhao-studio/v1/admin";
const usePublishAccounts = () => {
  const [accounts, setAccounts] = React__default.default.useState([]);
  const [loading, setLoading] = React__default.default.useState(false);
  const fetchAccounts = React__default.default.useCallback(async (platformId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE$3}/accounts`);
      const json = await res.json();
      let list = normalizeList(json || []);
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
  React__default.default.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
};
const API_BASE$2 = "/api/zhao-studio/v1/admin";
const usePublishActions = () => {
  const [loading, setLoading] = React__default.default.useState(false);
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
  const [selectedPlatform, setSelectedPlatform] = React__default.default.useState();
  const [selectedAccount, setSelectedAccount] = React__default.default.useState();
  React__default.default.useEffect(() => {
    if (selectedPlatform) {
      fetchAccounts(selectedPlatform);
    }
  }, [selectedPlatform, fetchAccounts]);
  const handlePublish = async () => {
    if (!selectedPlatform || !selectedAccount) {
      antd.message.warning("请选择平台和账号");
      return;
    }
    if (articleIds.length === 0) {
      antd.message.warning("请选择要发布的文章");
      return;
    }
    try {
      await publish({
        articleIds,
        platformId: selectedPlatform,
        accountId: selectedAccount
      });
      antd.message.success("发布任务已创建");
    } catch (err) {
      antd.message.error("发布失败");
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Tabs,
    {
      items: [
        {
          key: "publish",
          label: "发布",
          children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "middle", style: { width: "100%" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
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
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
              {
                placeholder: "选择账号",
                style: { width: "100%" },
                value: selectedAccount,
                onChange: setSelectedAccount,
                options: accounts.map((a) => ({ value: a.id, label: a.name })),
                disabled: !selectedPlatform
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsxs(
              antd.Button,
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
          children: /* @__PURE__ */ jsxRuntime.jsx(PublishRecordList, {})
        }
      ]
    }
  );
};
const { Title: Title$6, Text: Text$6 } = antd.Typography;
const PublishPage = () => {
  const [selectedArticleIds, setSelectedArticleIds] = React__default.default.useState([]);
  const [articles, setArticles] = React__default.default.useState([]);
  React__default.default.useEffect(() => {
    setArticles([]);
  }, []);
  const columns = [
    {
      title: "选择",
      key: "select",
      render: (_, record) => ({
        children: /* @__PURE__ */ jsxRuntime.jsx(
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
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$6, { level: 3, children: "内容发布" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: "多渠道内容分发" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "待发布文章", children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Table,
      {
        columns,
        dataSource: articles,
        rowKey: "id",
        pagination: { pageSize: 10 },
        locale: { emptyText: "暂无待发布文章" }
      }
    ) }),
    selectedArticleIds.length > 0 && /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "发布操作", children: /* @__PURE__ */ jsxRuntime.jsx(PublishPanel, { articleIds: selectedArticleIds }) })
  ] });
};
const PlatformForm = ({ platform, onSave, onCancel }) => {
  const [form] = antd.Form.useForm();
  React__default.default.useEffect(() => {
    if (platform) {
      form.setFieldsValue(platform);
    } else {
      form.resetFields();
    }
  }, [platform, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "name", label: "平台名称", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "type", label: "平台类型", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: "wechat", label: "微信公众号" },
      { value: "toutiao", label: "今日头条" },
      { value: "douyin", label: "抖音" },
      { value: "xhs", label: "小红书" },
      { value: "web", label: "网站" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "appId", label: "AppID", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "appSecret", label: "AppSecret", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.Password, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "callbackUrl", label: "回调URL", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$5, Text: Text$5 } = antd.Typography;
const PlatformConfigPage = () => {
  const { platforms, loading, createPlatform, updatePlatform, deletePlatform } = usePublishPlatforms();
  const [showModal, setShowModal] = React__default.default.useState(false);
  const [editing, setEditing] = React__default.default.useState(null);
  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "类型", dataIndex: "type", key: "type" },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deletePlatform(record.documentId || record.id);
                antd.message.success("删除成功");
              } catch {
                antd.message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$5, { level: 3, children: "平台配置" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$5, { type: "secondary", children: "管理发布平台" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "平台列表",
        extra: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增平台" }),
        children: /* @__PURE__ */ jsxRuntime.jsx(antd.Table, { columns, dataSource: platforms, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: showModal,
        title: editing ? "编辑平台" : "新增平台",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsxRuntime.jsx(
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
                antd.message.success("保存成功");
                setShowModal(false);
              } catch {
                antd.message.error("保存失败");
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
  const [form] = antd.Form.useForm();
  React__default.default.useEffect(() => {
    if (account) {
      form.setFieldsValue(account);
    } else {
      form.resetFields();
    }
  }, [account, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "name", label: "账号名称", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "platformId", label: "所属平台", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Select,
      {
        options: platforms.map((p) => ({ value: p.documentId || p.id, label: p.name })),
        placeholder: "选择平台"
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "accountId", label: "平台账号ID", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "accessToken", label: "Access Token", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.Password, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "refreshToken", label: "Refresh Token", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.Password, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$4, Text: Text$4 } = antd.Typography;
const AccountConfigPage = () => {
  const { accounts, loading, createAccount, updateAccount, deleteAccount } = usePublishAccounts();
  const { platforms } = usePublishPlatforms();
  const [showModal, setShowModal] = React__default.default.useState(false);
  const [editing, setEditing] = React__default.default.useState(null);
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
      render: (v) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deleteAccount(record.documentId || record.id);
                antd.message.success("删除成功");
              } catch {
                antd.message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$4, { level: 3, children: "账号配置" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$4, { type: "secondary", children: "管理各平台的发布账号" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "账号列表",
        extra: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增账号" }),
        children: /* @__PURE__ */ jsxRuntime.jsx(antd.Table, { columns, dataSource: accounts, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: showModal,
        title: editing ? "编辑账号" : "新增账号",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsxRuntime.jsx(
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
                antd.message.success("保存成功");
                setShowModal(false);
              } catch {
                antd.message.error("保存失败");
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
  const [slots, setSlots] = React__default.default.useState([]);
  const [loading, setLoading] = React__default.default.useState(false);
  const fetchSlots = React__default.default.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE$1);
      const json = await res.json();
      const list = (json || []).map(normalizeSlot);
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
  React__default.default.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);
  return { slots, loading, createSlot, updateSlot, deleteSlot };
};
const AdSlotForm = ({ slot, onSave, onCancel }) => {
  const [form] = antd.Form.useForm();
  React__default.default.useEffect(() => {
    if (slot) {
      form.setFieldsValue(slot);
    } else {
      form.resetFields();
    }
  }, [slot, form]);
  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "name", label: "广告位名称", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "position", label: "广告位置", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: "header", label: "顶部" },
      { value: "footer", label: "底部" },
      { value: "sidebar", label: "侧边栏" },
      { value: "inarticle", label: "文章内嵌" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "type", label: "广告类型", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
      { value: "image", label: "图片" },
      { value: "text", label: "文字" },
      { value: "video", label: "视频" }
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "width", label: "宽度", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "height", label: "高度", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "adCode", label: "广告代码", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 4 }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "isActive", label: "启用", valuePropName: "checked", initialValue: true, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleSubmit, children: "保存" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onCancel, children: "取消" })
    ] }) })
  ] });
};
const { Title: Title$3, Text: Text$3 } = antd.Typography;
const AdSlotConfigPage = () => {
  const { slots, loading, createSlot, updateSlot, deleteSlot } = useAdSlots();
  const [showModal, setShowModal] = React__default.default.useState(false);
  const [editing, setEditing] = React__default.default.useState(null);
  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "位置", dataIndex: "position", key: "position" },
    { title: "类型", dataIndex: "type", key: "type" },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: v ? "success" : "error", children: v ? "启用" : "禁用" })
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", onClick: () => {
          setEditing(record);
          setShowModal(true);
        }, children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Popconfirm,
          {
            title: "确认删除?",
            onConfirm: async () => {
              try {
                await deleteSlot(record.documentId || record.id);
                antd.message.success("删除成功");
              } catch {
                antd.message.error("删除失败");
              }
            },
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$3, { level: 3, children: "广告位配置" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$3, { type: "secondary", children: "管理广告位" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "广告位列表",
        extra: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => {
          setEditing(null);
          setShowModal(true);
        }, children: "新增广告位" }),
        children: /* @__PURE__ */ jsxRuntime.jsx(antd.Table, { columns, dataSource: slots, rowKey: (r) => r.documentId || r.id, loading })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: showModal,
        title: editing ? "编辑广告位" : "新增广告位",
        onCancel: () => setShowModal(false),
        footer: null,
        destroyOnClose: true,
        children: /* @__PURE__ */ jsxRuntime.jsx(
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
                antd.message.success("保存成功");
                setShowModal(false);
              } catch {
                antd.message.error("保存失败");
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
    return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Spin, {}) });
  }
  return /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height } });
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
        if (change === void 0 || change === 0) return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: "持平" });
        return change > 0 ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Tag, { color: "success", children: [
          "↑ ",
          change,
          "%"
        ] }) : /* @__PURE__ */ jsxRuntime.jsxs(antd.Tag, { color: "error", children: [
          "↓ ",
          Math.abs(change),
          "%"
        ] });
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Table,
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
  const [stats, setStats] = React__default.default.useState([]);
  const [chartData, setChartData] = React__default.default.useState([]);
  const [loading, setLoading] = React__default.default.useState(false);
  React__default.default.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const endpoints = type === "basic" ? ["/overview"] : type === "advanced" ? ["/overview", "/articles"] : ["/overview", "/articles", "/ad-slots", "/devices"];
        const responses = await Promise.all(
          endpoints.map(
            (e) => fetch(`${API_BASE}${e}`).then((r) => r.json()).catch(() => ({}))
          )
        );
        const allStats = [];
        responses.forEach((json, i) => {
          const data = json || {};
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
        const overview = responses[0] || {};
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
const { Title: Title$2, Text: Text$2 } = antd.Typography;
const { RangePicker: RangePicker$2 } = antd.DatePicker;
const StatsBasicPage = () => {
  const { stats, chartData, loading } = useStats({ type: "basic" });
  const [dateRange, setDateRange] = React__default.default.useState();
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$2, { level: 3, children: "基础统计" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$2, { type: "secondary", children: "文章浏览量、发布量等基础指标" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text$2, { children: "时间范围：" }),
        /* @__PURE__ */ jsxRuntime.jsx(RangePicker$2, { onChange: setDateRange })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, lg: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "趋势图", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsChart, { data: chartData || [], type: "line", loading }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, lg: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "指标明细", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsTable, { data: stats || [], loading }) }) })
      ] })
    ] })
  ] });
};
const { Title: Title$1, Text: Text$1 } = antd.Typography;
const { RangePicker: RangePicker$1 } = antd.DatePicker;
const StatsAdvancedPage = () => {
  const { stats, chartData, loading } = useStats({ type: "advanced" });
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$1, { level: 3, children: "高级统计" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", children: "多维度数据分析" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text$1, { children: "时间范围：" }),
        /* @__PURE__ */ jsxRuntime.jsx(RangePicker$1, {})
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Tabs,
        {
          items: [
            {
              key: "overview",
              label: "总览",
              children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], children: [
                /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, lg: 14, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "趋势", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsChart, { data: chartData || [], type: "line", loading, height: 350 }) }) }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, lg: 10, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "明细", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsTable, { data: stats || [], loading }) }) })
              ] })
            },
            {
              key: "comparison",
              label: "对比分析",
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "对比图表", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsChart, { data: chartData || [], type: "bar", loading, height: 350 }) })
            }
          ]
        }
      )
    ] })
  ] });
};
const { Title, Text } = antd.Typography;
const { RangePicker } = antd.DatePicker;
const StatsProPage = () => {
  const { stats, chartData, loading } = useStats({ type: "pro" });
  const [chartType, setChartType] = React__default.default.useState("line");
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title, { level: 3, children: "专业统计" }),
      /* @__PURE__ */ jsxRuntime.jsx(Text, { type: "secondary", children: "完整业务数据分析" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text, { children: "时间范围：" }),
        /* @__PURE__ */ jsxRuntime.jsx(RangePicker, {}),
        /* @__PURE__ */ jsxRuntime.jsx(Text, { children: "图表类型：" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Select,
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
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "主图表", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsChart, { data: chartData || [], type: chartType, loading, height: 400 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "完整明细", size: "small", children: /* @__PURE__ */ jsxRuntime.jsx(StatsTable, { data: stats || [], loading }) }) })
      ] })
    ] })
  ] });
};
const baseUrl = "/api/zhao-studio/v1/admin";
const syncEventApi = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/sync-events${query ? "?" + query : ""}`);
    return response.json();
  },
  async findOne(documentId) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}`);
    return response.json();
  },
  async resolve(documentId, body) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return response.json();
  }
};
const { Option } = antd.Select;
const STATUS_COLORS = {
  pending: "orange",
  resolved: "green",
  ignored: "default"
};
const STATUS_LABELS = {
  pending: "待处理",
  resolved: "已处理",
  ignored: "已忽略"
};
function SyncEventPage() {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [currentEvent, setCurrentEvent] = React.useState(null);
  const [action, setAction] = React.useState("create");
  const [draftId, setDraftId] = React.useState();
  const [filterStatus, setFilterStatus] = React.useState();
  const [filterContentType, setFilterContentType] = React.useState();
  const [drafts, setDrafts] = React.useState([]);
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.eventStatus = filterStatus;
      if (filterContentType) params.sourceContentType = filterContentType;
      const data = await syncEventApi.list(params);
      setEvents(data || []);
    } catch (err) {
      antd.message.error("加载同步事件失败");
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    fetchEvents();
  }, []);
  const handleResolve = async (record) => {
    setCurrentEvent(record);
    setAction("create");
    setDraftId(void 0);
    try {
      const res = await fetch("/api/zhao-studio/v1/admin/article-drafts?status=draft");
      const data = await res.json();
      setDrafts(data || []);
    } catch (err) {
      setDrafts([]);
    }
    setResolveModalOpen(true);
  };
  const handleView = (record) => {
    setCurrentEvent(record);
    setDetailModalOpen(true);
  };
  const handleConfirmResolve = async () => {
    const body = { action, resolvedBy: "admin" };
    if (action === "update" && draftId) body.draftId = draftId;
    await syncEventApi.resolve(currentEvent.documentId, body);
    antd.message.success("处理成功");
    setResolveModalOpen(false);
    fetchEvents();
  };
  const columns = [
    { title: "来源标题", dataIndex: "sourceTitle", key: "sourceTitle", ellipsis: true },
    { title: "内容类型", dataIndex: "sourceContentType", key: "sourceContentType" },
    {
      title: "状态",
      dataIndex: "eventStatus",
      key: "eventStatus",
      render: (status) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: STATUS_COLORS[status], children: STATUS_LABELS[status] || status })
    },
    {
      title: "关联草稿",
      dataIndex: "targetDraftId",
      key: "targetDraftId",
      render: (draft) => draft ? draft.title || draft.documentId : "-"
    },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "操作",
      key: "action",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        record.eventStatus === "pending" && /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CheckOutlined, {}), onClick: () => handleResolve(record), children: "处理" }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.EyeOutlined, {}), onClick: () => handleView(record), children: "查看" })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { title: "同步事件管理", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(
        antd.Select,
        {
          placeholder: "筛选状态",
          allowClear: true,
          style: { width: 120 },
          onChange: (v) => {
            setFilterStatus(v);
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "pending", children: "待处理" }),
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "resolved", children: "已处理" }),
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "ignored", children: "已忽略" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(
        antd.Select,
        {
          placeholder: "筛选内容类型",
          allowClear: true,
          style: { width: 150 },
          onChange: (v) => {
            setFilterContentType(v);
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "article", children: "文章" }),
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "product", children: "产品" }),
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "case", children: "案例" }),
            /* @__PURE__ */ jsxRuntime.jsx(Option, { value: "faq", children: "FAQ" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: fetchEvents, children: "查询" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Table, { columns, dataSource: events, rowKey: "documentId", loading }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "处理同步事件",
        open: resolveModalOpen,
        onOk: handleConfirmResolve,
        onCancel: () => setResolveModalOpen(false),
        children: currentEvent && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "来源标题：" }),
            currentEvent.sourceTitle
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "内容类型：" }),
            currentEvent.sourceContentType
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Radio.Group, { value: action, onChange: (e) => setAction(e.target.value), style: { marginTop: 16 }, children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "create", children: "新建草稿" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "update", children: "更新已有草稿" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "ignore", children: "忽略" })
          ] }) }),
          action === "update" && /* @__PURE__ */ jsxRuntime.jsx(
            antd.Select,
            {
              placeholder: "选择草稿",
              style: { width: "100%", marginTop: 8 },
              onChange: (v) => setDraftId(v),
              children: drafts.map((d) => /* @__PURE__ */ jsxRuntime.jsx(Option, { value: d.documentId, children: d.title }, d.documentId))
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Modal, { title: "同步事件详情", open: detailModalOpen, onCancel: () => setDetailModalOpen(false), footer: null, children: currentEvent && /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 1, bordered: true, children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "来源标题", children: currentEvent.sourceTitle }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "内容类型", children: currentEvent.sourceContentType }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "来源 URL", children: currentEvent.sourceUrl || "-" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "状态", children: STATUS_LABELS[currentEvent.eventStatus] || currentEvent.eventStatus }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "处理人", children: currentEvent.resolvedBy || "-" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "处理时间", children: currentEvent.resolvedAt || "-" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "关联草稿", children: currentEvent.targetDraftId?.title || "-" })
    ] }) })
  ] });
}
const App = () => /* @__PURE__ */ jsxRuntime.jsx(antd.ConfigProvider, { prefixCls: "zs", iconPrefixCls: "zs-icon", locale: zhCN__default.default, children: /* @__PURE__ */ jsxRuntime.jsx(PluginLayout, { children: /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/", element: /* @__PURE__ */ jsxRuntime.jsx(HomePage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/collect", element: /* @__PURE__ */ jsxRuntime.jsx(CollectPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/ai-config", element: /* @__PURE__ */ jsxRuntime.jsx(AIConfigPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/publish", element: /* @__PURE__ */ jsxRuntime.jsx(PublishPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/platforms", element: /* @__PURE__ */ jsxRuntime.jsx(PlatformConfigPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/accounts", element: /* @__PURE__ */ jsxRuntime.jsx(AccountConfigPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/ad-slots", element: /* @__PURE__ */ jsxRuntime.jsx(AdSlotConfigPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/stats/basic", element: /* @__PURE__ */ jsxRuntime.jsx(StatsBasicPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/stats/advanced", element: /* @__PURE__ */ jsxRuntime.jsx(StatsAdvancedPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/stats/pro", element: /* @__PURE__ */ jsxRuntime.jsx(StatsProPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/sync-events", element: /* @__PURE__ */ jsxRuntime.jsx(SyncEventPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx("div", { children: "404" }) })
] }) }) });
exports.default = App;
