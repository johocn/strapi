"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const antd = require("antd");
const zhCN = require("antd/locale/zh_CN");
const reactRouterDom = require("react-router-dom");
const icons = require("@ant-design/icons");
const react = require("react");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const zhCN__default = /* @__PURE__ */ _interopDefault(zhCN);
const { Sider, Content } = antd.Layout;
const menuItems = [
  { key: "", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.DashboardOutlined, {}), label: "仪表盘" },
  { key: "studio-bridge", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.RocketOutlined, {}), label: "一键发布" },
  { key: "knowledge-graph", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ShareAltOutlined, {}), label: "知识图谱" },
  { key: "first-truth", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SafetyCertificateOutlined, {}), label: "第一真值" },
  { key: "ai-summaries", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.RobotOutlined, {}), label: "AI 摘要" },
  { key: "seo-output", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}), label: "SEO 输出" }
];
const PluginLayout = ({ children }) => {
  const navigate = reactRouterDom.useNavigate();
  const location = reactRouterDom.useLocation();
  const pathParts = location.pathname.split("/plugins/zhao-website/")[1] || "";
  const selectedKey = pathParts.split("?")[0];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Layout, { style: { minHeight: "calc(100vh - 64px)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Sider, { width: 200, theme: "light", children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Menu,
      {
        mode: "inline",
        selectedKeys: [selectedKey],
        style: { height: "100%", borderRight: 0 },
        items: menuItems,
        onClick: ({ key }) => navigate(`/plugins/zhao-website${key ? "/" + key : ""}`)
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(Content, { style: { padding: 24, background: "#f5f5f5" }, children })
  ] });
};
const { Text: Text$1, Title: Title$2 } = antd.Typography;
const OverviewCard = ({ title, value, suffix }) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
  /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", children: title }),
  /* @__PURE__ */ jsxRuntime.jsxs(Title$2, { level: 3, style: { marginTop: 8, marginBottom: 0 }, children: [
    value,
    suffix && /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", style: { fontSize: 14, marginLeft: 4 }, children: suffix })
  ] })
] });
function useFetch(url, options) {
  const [data, setData] = react.useState(null);
  const [loading, setLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const [trigger, setTrigger] = react.useState(0);
  const refetch = react.useCallback(() => setTrigger((t) => t + 1), []);
  react.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...{}
      }
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (!cancelled) {
        setData(json);
        setError(null);
      }
    }).catch((err) => {
      if (!cancelled) setError(err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [url, trigger, options]);
  return { data, loading, error, refetch };
}
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}
async function putJSON(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}
async function deleteJSON(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}
const ADMIN_BASE = "/api/zhao-website/admin";
const PUBLIC_BASE = "/api/zhao-website/v1";
const API = {
  statsOverview: `${ADMIN_BASE}/stats/overview`,
  statsLead: (days = 30) => `${ADMIN_BASE}/stats/lead-stats?days=${days}`,
  statsSearch: (days = 30) => `${ADMIN_BASE}/stats/search-stats?days=${days}`,
  studioBridgePublish: `${ADMIN_BASE}/studio-bridge/publishFromStudio`,
  kgFindEntities: (params = {}) => `${ADMIN_BASE}/knowledge-graph/find-entities?${new URLSearchParams(params).toString()}`,
  kgCreateEntity: `${ADMIN_BASE}/knowledge-graph/create-entity`,
  kgUpdateEntity: (id) => `${ADMIN_BASE}/knowledge-graph/update-entity/${id}`,
  kgDeleteEntity: (id) => `${ADMIN_BASE}/knowledge-graph/delete-entity/${id}`,
  kgFindRelations: (params = {}) => `${ADMIN_BASE}/knowledge-graph/find-relations?${new URLSearchParams(params).toString()}`,
  kgAddRelation: `${ADMIN_BASE}/knowledge-graph/add-relation`,
  kgDeleteRelation: (id) => `${ADMIN_BASE}/knowledge-graph/delete-relation/${id}`,
  kgExportGraph: `${ADMIN_BASE}/knowledge-graph/export-graph`,
  ftFind: (params = {}) => `${ADMIN_BASE}/first-truth/find?${new URLSearchParams(params).toString()}`,
  ftFindOne: (id) => `${ADMIN_BASE}/first-truth/find-one/${id}`,
  ftCreate: `${ADMIN_BASE}/first-truth/create`,
  ftUpdate: (id) => `${ADMIN_BASE}/first-truth/update/${id}`,
  ftDelete: (id) => `${ADMIN_BASE}/first-truth/delete/${id}`,
  ftVerify: (id) => `${ADMIN_BASE}/first-truth/verify/${id}`,
  ftConflicts: `${ADMIN_BASE}/first-truth/conflicts`,
  ftExportFacts: `${ADMIN_BASE}/first-truth/export-facts`,
  aiFindByTarget: (params = {}) => `${ADMIN_BASE}/ai-content-summary/find-by-target?${new URLSearchParams(params).toString()}`,
  aiCreate: `${ADMIN_BASE}/ai-content-summary/create`,
  aiUpdate: (id) => `${ADMIN_BASE}/ai-content-summary/update/${id}`,
  aiDelete: (id) => `${ADMIN_BASE}/ai-content-summary/delete/${id}`,
  aiRegenerate: (id) => `${ADMIN_BASE}/ai-content-summary/regenerate/${id}`,
  seoSitemap: `${PUBLIC_BASE}/sitemap.xml`,
  seoRobots: `${PUBLIC_BASE}/robots.txt`,
  seoLlmsTxt: `${PUBLIC_BASE}/llms.txt`
};
const { Title: Title$1, Paragraph: Paragraph$1 } = antd.Typography;
const DashboardPage = () => {
  const { data: overview, loading } = useFetch(API.statsOverview);
  const { data: leadStats } = useFetch(API.statsLead(30));
  const { data: searchStats } = useFetch(API.statsSearch(30));
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Spin, { spinning: loading, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(Title$1, { level: 3, children: "官网管理仪表盘" }),
      /* @__PURE__ */ jsxRuntime.jsx(Paragraph$1, { type: "secondary", children: "内容资产、线索转化、SEO 表现概览" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: [16, 16], style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "文章数", value: overview?.articles ?? 0 }) }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "产品数", value: overview?.products ?? 0 }) }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "案例数", value: overview?.cases ?? 0 }) }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { xs: 24, sm: 12, md: 6, children: /* @__PURE__ */ jsxRuntime.jsx(OverviewCard, { title: "线索数", value: overview?.leads ?? 0 }) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Tabs,
      {
        items: [
          {
            key: "leads",
            label: "线索趋势（近 30 天）",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              antd.Table,
              {
                size: "small",
                dataSource: Array.isArray(leadStats) ? leadStats : leadStats?.data || [],
                columns: [
                  { title: "日期", dataIndex: "date" },
                  { title: "线索数", dataIndex: "count" }
                ],
                rowKey: "date",
                pagination: false
              }
            )
          },
          {
            key: "search",
            label: "搜索热词（近 30 天 Top 10）",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              antd.Table,
              {
                size: "small",
                dataSource: (Array.isArray(searchStats?.topKeywords) ? searchStats.topKeywords : []).slice(0, 10),
                columns: [
                  { title: "关键词", dataIndex: "keyword" },
                  { title: "搜索次数", dataIndex: "count" }
                ],
                rowKey: "keyword",
                pagination: false
              }
            )
          }
        ]
      }
    ) })
  ] });
};
const { Title, Paragraph } = antd.Typography;
const StudioBridgePage = () => {
  const [form] = antd.Form.useForm();
  const [submitting, setSubmitting] = react.useState(false);
  const [result, setResult] = react.useState(null);
  const handleSubmit = async (values) => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await postJSON(API.studioBridgePublish, {
        draftDocumentId: values.draftDocumentId,
        siteId: values.siteId,
        status: values.status
      });
      setResult(res);
      antd.message.success("发布成功");
    } catch (err) {
      antd.message.error(`发布失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(Title, { level: 3, children: [
      /* @__PURE__ */ jsxRuntime.jsx(icons.RocketOutlined, {}),
      " 从 Studio 一键发布到官网"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(Paragraph, { type: "secondary", children: "将 zhao-studio 的草稿文章发布到 zhao-website，自动同步标题、内容、标签、SEO 字段。" }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Alert,
      {
        type: "info",
        showIcon: true,
        message: "草稿 documentId 与站点 ID 请从 zhao-studio 草稿列表和站点配置中获取后填入",
        style: { marginBottom: 16 }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      antd.Form,
      {
        form,
        layout: "vertical",
        onFinish: handleSubmit,
        initialValues: { status: "published" },
        style: { maxWidth: 500 },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "draftDocumentId",
              label: "草稿 Document ID",
              rules: [{ required: true, message: "请输入草稿 documentId" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(
                antd.Select,
                {
                  mode: "tags",
                  maxCount: 1,
                  placeholder: "输入 zhao-studio 草稿的 documentId"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "siteId",
              label: "目标站点 ID",
              rules: [{ required: true, message: "请输入站点 ID" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(
                antd.Select,
                {
                  mode: "tags",
                  maxCount: 1,
                  placeholder: "输入目标 site-config 的 ID"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "status", label: "发布状态", children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Radio.Group, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "published", children: "立即发布" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Radio, { value: "draft", children: "存为草稿" })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", htmlType: "submit", loading: submitting, icon: /* @__PURE__ */ jsxRuntime.jsx(icons.RocketOutlined, {}), children: "一键发布" }) })
        ]
      }
    ),
    result && /* @__PURE__ */ jsxRuntime.jsx(
      antd.Alert,
      {
        type: "success",
        showIcon: true,
        message: "发布结果",
        description: /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { margin: 0 }, children: JSON.stringify(result, null, 2) }),
        style: { marginTop: 16 }
      }
    )
  ] });
};
const KnowledgeGraphPage = () => {
  const [activeTab, setActiveTab] = react.useState("entities");
  const [entityParams, setEntityParams] = react.useState({ page: 1, pageSize: 10 });
  const [relationParams, setRelationParams] = react.useState({ page: 1, pageSize: 10 });
  const [entityModalOpen, setEntityModalOpen] = react.useState(false);
  const [relationModalOpen, setRelationModalOpen] = react.useState(false);
  const [exportModalOpen, setExportModalOpen] = react.useState(false);
  const [exportData, setExportData] = react.useState(null);
  const [entityForm] = antd.Form.useForm();
  const [relationForm] = antd.Form.useForm();
  const [submitting, setSubmitting] = react.useState(false);
  const { data: entities, loading: loadingEntities, refetch: refetchEntities } = useFetch(
    activeTab === "entities" ? API.kgFindEntities(entityParams) : null
  );
  const { data: relations, loading: loadingRelations, refetch: refetchRelations } = useFetch(
    activeTab === "relations" ? API.kgFindRelations(relationParams) : null
  );
  const handleCreateEntity = async (values) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgCreateEntity, values);
      antd.message.success("实体创建成功");
      setEntityModalOpen(false);
      entityForm.resetFields();
      refetchEntities();
    } catch (err) {
      antd.message.error(`创建失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteEntity = async (documentId) => {
    try {
      await deleteJSON(API.kgDeleteEntity(documentId));
      antd.message.success("已删除");
      refetchEntities();
    } catch (err) {
      antd.message.error(`删除失败: ${err.message}`);
    }
  };
  const handleAddRelation = async (values) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgAddRelation, values);
      antd.message.success("关系创建成功");
      setRelationModalOpen(false);
      relationForm.resetFields();
      refetchRelations();
    } catch (err) {
      antd.message.error(`创建失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteRelation = async (documentId) => {
    try {
      await deleteJSON(API.kgDeleteRelation(documentId));
      antd.message.success("已删除");
      refetchRelations();
    } catch (err) {
      antd.message.error(`删除失败: ${err.message}`);
    }
  };
  const handleExport = async () => {
    try {
      const res = await fetch(API.kgExportGraph).then((r) => r.json());
      setExportData(res);
      setExportModalOpen(true);
    } catch (err) {
      antd.message.error(`导出失败: ${err.message}`);
    }
  };
  const entityColumns = [
    { title: "名称", dataIndex: "name" },
    { title: "类型", dataIndex: "entityType" },
    { title: "Slug", dataIndex: "slug" },
    { title: "来源", dataIndex: "sourceType" },
    {
      title: "操作",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确认删除？", onConfirm: () => handleDeleteEntity(record.documentId), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", danger: true, size: "small", children: "删除" }) })
    }
  ];
  const relationColumns = [
    { title: "主体", dataIndex: ["subjectEntity", "name"], render: (v) => v || "-" },
    { title: "谓词", dataIndex: "predicate" },
    { title: "客体实体", dataIndex: ["objectEntity", "name"], render: (v) => v || "-" },
    { title: "客体值", dataIndex: "objectValue", render: (v) => v ?? "-" },
    { title: "客体文本", dataIndex: "objectText", render: (v) => v ?? "-" },
    {
      title: "操作",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确认删除？", onConfirm: () => handleDeleteRelation(record.documentId), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", danger: true, size: "small", children: "删除" }) })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Space, { style: { marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ExportOutlined, {}), onClick: handleExport, children: "导出 JSON-LD" }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Tabs,
      {
        activeKey: activeTab,
        onChange: setActiveTab,
        items: [
          {
            key: "entities",
            label: "实体",
            children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: () => setEntityModalOpen(true), style: { marginBottom: 16 }, children: "新建实体" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                antd.Table,
                {
                  columns: entityColumns,
                  dataSource: entities || [],
                  rowKey: "documentId",
                  loading: loadingEntities,
                  size: "small",
                  pagination: { current: entityParams.page, pageSize: entityParams.pageSize }
                }
              )
            ] })
          },
          {
            key: "relations",
            label: "关系",
            children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: () => setRelationModalOpen(true), style: { marginBottom: 16 }, children: "新建关系" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                antd.Table,
                {
                  columns: relationColumns,
                  dataSource: relations || [],
                  rowKey: "documentId",
                  loading: loadingRelations,
                  size: "small",
                  pagination: { current: relationParams.page, pageSize: relationParams.pageSize }
                }
              )
            ] })
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "新建实体",
        open: entityModalOpen,
        onCancel: () => setEntityModalOpen(false),
        onOk: () => entityForm.submit(),
        confirmLoading: submitting,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form: entityForm, layout: "vertical", onFinish: handleCreateEntity, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "name", label: "名称", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "entityType", label: "类型", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: [
            "Organization",
            "Person",
            "Product",
            "Article",
            "CaseStudy",
            "Event",
            "FAQ",
            "HowTo",
            "Download"
          ].map((t) => ({ label: t, value: t })) }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "slug", label: "Slug", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "description", label: "描述", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, {}) })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "新建关系",
        open: relationModalOpen,
        onCancel: () => setRelationModalOpen(false),
        onOk: () => relationForm.submit(),
        confirmLoading: submitting,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form: relationForm, layout: "vertical", onFinish: handleAddRelation, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "subjectEntityId", label: "主体 Entity Document ID", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "predicate", label: "谓词", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "objectEntityId", label: "客体 Entity Document ID（与值二选一）", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "objectValue", label: "客体值（与实体二选一）", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "objectText", label: "客体文本（与实体二选一）", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, {}) })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "JSON-LD 导出",
        open: exportModalOpen,
        onCancel: () => setExportModalOpen(false),
        footer: null,
        width: 700,
        children: /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { maxHeight: 500, overflow: "auto" }, children: exportData ? JSON.stringify(exportData, null, 2) : "加载中..." })
      }
    )
  ] });
};
const FirstTruthPage = () => {
  const [activeTab, setActiveTab] = react.useState("list");
  const [listParams, setListParams] = react.useState({ page: 1, pageSize: 10 });
  const [modalOpen, setModalOpen] = react.useState(false);
  const [editingId, setEditingId] = react.useState(null);
  const [exportOpen, setExportOpen] = react.useState(false);
  const [exportData, setExportData] = react.useState(null);
  const [form] = antd.Form.useForm();
  const [submitting, setSubmitting] = react.useState(false);
  const { data: truths, loading, refetch: refetchTruths } = useFetch(API.ftFind(listParams));
  const { data: conflicts, loading: loadingConflicts } = useFetch(
    activeTab === "conflicts" ? API.ftConflicts : null
  );
  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };
  const handleOpenEdit = (record) => {
    setEditingId(record.documentId);
    form.setFieldsValue(record);
    setModalOpen(true);
  };
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await putJSON(API.ftUpdate(editingId), values);
        antd.message.success("已更新");
      } else {
        await postJSON(API.ftCreate, values);
        antd.message.success("已创建");
      }
      setModalOpen(false);
      refetchTruths();
    } catch (err) {
      antd.message.error(`操作失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const handleVerify = async (documentId) => {
    try {
      await postJSON(API.ftVerify(documentId), {});
      antd.message.success("已标记为 verified");
      refetchTruths();
    } catch (err) {
      antd.message.error(`操作失败: ${err.message}`);
    }
  };
  const handleDelete = async (documentId) => {
    try {
      await deleteJSON(API.ftDelete(documentId));
      antd.message.success("已删除");
      refetchTruths();
    } catch (err) {
      antd.message.error(`删除失败: ${err.message}`);
    }
  };
  const handleExport = async () => {
    try {
      const res = await fetch(API.ftExportFacts).then((r) => r.json());
      setExportData(res);
      setExportOpen(true);
    } catch (err) {
      antd.message.error(`导出失败: ${err.message}`);
    }
  };
  const columns = [
    { title: "claimKey", dataIndex: "claimKey" },
    { title: "claim", dataIndex: "claim" },
    { title: "canonicalValue", dataIndex: "canonicalValue" },
    { title: "类目", dataIndex: "claimCategory" },
    { title: "优先级", dataIndex: "priority" },
    {
      title: "状态",
      dataIndex: "verificationStatus",
      render: (v) => /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: v === "verified" ? "#52c41a" : v === "conflict" ? "#ff4d4f" : "#faad14" }, children: v })
    },
    {
      title: "操作",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", size: "small", onClick: () => handleOpenEdit(record), children: "编辑" }),
        record.verificationStatus !== "verified" && /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", size: "small", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CheckCircleOutlined, {}), onClick: () => handleVerify(record.documentId), children: "verify" }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确认删除？", onConfirm: () => handleDelete(record.documentId), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", danger: true, size: "small", children: "删除" }) })
      ] })
    }
  ];
  const conflictColumns = [
    { title: "claimKey", dataIndex: "claimKey" },
    {
      title: "严重级别",
      dataIndex: "severity",
      render: (v) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(icons.WarningOutlined, { style: { color: v === "error" ? "#ff4d4f" : "#faad14" } }),
        v
      ] })
    },
    {
      title: "冲突值",
      dataIndex: "values",
      render: (values) => /* @__PURE__ */ jsxRuntime.jsx("div", { children: values?.map((v, i) => /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: v.value }),
        " ",
        /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { color: "#999" }, children: [
          "(",
          v.sourceType,
          ": ",
          v.sourceUrl || "-",
          ")"
        ] })
      ] }, i)) })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: handleOpenCreate, children: "新建真值" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ExportOutlined, {}), onClick: handleExport, children: "导出 Facts" })
    ] }),
    conflicts && conflicts.length > 0 && /* @__PURE__ */ jsxRuntime.jsx(
      antd.Alert,
      {
        type: "error",
        showIcon: true,
        message: `检测到 ${conflicts.length} 个冲突，请到「冲突检测」Tab 处理`,
        style: { marginBottom: 16 }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Tabs,
      {
        activeKey: activeTab,
        onChange: setActiveTab,
        items: [
          {
            key: "list",
            label: "真值列表",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              antd.Table,
              {
                columns,
                dataSource: truths || [],
                rowKey: "documentId",
                loading,
                size: "small",
                pagination: { current: listParams.page, pageSize: listParams.pageSize }
              }
            )
          },
          {
            key: "conflicts",
            label: "冲突检测",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              antd.Table,
              {
                columns: conflictColumns,
                dataSource: conflicts || [],
                rowKey: "claimKey",
                loading: loadingConflicts,
                size: "small",
                pagination: false
              }
            )
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: editingId ? "编辑真值" : "新建真值",
        open: modalOpen,
        onCancel: () => setModalOpen(false),
        onOk: () => form.submit(),
        confirmLoading: submitting,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", onFinish: handleSubmit, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "claimKey", label: "claimKey", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { disabled: !!editingId }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "claim", label: "claim", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "canonicalValue", label: "canonicalValue", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "claimCategory", label: "类目", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "priority", label: "优先级（0-100）", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, max: 100, style: { width: "100%" } }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "canonicalSourceUrl", label: "来源 URL", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "canonicalSourceType", label: "来源类型", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: ["official", "report", "news", "other"].map((t) => ({ label: t, value: t })) }) })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: "Facts 导出",
        open: exportOpen,
        onCancel: () => setExportOpen(false),
        footer: null,
        width: 700,
        children: /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { maxHeight: 500, overflow: "auto" }, children: exportData ? JSON.stringify(exportData, null, 2) : "加载中..." })
      }
    )
  ] });
};
const AISummariesPage = () => {
  const [targetType, setTargetType] = react.useState(void 0);
  const [summaryType, setSummaryType] = react.useState(void 0);
  const [modalOpen, setModalOpen] = react.useState(false);
  const [editingId, setEditingId] = react.useState(null);
  const [regenerating, setRegenerating] = react.useState(null);
  const [form] = antd.Form.useForm();
  const [submitting, setSubmitting] = react.useState(false);
  const params = {};
  if (targetType) params.targetType = targetType;
  if (summaryType) params.summaryType = summaryType;
  const { data: summaries, loading, refetch } = useFetch(API.aiFindByTarget(params));
  const handleRegenerate = async (documentId) => {
    setRegenerating(documentId);
    try {
      await postJSON(API.aiRegenerate(documentId), {});
      antd.message.success("AI 重新生成已触发（异步，请稍后刷新查看）");
      refetch();
    } catch (err) {
      antd.message.error(`触发失败: ${err.message}`);
    } finally {
      setRegenerating(null);
    }
  };
  const handleDelete = async (documentId) => {
    try {
      await deleteJSON(API.aiDelete(documentId));
      antd.message.success("已删除");
      refetch();
    } catch (err) {
      antd.message.error(`删除失败: ${err.message}`);
    }
  };
  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };
  const handleOpenEdit = (record) => {
    setEditingId(record.documentId);
    form.setFieldsValue(record);
    setModalOpen(true);
  };
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await putJSON(API.aiUpdate(editingId), values);
        antd.message.success("已更新");
      } else {
        await postJSON(API.aiCreate, values);
        antd.message.success("已创建");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      antd.message.error(`操作失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const columns = [
    { title: "targetType", dataIndex: "targetType" },
    { title: "targetId", dataIndex: "targetId" },
    { title: "summaryType", dataIndex: "summaryType", render: (v) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: v }) },
    {
      title: "内容",
      dataIndex: "content",
      ellipsis: true,
      render: (v) => v?.slice(0, 80) + (v?.length > 80 ? "..." : "")
    },
    { title: "版本", dataIndex: "version" },
    {
      title: "操作",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", size: "small", onClick: () => handleOpenEdit(record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            type: "link",
            size: "small",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}),
            loading: regenerating === record.documentId,
            onClick: () => handleRegenerate(record.documentId),
            children: "重新生成"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确认删除？", onConfirm: () => handleDelete(record.documentId), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "link", danger: true, size: "small", children: "删除" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          allowClear: true,
          placeholder: "筛选 targetType",
          style: { width: 150 },
          value: targetType,
          onChange: setTargetType,
          options: ["article", "product", "case", "faq", "tutorial"].map((t) => ({ label: t, value: t }))
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          allowClear: true,
          placeholder: "筛选 summaryType",
          style: { width: 150 },
          value: summaryType,
          onChange: setSummaryType,
          options: ["brief", "detailed", "seo", "social"].map((t) => ({ label: t, value: t }))
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: handleOpenCreate, children: "新建" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Table,
      {
        columns,
        dataSource: summaries || [],
        rowKey: "documentId",
        loading,
        size: "small"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        title: editingId ? "编辑摘要" : "新建摘要",
        open: modalOpen,
        onCancel: () => setModalOpen(false),
        onOk: () => form.submit(),
        confirmLoading: submitting,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", onFinish: handleSubmit, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "targetType", label: "targetType", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: ["article", "product", "case", "faq", "tutorial"].map((t) => ({ label: t, value: t })) }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "targetId", label: "targetId", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { disabled: !!editingId }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "summaryType", label: "summaryType", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Select, { options: ["brief", "detailed", "seo", "social"].map((t) => ({ label: t, value: t })) }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "content", label: "content", rules: [{ required: true }], children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 6 }) })
        ] })
      }
    )
  ] });
};
const { Text } = antd.Typography;
function useFetchText(url) {
  const [data, setData] = react.useState(null);
  const [loading, setLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const [trigger, setTrigger] = react.useState(0);
  const refetch = react.useCallback(() => setTrigger((t) => t + 1), []);
  react.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const text = await res.text();
      if (!cancelled) {
        setData(text);
        setError(null);
      }
    }).catch((err) => {
      if (!cancelled) setError(err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [url, trigger]);
  return { data, loading, error, refetch };
}
const SEOOutputPage = () => {
  const [activeTab, setActiveTab] = react.useState("sitemap");
  const sitemapFetch = useFetchText(activeTab === "sitemap" ? API.seoSitemap : null);
  const robotsFetch = useFetchText(activeTab === "robots" ? API.seoRobots : null);
  const llmsFetch = useFetchText(activeTab === "llms" ? API.seoLlmsTxt : null);
  const handleCopy = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      antd.message.success("已复制");
    } catch {
      antd.message.error("复制失败");
    }
  };
  const renderTab = (label, fetchState) => /* @__PURE__ */ jsxRuntime.jsx(
    antd.Card,
    {
      title: label,
      extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: fetchState.refetch, children: "刷新" }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CopyOutlined, {}), onClick: () => handleCopy(fetchState.data), children: "复制" })
      ] }),
      children: /* @__PURE__ */ jsxRuntime.jsx(antd.Spin, { spinning: fetchState.loading, children: fetchState.error ? /* @__PURE__ */ jsxRuntime.jsxs(Text, { type: "danger", children: [
        "加载失败: ",
        fetchState.error.message
      ] }) : /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { background: "#f5f5f5", padding: 16, borderRadius: 4, maxHeight: 600, overflow: "auto" }, children: fetchState.data || "加载中..." }) })
    }
  );
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Tabs,
    {
      activeKey: activeTab,
      onChange: setActiveTab,
      items: [
        { key: "sitemap", label: "sitemap.xml", children: renderTab("sitemap.xml", sitemapFetch) },
        { key: "robots", label: "robots.txt", children: renderTab("robots.txt", robotsFetch) },
        { key: "llms", label: "llms.txt", children: renderTab("llms.txt", llmsFetch) }
      ]
    }
  );
};
const App = () => /* @__PURE__ */ jsxRuntime.jsx(antd.ConfigProvider, { prefixCls: "zw", iconPrefixCls: "zw-icon", locale: zhCN__default.default, children: /* @__PURE__ */ jsxRuntime.jsx(PluginLayout, { children: /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/", element: /* @__PURE__ */ jsxRuntime.jsx(DashboardPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/studio-bridge", element: /* @__PURE__ */ jsxRuntime.jsx(StudioBridgePage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/knowledge-graph", element: /* @__PURE__ */ jsxRuntime.jsx(KnowledgeGraphPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/first-truth", element: /* @__PURE__ */ jsxRuntime.jsx(FirstTruthPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/ai-summaries", element: /* @__PURE__ */ jsxRuntime.jsx(AISummariesPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "/seo-output", element: /* @__PURE__ */ jsxRuntime.jsx(SEOOutputPage, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx("div", { children: "页面建设中" }) })
] }) }) });
exports.default = App;
