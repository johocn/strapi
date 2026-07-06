"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const antd = require("antd");
const zhCN = require("antd/locale/zh_CN");
const reactRouterDom = require("react-router-dom");
const icons = require("@ant-design/icons");
const admin = require("@strapi/strapi/admin");
const react = require("react");
const ReactECharts = require("echarts-for-react");
const proComponents = require("@ant-design/pro-components");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const zhCN__default = /* @__PURE__ */ _interopDefault(zhCN);
const ReactECharts__default = /* @__PURE__ */ _interopDefault(ReactECharts);
const { Sider, Content } = antd.Layout;
const menuItems = [
  { key: "", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.DashboardOutlined, {}), label: "仪表盘" },
  { key: "collect", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CloudSyncOutlined, {}), label: "采集监控" },
  { key: "metrics", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.BarChartOutlined, {}), label: "指标中心" },
  { key: "product", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.FundOutlined, {}), label: "产品管理" }
];
const PluginLayout = ({ children }) => {
  const navigate = reactRouterDom.useNavigate();
  const location = reactRouterDom.useLocation();
  const pathParts = location.pathname.split("/plugins/zhao-wealth/")[1] || "";
  const selectedKey = pathParts.split("/")[0] || "";
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Layout, { style: { minHeight: "calc(100vh - 64px)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Sider, { width: 200, theme: "light", children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Menu,
      {
        mode: "inline",
        selectedKeys: [selectedKey],
        style: { height: "100%", borderRight: 0 },
        items: menuItems,
        onClick: ({ key }) => navigate(`/plugins/zhao-wealth${key ? "/" + key : ""}`)
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(Content, { style: { padding: 24, background: "#f5f5f5" }, children })
  ] });
};
const PLUGIN_ID = "zhao-wealth";
const useApi = () => {
  const { get, post, put, del } = admin.useFetchClient();
  const call = async (method, path, data, params) => {
    const config = {};
    if (params) config.params = params;
    if (data) config.data = data;
    const res = await (method === "get" ? get(path, config) : method === "post" ? post(path, config) : method === "put" ? put(path, config) : del(path, config));
    return res.data;
  };
  return {
    // 公司管理
    getCompanies: (params) => call("get", `/admin/plugins/${PLUGIN_ID}/companies`, void 0, params),
    getCompany: (id) => call("get", `/admin/plugins/${PLUGIN_ID}/companies/${id}`),
    createCompany: (data) => call("post", `/admin/plugins/${PLUGIN_ID}/companies`, data),
    updateCompany: (id, data) => call("put", `/admin/plugins/${PLUGIN_ID}/companies/${id}`, data),
    deleteCompany: (id) => call("del", `/admin/plugins/${PLUGIN_ID}/companies/${id}`),
    // 产品管理
    getProducts: (params) => call("get", `/admin/plugins/${PLUGIN_ID}/products`, void 0, params),
    getProduct: (id) => call("get", `/admin/plugins/${PLUGIN_ID}/products/${id}`),
    createProduct: (data) => call("post", `/admin/plugins/${PLUGIN_ID}/products`, data),
    updateProduct: (id, data) => call("put", `/admin/plugins/${PLUGIN_ID}/products/${id}`, data),
    deleteProduct: (id) => call("del", `/admin/plugins/${PLUGIN_ID}/products/${id}`),
    // 采集配置
    getCollectConfigs: (params) => call("get", `/admin/plugins/${PLUGIN_ID}/collect-configs`, void 0, params),
    updateCollectConfig: (id, data) => call("put", `/admin/plugins/${PLUGIN_ID}/collect-configs/${id}`, data),
    triggerCollect: (productId) => call("post", `/admin/plugins/${PLUGIN_ID}/collect/trigger`, { productId }),
    getCollectStatus: (productId) => call("get", `/admin/plugins/${PLUGIN_ID}/collect/status`, void 0, { productId }),
    // 净值管理
    getNavData: (productId, params) => call("get", `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, void 0, params),
    createNavData: (productId, data) => call("post", `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, data),
    updateNavData: (id, data) => call("put", `/admin/plugins/${PLUGIN_ID}/nav/${id}`, data),
    // 重算
    triggerRecalculate: (params) => call("post", `/admin/plugins/${PLUGIN_ID}/recalculate`, params),
    recalculateRiskMetric: (params) => call("post", `/admin/plugins/${PLUGIN_ID}/recalculate-risk-metric`, params),
    // 客户自选
    getCustomerProducts: (params) => call("get", `/admin/plugins/${PLUGIN_ID}/customer-products`, void 0, params),
    // 统计（仪表盘）
    getStatsOverview: () => call("get", `/admin/plugins/${PLUGIN_ID}/stats/overview`),
    getStatsAnomalies: (limit = 10) => call("get", `/admin/plugins/${PLUGIN_ID}/stats/anomalies`, void 0, { limit }),
    // 指标中心
    getMetricAggregate: (productId, period) => call("get", `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/aggregate`, void 0, { productId, period }),
    getMetricTrend: (productId) => call("get", `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/trend`, void 0, { productId }),
    getMetricPeers: (period, metricName, limit = 50) => call("get", `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/peers`, void 0, { period, metricName, limit }),
    // 采集与校验
    collectProduct: (source, query) => call("post", `/admin/plugins/${PLUGIN_ID}/products/collect`, { source, query }),
    collectConfirm: (data) => call("post", `/admin/plugins/${PLUGIN_ID}/products/collect/confirm`, data)
  };
};
const StatCards = () => {
  const api = useApi();
  const [data, setData] = react.useState(null);
  react.useEffect(() => {
    api.getStatsOverview().then((res) => setData(res));
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: 16, children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "产品总数", value: data?.productCount ?? 0 }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "采集成功率", value: data ? (data.collectSuccessRate * 100).toFixed(1) + "%" : "-", valueStyle: { color: (data?.collectSuccessRate || 0) >= 0.8 ? "#52c41a" : "#faad14" } }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "指标覆盖率", value: data ? (data.riskMetricCoverage * 100).toFixed(1) + "%" : "-", valueStyle: { color: (data?.riskMetricCoverage || 0) >= 0.5 ? "#52c41a" : "#faad14" } }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "今日异常", value: data?.todayAnomaly ?? 0, valueStyle: { color: (data?.todayAnomaly || 0) > 0 ? "#ff4d4f" : "#52c41a" } }) }) })
  ] });
};
const AttentionChart = () => {
  const api = useApi();
  const [option, setOption] = react.useState({});
  react.useEffect(() => {
    api.getCustomerProducts({ pageSize: 500 }).then((res) => {
      const list = res.records || [];
      const counter = {};
      list.forEach((cp) => {
        const name = cp.product?.productName || "未知";
        counter[name] = (counter[name] || 0) + 1;
      });
      const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10);
      setOption({
        title: { text: "客户关注热度 Top10" },
        tooltip: { trigger: "axis" },
        xAxis: { type: "value" },
        yAxis: { type: "category", data: sorted.map((s) => s[0]).reverse() },
        series: [{ type: "bar", data: sorted.map((s) => s[1]).reverse(), itemStyle: { color: "#5470c6" } }],
        grid: { left: 140, right: 40, top: 40, bottom: 30 }
      });
    });
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height: 320 } }) });
};
const CollectPie = () => {
  const api = useApi();
  const [option, setOption] = react.useState({});
  react.useEffect(() => {
    api.getCollectConfigs({ pageSize: 500 }).then((res) => {
      const list = res.records || [];
      const success = list.filter((c) => c.collectStatus === "success").length;
      const failed = list.filter((c) => c.collectStatus === "failed").length;
      const pending = list.filter((c) => c.collectStatus === "pending").length;
      setOption({
        title: { text: "采集状态分布" },
        tooltip: { trigger: "item" },
        legend: { bottom: 0 },
        series: [{
          type: "pie",
          radius: ["40%", "70%"],
          data: [
            { value: success, name: "成功", itemStyle: { color: "#52c41a" } },
            { value: failed, name: "失败", itemStyle: { color: "#ff4d4f" } },
            { value: pending, name: "待采", itemStyle: { color: "#faad14" } }
          ]
        }]
      });
    });
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height: 320 } }) });
};
const AnomalyTable = () => {
  const api = useApi();
  const [data, setData] = react.useState([]);
  const [loading, setLoading] = react.useState(true);
  react.useEffect(() => {
    api.getStatsAnomalies(10).then((res) => {
      setData(res || []);
      setLoading(false);
    });
  }, []);
  const columns = [
    { title: "类型", dataIndex: "type", width: 120, render: (v) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: v === "collect_failed" ? "error" : "warning", children: v === "collect_failed" ? "采集失败" : "指标计算失败" }) },
    { title: "产品", dataIndex: "productName", ellipsis: true },
    { title: "详情", dataIndex: "message", ellipsis: true },
    { title: "时间", dataIndex: "lastCollectTime", width: 160, render: (v) => v ? new Date(v).toLocaleString() : "-" }
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "近期异常", children: /* @__PURE__ */ jsxRuntime.jsx(
    antd.Table,
    {
      rowKey: (r, i) => String(i),
      columns,
      dataSource: data,
      loading,
      pagination: false,
      size: "small"
    }
  ) });
};
const Dashboard = () => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
  /* @__PURE__ */ jsxRuntime.jsx(StatCards, {}),
  /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: 16, children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 14, children: /* @__PURE__ */ jsxRuntime.jsx(AttentionChart, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 10, children: /* @__PURE__ */ jsxRuntime.jsx(CollectPie, {}) })
  ] }),
  /* @__PURE__ */ jsxRuntime.jsx(AnomalyTable, {})
] });
const PRODUCT_TYPES = {
  "bank-wealth": "银行理财",
  "stock-fund": "股票基金",
  "bond-fund": "债券基金",
  "mixed-fund": "混合基金",
  "money-fund": "货币基金"
};
const RISK_LEVELS = {
  R1: "低风险",
  R2: "中低风险",
  R3: "中风险",
  R4: "中高风险",
  R5: "高风险"
};
const TERM_TYPES = {
  short: "短期",
  medium: "中期",
  long: "长期"
};
const COMPANY_TYPES = {
  bank: "银行",
  "bank-subsidiary": "理财子公司"
};
const COLLECT_METHODS = {
  "web-crawler": "网页爬虫",
  "zip-pdf": "ZIP+PDF解析",
  manual: "手动录入",
  api: "三方API"
};
const COLLECT_STATUS = {
  pending: { label: "待采集", color: "warning" },
  success: { label: "成功", color: "success" },
  failed: { label: "失败", color: "error" }
};
const METRIC_PERIODS = {
  m1: "近1月",
  m3: "近3月",
  m6: "近6月",
  y1: "近1年"
};
const METRIC_NAMES = {
  volatility: "波动率",
  maxDrawdown: "最大回撤",
  sharpe: "夏普比率",
  rankPercentile: "同类排名百分位"
};
const RECOMMEND_TAGS = [
  { label: "稳健型", value: "稳健型" },
  { label: "高流动性", value: "高流动性" },
  { label: "新客专享", value: "新客专享" },
  { label: "进取型", value: "进取型" }
];
const TaskTab = () => {
  const api = useApi();
  const actionRef = react.useRef(null);
  const [formOpen, setFormOpen] = react.useState(false);
  const [current, setCurrent] = react.useState(void 0);
  const [stats, setStats] = react.useState({ success: 0, failed: 0, pending: 0 });
  const refreshStats = async () => {
    const res = await api.getCollectConfigs({ pageSize: 500 });
    const list = res.records || [];
    setStats({
      success: list.filter((c) => c.collectStatus === "success").length,
      failed: list.filter((c) => c.collectStatus === "failed").length,
      pending: list.filter((c) => c.collectStatus === "pending").length
    });
  };
  const columns = [
    { title: "产品名称", width: 200, render: (_, r) => r.product?.productName || "-" },
    { title: "采集方式", dataIndex: "collectMethod", width: 120, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: COLLECT_METHODS[r.collectMethod] }) },
    { title: "采集URL", dataIndex: "collectUrl", ellipsis: true, render: (_, r) => r.collectUrl || "-" },
    {
      title: "状态",
      dataIndex: "collectStatus",
      width: 90,
      render: (_, r) => {
        const s = COLLECT_STATUS[r.collectStatus];
        return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: s?.color, children: s?.label || r.collectStatus });
      }
    },
    { title: "最后采集", dataIndex: "lastCollectTime", width: 160, render: (_, r) => r.lastCollectTime ? new Date(r.lastCollectTime).toLocaleString() : "-" },
    { title: "失败次数", dataIndex: "failCount", width: 90 },
    {
      title: "操作",
      width: 180,
      valueType: "option",
      render: (_, r) => [
        /* @__PURE__ */ jsxRuntime.jsx("a", { onClick: () => {
          setCurrent(r);
          setFormOpen(true);
        }, children: "配置" }, "edit"),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "触发采集？", onConfirm: async () => {
          try {
            await api.triggerCollect(r.product?.id);
            antd.message.success("采集任务已触发");
          } catch (e) {
            antd.message.error(e.message);
          }
        }, children: /* @__PURE__ */ jsxRuntime.jsx("a", { children: "采集" }) }, "trigger")
      ]
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "成功", value: stats.success, valueStyle: { color: "#52c41a" } }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "失败", value: stats.failed, valueStyle: { color: "#ff4d4f" } }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Statistic, { title: "待采", value: stats.pending, valueStyle: { color: "#faad14" } })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      proComponents.ProTable,
      {
        rowKey: "id",
        actionRef,
        columns,
        search: false,
        request: async (params) => {
          const res = await api.getCollectConfigs({ page: params.current, pageSize: params.pageSize });
          refreshStats();
          return { data: res.records || [], total: res.total || 0, success: true };
        }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      proComponents.ModalForm,
      {
        title: "编辑采集配置",
        open: formOpen,
        onOpenChange: (v) => {
          setFormOpen(v);
          if (!v) setCurrent(void 0);
        },
        initialValues: current ? {
          collectMethod: current.collectMethod,
          collectUrl: current.collectUrl,
          collectRules: current.collectRules ? JSON.stringify(current.collectRules, null, 2) : ""
        } : { collectMethod: "web-crawler" },
        modalProps: { destroyOnClose: true, width: 600 },
        onFinish: async (values) => {
          try {
            const data = {
              collectMethod: values.collectMethod,
              collectUrl: values.collectUrl,
              collectRules: values.collectRules ? JSON.parse(values.collectRules) : null
            };
            await api.updateCollectConfig(current.id, data);
            antd.message.success("更新成功");
            actionRef.current?.reload();
            return true;
          } catch (e) {
            antd.message.error(e.message);
            return false;
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "collectMethod", label: "采集方式", options: Object.entries(COLLECT_METHODS).map(([v, l]) => ({ value: v, label: l })) }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "collectUrl", label: "采集URL", placeholder: "可使用{productCode}占位符" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormTextArea, { name: "collectRules", label: "采集规则（JSON）", fieldProps: { rows: 6 } })
        ]
      }
    )
  ] });
};
const { RangePicker } = antd.DatePicker;
const NavTab = () => {
  const api = useApi();
  const [products, setProducts] = react.useState([]);
  const [selectedProduct, setSelectedProduct] = react.useState(void 0);
  const [dateRange, setDateRange] = react.useState(void 0);
  const [navData, setNavData] = react.useState([]);
  const [formOpen, setFormOpen] = react.useState(false);
  react.useEffect(() => {
    api.getProducts({ pageSize: 500 }).then((res) => setProducts(res.records || []));
  }, []);
  const fetchNav = async () => {
    if (!selectedProduct) {
      setNavData([]);
      return;
    }
    const params = { pageSize: 500 };
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    const res = await api.getNavData(selectedProduct, params);
    setNavData(res.records || []);
  };
  const chartOption = {
    xAxis: { type: "category", data: navData.map((n) => n.navDate).reverse() },
    yAxis: { type: "value", scale: true },
    series: [
      { name: "单位净值", type: "line", data: navData.map((n) => n.unitNav).reverse(), smooth: true },
      { name: "累计净值", type: "line", data: navData.map((n) => n.accNav).reverse(), smooth: true }
    ],
    legend: { data: ["单位净值", "累计净值"] },
    tooltip: { trigger: "axis" },
    grid: { left: 50, right: 20, top: 40, bottom: 30 }
  };
  const columns = [
    { title: "日期", dataIndex: "navDate", width: 120 },
    { title: "单位净值", dataIndex: "unitNav", width: 100, render: (_, r) => r.unitNav ?? "-" },
    { title: "累计净值", dataIndex: "accNav", width: 100, render: (_, r) => r.accNav ?? "-" },
    { title: "来源", dataIndex: "dataSource", width: 80, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: r.dataSource === "crawler" ? "blue" : "default", children: r.dataSource === "crawler" ? "爬虫" : "手动" }) }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          style: { width: 240 },
          placeholder: "选择产品",
          value: selectedProduct,
          onChange: (v) => setSelectedProduct(v),
          options: products.map((p) => ({ value: p.id, label: p.productName })),
          showSearch: true,
          optionFilterProp: "label"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(RangePicker, { onChange: (v) => setDateRange(v) }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: fetchNav, disabled: !selectedProduct, children: "查询" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => setFormOpen(true), disabled: !selectedProduct, children: "新增净值" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "重算年化与风险指标？", onConfirm: async () => {
        try {
          await api.triggerRecalculate({ productId: selectedProduct });
          await api.recalculateRiskMetric({ productId: selectedProduct, type: "risk-metric" });
          antd.message.success("重算任务已触发");
        } catch (e) {
          antd.message.error(e.message);
        }
      }, disabled: !selectedProduct, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { disabled: !selectedProduct, children: "重算" }) })
    ] }),
    navData.length > 0 && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 16, height: 300 }, children: /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option: chartOption, style: { height: 300 } }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      proComponents.ProTable,
      {
        rowKey: "id",
        columns,
        search: false,
        dataSource: navData,
        pagination: { pageSize: 20 }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      proComponents.ModalForm,
      {
        title: "新增净值",
        open: formOpen,
        onOpenChange: setFormOpen,
        modalProps: { destroyOnClose: true },
        onFinish: async (values) => {
          try {
            await api.createNavData(selectedProduct, {
              navDate: values.navDate ? values.navDate.format("YYYY-MM-DD") : null,
              unitNav: values.unitNav,
              accNav: values.accNav,
              dataSource: values.dataSource
            });
            antd.message.success("创建成功");
            fetchNav();
            return true;
          } catch (e) {
            antd.message.error(e.message);
            return false;
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDatePicker, { name: "navDate", label: "日期", rules: [{ required: true }] }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDigit, { name: "unitNav", label: "单位净值", fieldProps: { step: 1e-4 } }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDigit, { name: "accNav", label: "累计净值", fieldProps: { step: 1e-4 } }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "dataSource", label: "来源", options: [{ value: "manual", label: "手动录入" }, { value: "crawler", label: "爬虫采集" }], initialValue: "manual" })
        ]
      }
    )
  ] });
};
const LogTab = () => /* @__PURE__ */ jsxRuntime.jsx(antd.Empty, { description: "操作日志功能规划中，暂无数据", style: { marginTop: 80 } });
const Collect = () => /* @__PURE__ */ jsxRuntime.jsx(
  antd.Tabs,
  {
    defaultActiveKey: "task",
    items: [
      { key: "task", label: "采集任务", children: /* @__PURE__ */ jsxRuntime.jsx(TaskTab, {}) },
      { key: "nav", label: "净值明细", children: /* @__PURE__ */ jsxRuntime.jsx(NavTab, {}) },
      { key: "log", label: "操作日志", children: /* @__PURE__ */ jsxRuntime.jsx(LogTab, {}) }
    ]
  }
);
function rateVolatility(value) {
  if (value === null) return { level: "fair", label: "无数据", color: "default" };
  const abs = Math.abs(value);
  if (abs < 0.05) return { level: "excellent", label: "优", color: "success" };
  if (abs < 0.1) return { level: "good", label: "良", color: "blue" };
  if (abs < 0.2) return { level: "fair", label: "中", color: "warning" };
  return { level: "poor", label: "差", color: "error" };
}
function rateMaxDrawdown(value) {
  if (value === null) return { level: "fair", label: "无数据", color: "default" };
  if (value > -0.05) return { level: "excellent", label: "优", color: "success" };
  if (value > -0.1) return { level: "good", label: "良", color: "blue" };
  if (value > -0.2) return { level: "fair", label: "中", color: "warning" };
  return { level: "poor", label: "差", color: "error" };
}
function rateSharpe(value) {
  if (value === null) return { level: "fair", label: "无数据", color: "default" };
  if (value > 1) return { level: "excellent", label: "优", color: "success" };
  if (value > 0.5) return { level: "good", label: "良", color: "blue" };
  if (value > 0) return { level: "fair", label: "中", color: "warning" };
  return { level: "poor", label: "差", color: "error" };
}
function rateRankPercentile(value) {
  if (value === null) return { level: "fair", label: "无数据", color: "default" };
  if (value < 20) return { level: "excellent", label: "优", color: "success" };
  if (value < 50) return { level: "good", label: "良", color: "blue" };
  if (value < 80) return { level: "fair", label: "中", color: "warning" };
  return { level: "poor", label: "差", color: "error" };
}
function formatPercent(value, digits = 4) {
  if (value === null) return "-";
  return (value * 100).toFixed(digits) + "%";
}
const MetricCards = ({ productId, period }) => {
  const api = useApi();
  const [data, setData] = react.useState(null);
  const [loading, setLoading] = react.useState(true);
  react.useEffect(() => {
    if (!productId || !period) return;
    setLoading(true);
    api.getMetricAggregate(productId, period).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [productId, period]);
  if (loading) return /* @__PURE__ */ jsxRuntime.jsx("div", { children: "加载中..." });
  const cards = [
    { name: "volatility", label: METRIC_NAMES.volatility, value: data?.volatility, rating: rateVolatility(data?.volatility), format: (v) => formatPercent(v, 4) },
    { name: "maxDrawdown", label: METRIC_NAMES.maxDrawdown, value: data?.maxDrawdown, rating: rateMaxDrawdown(data?.maxDrawdown), format: (v) => formatPercent(v, 4) },
    { name: "sharpe", label: METRIC_NAMES.sharpe, value: data?.sharpe, rating: rateSharpe(data?.sharpe), format: (v) => v?.toFixed(4) },
    { name: "rankPercentile", label: METRIC_NAMES.rankPercentile, value: data?.rankPercentile, rating: rateRankPercentile(data?.rankPercentile), format: (v) => formatPercent(v, 2) }
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Row, { gutter: 16, children: cards.map((c) => /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { children: /* @__PURE__ */ jsxRuntime.jsx(
    antd.Statistic,
    {
      title: c.label,
      value: c.value === null ? "无数据" : c.format(c.value),
      suffix: /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: c.rating.color, children: c.rating.label })
    }
  ) }) }, c.name)) });
};
const NavChart = ({ productId }) => {
  const api = useApi();
  const [option, setOption] = react.useState({});
  react.useEffect(() => {
    if (!productId) return;
    api.getNavData(productId, { pageSize: 500 }).then((res) => {
      const navs = (res.records || []).sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());
      const dates = navs.map((n) => n.navDate);
      const unitNavs = navs.map((n) => n.unitNav);
      const accNavs = navs.map((n) => n.accNav);
      let peak = unitNavs[0] || 0;
      const drawdowns = unitNavs.map((v) => {
        if (v > peak) peak = v;
        return peak > 0 ? (v - peak) / peak : 0;
      });
      setOption({
        title: { text: "净值走势与回撤" },
        tooltip: { trigger: "axis" },
        legend: { data: ["单位净值", "累计净值", "回撤"] },
        xAxis: { type: "category", data: dates },
        yAxis: [
          { type: "value", name: "净值", scale: true },
          { type: "value", name: "回撤", axisLabel: { formatter: (v) => (v * 100).toFixed(1) + "%" } }
        ],
        series: [
          { name: "单位净值", type: "line", data: unitNavs, smooth: true },
          { name: "累计净值", type: "line", data: accNavs, smooth: true },
          { name: "回撤", type: "line", data: drawdowns, yAxisIndex: 1, areaStyle: { opacity: 0.3 }, lineStyle: { color: "#ff4d4f" } }
        ],
        grid: { left: 60, right: 60, top: 60, bottom: 40 }
      });
    });
  }, [productId]);
  return /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height: 360 } });
};
const PeerRank = ({ period, currentProductId }) => {
  const api = useApi();
  const [metricName, setMetricName] = react.useState("volatility");
  const [option, setOption] = react.useState({});
  react.useEffect(() => {
    if (!period || !metricName) return;
    api.getMetricPeers(period, metricName, 30).then((res) => {
      const list = (res || []).slice().reverse();
      const names = list.map((r) => r.productName);
      const values = list.map((r) => r.metricValue);
      const colors = list.map((r) => r.productId === currentProductId ? "#ff4d4f" : "#5470c6");
      setOption({
        title: { text: `同类排名 - ${METRIC_NAMES[metricName]}` },
        tooltip: { trigger: "axis" },
        xAxis: { type: "value" },
        yAxis: { type: "category", data: names },
        series: [{
          type: "bar",
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } }))
        }],
        grid: { left: 120, right: 40, top: 40, bottom: 40 }
      });
    });
  }, [period, metricName, currentProductId]);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: "指标：" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          value: metricName,
          onChange: setMetricName,
          options: Object.entries(METRIC_NAMES).map(([v, l]) => ({ value: v, label: l })),
          style: { width: 160 }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height: 360 } })
  ] });
};
const TrendChart = ({ productId }) => {
  const api = useApi();
  const [option, setOption] = react.useState({});
  react.useEffect(() => {
    if (!productId) return;
    api.getMetricTrend(productId).then((res) => {
      const trend = res || {};
      const periods = ["m1", "m3", "m6", "y1"];
      const metricNames = ["volatility", "maxDrawdown", "sharpe", "rankPercentile"];
      const series = [];
      for (const period of periods) {
        const data = (trend[period] || []).map((item) => item);
        for (const metricName of metricNames) {
          series.push({
            name: `${METRIC_NAMES[metricName]}-${period}`,
            type: "line",
            data: data.map((d) => d[metricName]),
            smooth: true
          });
        }
      }
      const dates = (trend.y1 || []).map((d) => d.snapshotDate);
      setOption({
        title: { text: "4 指标历史趋势（按周期）" },
        tooltip: { trigger: "axis" },
        legend: { data: series.map((s) => s.name), top: 30, type: "scroll" },
        xAxis: { type: "category", data: dates },
        yAxis: { type: "value", scale: true },
        series,
        grid: { left: 60, right: 40, top: 100, bottom: 40 }
      });
    });
  }, [productId]);
  return /* @__PURE__ */ jsxRuntime.jsx(ReactECharts__default.default, { option, style: { height: 360 } });
};
const Metrics = () => {
  const [searchParams, setSearchParams] = reactRouterDom.useSearchParams();
  const api = useApi();
  const [products, setProducts] = react.useState([]);
  const [productId, setProductId] = react.useState(Number(searchParams.get("productId")) || void 0);
  const [period, setPeriod] = react.useState("m1");
  react.useEffect(() => {
    api.getProducts({ pageSize: 500 }).then((res) => setProducts(res.records || []));
  }, []);
  const handleRecalculate = async () => {
    if (!productId) return;
    try {
      await api.recalculateRiskMetric({ productId, type: "risk-metric" });
      antd.message.success("重算任务已触发");
    } catch (e) {
      antd.message.error(e.message);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: "产品：" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          style: { width: 280 },
          placeholder: "选择产品",
          value: productId,
          onChange: (v) => {
            setProductId(v);
            setSearchParams({ productId: String(v) });
          },
          options: products.map((p) => ({ value: p.id, label: p.productName })),
          showSearch: true,
          optionFilterProp: "label"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: "周期：" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          style: { width: 120 },
          value: period,
          onChange: setPeriod,
          options: Object.entries(METRIC_PERIODS).map(([v, l]) => ({ value: v, label: l }))
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: handleRecalculate, disabled: !productId, children: "手动重算" })
    ] }),
    productId ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(MetricCards, { productId, period }),
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: 16, style: { marginTop: 16 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 14, children: /* @__PURE__ */ jsxRuntime.jsx(NavChart, { productId }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 10, children: /* @__PURE__ */ jsxRuntime.jsx(PeerRank, { period, currentProductId: productId }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginTop: 16 }, children: /* @__PURE__ */ jsxRuntime.jsx(TrendChart, { productId }) })
    ] }) : /* @__PURE__ */ jsxRuntime.jsx("div", { style: { textAlign: "center", padding: 80, color: "#999" }, children: "请选择产品查看指标" })
  ] });
};
const toOptions = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));
const ProductForm = ({ open, onClose, onSuccess, initialValues }) => {
  const api = useApi();
  const isEdit = !!initialValues?.id;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    proComponents.ModalForm,
    {
      title: isEdit ? "编辑产品" : "新建产品",
      open,
      onOpenChange: (v) => !v && onClose(),
      initialValues: initialValues ? {
        ...initialValues,
        company: initialValues.company?.id,
        issueDate: initialValues.issueDate,
        maturityDate: initialValues.maturityDate,
        recommendTags: Array.isArray(initialValues.recommendTags) ? initialValues.recommendTags : []
      } : {
        productType: "bank-wealth",
        riskLevel: "R2",
        recommendWeight: 0,
        recommendEnabled: false
      },
      modalProps: { destroyOnClose: true, width: 720 },
      onFinish: async (values) => {
        try {
          const data = {
            ...values,
            company: values.company ? Number(values.company) : null,
            issueDate: values.issueDate ? values.issueDate.toISOString().slice(0, 10) : null,
            maturityDate: values.maturityDate ? values.maturityDate.toISOString().slice(0, 10) : null
          };
          if (isEdit) {
            await api.updateProduct(initialValues.id, data);
            antd.message.success("更新成功");
          } else {
            await api.createProduct(data);
            antd.message.success("创建成功");
          }
          onSuccess();
          return true;
        } catch (e) {
          antd.message.error(e.message || "操作失败");
          return false;
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs(proComponents.ProFormGroup, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "productCode", label: "产品代码", rules: [{ required: true }], placeholder: "请输入产品代码" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "productName", label: "产品名称", rules: [{ required: true }], placeholder: "请输入产品名称" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(proComponents.ProFormGroup, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "productType", label: "产品类型", options: toOptions(PRODUCT_TYPES), rules: [{ required: true }] }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "riskLevel", label: "风险等级", options: toOptions(RISK_LEVELS) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(proComponents.ProFormGroup, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "registerCode", label: "登记编码", placeholder: "请输入登记编码" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "termType", label: "期限类型", options: toOptions(TERM_TYPES), allowClear: true })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(proComponents.ProFormGroup, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "company", label: "发行机构", request: async () => {
            const res = await api.getCompanies({ pageSize: 200 });
            return (res.records || []).map((c) => ({ value: c.id, label: c.name }));
          }, allowClear: true }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDatePicker, { name: "issueDate", label: "发行日期" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDatePicker, { name: "maturityDate", label: "到期日期" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Collapse,
          {
            items: [{
              key: "recommend",
              label: "推荐配置",
              children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSwitch, { name: "recommendEnabled", label: "启用推荐" }),
                /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormDigit, { name: "recommendWeight", label: "推荐权重", min: 0, fieldProps: { precision: 0 } }),
                /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "recommendTags", label: "推荐标签", mode: "multiple", options: RECOMMEND_TAGS }),
                /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "recommendReason", label: "推荐理由", placeholder: "请输入推荐理由" })
              ] })
            }]
          }
        )
      ]
    }
  );
};
const SOURCES = [
  { value: "cbhb", label: "渤银理财" }
];
const CollectDrawer = ({ open, onClose, onSuccess }) => {
  const api = useApi();
  const [step, setStep] = react.useState(0);
  const [source, setSource] = react.useState("cbhb");
  const [query, setQuery] = react.useState("");
  const [loading, setLoading] = react.useState(false);
  const [result, setResult] = react.useState(null);
  const [productNameChoice, setProductNameChoice] = react.useState("source");
  const [remark, setRemark] = react.useState("");
  const [submitting, setSubmitting] = react.useState(false);
  const handleCollect = async () => {
    if (!query.trim()) {
      antd.message.warning("请输入产品编码或名称");
      return;
    }
    setLoading(true);
    try {
      const res = await api.collectProduct(source, query.trim());
      if (res.code !== 200) {
        antd.message.error(res.msg || "采集失败");
        return;
      }
      setResult(res.data);
      setStep(1);
      if (res.data?.verification?.differences?.length > 0) {
        const notes = res.data.verification.differences.map((d) => `${d.description}（官网: ${d.sourceValue}, 理财网: ${d.officialValue}）`).join("；");
        setRemark(`[采集校验] ${notes}`);
      } else if (res.data?.verification?.status === "full_match") {
        setRemark("[采集校验] 数据一致");
      }
    } catch (e) {
      antd.message.error(e.message || "采集失败");
    } finally {
      setLoading(false);
    }
  };
  const handleConfirm = async () => {
    if (!result?.sourceData) return;
    setSubmitting(true);
    try {
      const sd = result.sourceData;
      const od = result.officialData;
      const productName = productNameChoice === "official" && od?.productName ? od.productName : sd.productName;
      const data = {
        productCode: sd.productCode,
        productName,
        registerCode: sd.registerCode,
        productType: sd.productType,
        riskLevel: sd.riskLevel || "R2",
        termType: sd.termType,
        issueDate: sd.issueDate || null,
        maturityDate: sd.maturityDate || null,
        benchmark: sd.benchmark || null,
        remark: remark || null,
        company: null,
        // 需要通过公司名查找 id
        recommendEnabled: false,
        status: true
      };
      const companiesRes = await api.getCompanies({ pageSize: 200 });
      const companies = companiesRes?.data?.list || companiesRes?.records || [];
      const company = companies.find((c) => c.name?.includes("渤银"));
      if (company) {
        data.company = company.id;
      }
      const res = await api.collectConfirm(data);
      if (res.code !== 200) {
        antd.message.error(res.msg || "入库失败");
        return;
      }
      setStep(3);
      antd.message.success("入库成功");
      onSuccess();
    } catch (e) {
      antd.message.error(e.message || "入库失败");
    } finally {
      setSubmitting(false);
    }
  };
  const handleReset = () => {
    setStep(0);
    setQuery("");
    setResult(null);
    setProductNameChoice("source");
    setRemark("");
  };
  const handleClose = () => {
    handleReset();
    onClose();
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(
    antd.Drawer,
    {
      title: "采集产品",
      open,
      onClose: handleClose,
      width: 720,
      destroyOnClose: true,
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Steps,
          {
            current: step,
            items: [
              { title: "输入查询" },
              { title: "双源对比" },
              { title: "确认入库" },
              { title: "完成" }
            ],
            style: { marginBottom: 24 }
          }
        ),
        step === 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8, fontWeight: 500 }, children: "数据源" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
              {
                value: source,
                onChange: setSource,
                options: SOURCES,
                style: { width: "100%" }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8, fontWeight: 500 }, children: "产品编码或名称" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Input,
              {
                value: query,
                onChange: (e) => setQuery(e.target.value),
                placeholder: "如 CSFB1Y26152",
                onPressEnter: handleCollect
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              type: "primary",
              icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}),
              loading,
              onClick: handleCollect,
              block: true,
              children: "开始采集"
            }
          )
        ] }),
        step === 1 && result && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          result.verification.status === "verification_failed" && /* @__PURE__ */ jsxRuntime.jsx(
            antd.Alert,
            {
              type: "warning",
              message: "中国理财网校验失败",
              description: result.verification.error,
              style: { marginBottom: 16 },
              showIcon: true
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }, children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntime.jsxs("h4", { style: { marginBottom: 8 }, children: [
                "官网数据（",
                SOURCES.find((s) => s.value === source)?.label,
                "）"
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 1, size: "small", bordered: true, children: [
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "产品名称", children: result.sourceData.productName }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "销售编码", children: result.sourceData.productCode }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "登记编码", children: result.sourceData.registerCode }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "风险等级", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: result.sourceData.riskLevel === "R1" ? "green" : result.sourceData.riskLevel === "R2" ? "blue" : "orange", children: result.sourceData.riskLevelRaw || RISK_LEVELS[result.sourceData.riskLevel] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "期限类型", children: result.sourceData.termTypeRaw || TERM_TYPES[result.sourceData.termType] }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "发行日期", children: result.sourceData.issueDate || "-" }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "到期日期", children: result.sourceData.maturityDate || "-" }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "业绩基准", children: result.sourceData.benchmark || "-" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntime.jsx("h4", { style: { marginBottom: 8 }, children: "中国理财网数据" }),
              result.officialData ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 1, size: "small", bordered: true, children: [
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "产品名称", children: result.officialData.productName }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "登记编码", children: result.officialData.registerCode }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "风险等级", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: result.officialData.riskLevel === "R1" ? "green" : result.officialData.riskLevel === "R2" ? "blue" : "orange", children: result.officialData.riskLevelRaw || RISK_LEVELS[result.officialData.riskLevel] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "期限类型", children: result.officialData.termTypeRaw || TERM_TYPES[result.officialData.termType] }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "投资性质", children: result.officialData.productTypeRaw || PRODUCT_TYPES[result.officialData.productType] }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "产品状态", children: result.officialData.productStatus || "-" }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "运作模式", children: result.officialData.operationMode || "-" }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "发行机构", children: result.officialData.companyName || "-" })
              ] }) : /* @__PURE__ */ jsxRuntime.jsx(antd.Alert, { type: "info", message: "中国理财网未查到匹配数据" })
            ] })
          ] }),
          result.verification.differences?.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 16 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("h4", { style: { marginBottom: 8 }, children: "差异项" }),
            result.verification.differences.map((d, i) => /* @__PURE__ */ jsxRuntime.jsx(
              antd.Alert,
              {
                type: d.severity === "error" ? "error" : d.severity === "warning" ? "warning" : "info",
                message: `${d.description}`,
                description: /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntime.jsxs("span", { children: [
                    "官网: ",
                    /* @__PURE__ */ jsxRuntime.jsx("b", { children: d.sourceValue })
                  ] }),
                  /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { marginLeft: 16 }, children: [
                    "理财网: ",
                    /* @__PURE__ */ jsxRuntime.jsx("b", { children: d.officialValue })
                  ] })
                ] }),
                style: { marginBottom: 8 },
                showIcon: true
              },
              i
            ))
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 16, display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: handleReset, children: "重新查询" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: () => setStep(2), children: "确认并入库" })
          ] })
        ] }),
        step === 2 && result && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Alert, { type: "info", message: "请确认入库数据，可选择使用官网或理财网的产品名称" }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8, fontWeight: 500 }, children: "产品名称来源" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
              {
                value: productNameChoice,
                onChange: setProductNameChoice,
                style: { width: "100%" },
                options: [
                  { value: "source", label: `官网: ${result.sourceData.productName}` },
                  ...result.officialData?.productName ? [{
                    value: "official",
                    label: `理财网: ${result.officialData.productName}`
                  }] : []
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8, fontWeight: 500 }, children: "校验备注（可修改）" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Input.TextArea,
              {
                value: remark,
                onChange: (e) => setRemark(e.target.value),
                rows: 3,
                placeholder: "校验备注将写入产品 remark 字段"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { title: "入库数据预览", column: 2, size: "small", bordered: true, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "产品代码", children: result.sourceData.productCode }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "产品名称", children: productNameChoice === "official" && result.officialData?.productName ? result.officialData.productName : result.sourceData.productName }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "登记编码", children: result.sourceData.registerCode }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "风险等级", children: RISK_LEVELS[result.sourceData.riskLevel] }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "业绩基准", children: result.sourceData.benchmark || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "期限类型", children: TERM_TYPES[result.sourceData.termType] || "-" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: () => setStep(1), children: "返回对比" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", loading: submitting, onClick: handleConfirm, children: "确认入库" })
          ] })
        ] }),
        step === 3 && result && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { textAlign: "center", padding: "40px 0" }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(icons.CheckCircleOutlined, { style: { fontSize: 48, color: "#52c41a" } }),
          /* @__PURE__ */ jsxRuntime.jsxs("h3", { style: { marginTop: 16 }, children: [
            result.sourceData.productName,
            " 入库成功"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { color: "#999" }, children: [
            "产品代码: ",
            result.sourceData.productCode
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 24, display: "flex", gap: 8, justifyContent: "center" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: handleReset, children: "继续采集" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", onClick: handleClose, children: "关闭" })
          ] })
        ] })
      ]
    }
  );
};
const riskColors = { R1: "green", R2: "blue", R3: "orange", R4: "red", R5: "magenta" };
const ProductList = () => {
  const api = useApi();
  const navigate = reactRouterDom.useNavigate();
  const actionRef = react.useRef(null);
  const [formOpen, setFormOpen] = react.useState(false);
  const [collectOpen, setCollectOpen] = react.useState(false);
  const [current, setCurrent] = react.useState(void 0);
  const columns = [
    { title: "产品名称", dataIndex: "productName", ellipsis: true, width: 200 },
    { title: "产品代码", dataIndex: "productCode", width: 120 },
    { title: "类型", dataIndex: "productType", width: 100, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: PRODUCT_TYPES[r.productType] || r.productType }) },
    { title: "风险", dataIndex: "riskLevel", width: 80, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: riskColors[r.riskLevel], children: RISK_LEVELS[r.riskLevel] || r.riskLevel }) },
    { title: "发行机构", width: 120, render: (_, r) => r.company?.name || "-" },
    { title: "推荐权重", dataIndex: "recommendWeight", width: 90 },
    { title: "状态", dataIndex: "status", width: 80, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: r.status ? "green" : "default", children: r.status ? "启用" : "停用" }) },
    {
      title: "操作",
      width: 200,
      fixed: "right",
      valueType: "option",
      render: (_, r) => [
        /* @__PURE__ */ jsxRuntime.jsx("a", { onClick: () => {
          setCurrent(r);
          setFormOpen(true);
        }, children: "编辑" }, "edit"),
        /* @__PURE__ */ jsxRuntime.jsx("a", { onClick: () => navigate(`/plugins/zhao-wealth/metrics?productId=${r.id}`), children: "指标" }, "metrics"),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确定删除？", onConfirm: async () => {
          try {
            await api.deleteProduct(r.id);
            antd.message.success("删除成功");
            actionRef.current?.reload();
          } catch (e) {
            antd.message.error(e.message);
          }
        }, children: /* @__PURE__ */ jsxRuntime.jsx("a", { style: { color: "#ff4d4f" }, children: "删除" }) }, "del")
      ]
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      proComponents.ProTable,
      {
        rowKey: "id",
        actionRef,
        columns,
        scroll: { x: 1e3 },
        request: async (params) => {
          const query = { page: params.current, pageSize: params.pageSize };
          if (params.productName) query.productName = params.productName;
          if (params.productType) query.productType = params.productType;
          if (params.riskLevel) query.riskLevel = params.riskLevel;
          const res = await api.getProducts(query);
          return { data: res.records || [], total: res.total || 0, success: true };
        },
        toolBarRender: () => [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}), onClick: () => setCollectOpen(true), children: "采集产品" }, "collect"),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: () => {
            setCurrent(void 0);
            setFormOpen(true);
          }, children: "新建产品" }, "new")
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      ProductForm,
      {
        open: formOpen,
        onClose: () => setFormOpen(false),
        initialValues: current,
        onSuccess: () => {
          setFormOpen(false);
          actionRef.current?.reload();
        }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      CollectDrawer,
      {
        open: collectOpen,
        onClose: () => setCollectOpen(false),
        onSuccess: () => actionRef.current?.reload()
      }
    )
  ] });
};
const CompanyList = () => {
  const api = useApi();
  const actionRef = react.useRef(null);
  const [formOpen, setFormOpen] = react.useState(false);
  const [current, setCurrent] = react.useState(void 0);
  const columns = [
    { title: "公司名称", dataIndex: "name", width: 200 },
    { title: "简称", dataIndex: "shortName", width: 120, render: (_, r) => r.shortName || "-" },
    { title: "类型", dataIndex: "companyType", width: 120, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { children: COMPANY_TYPES[r.companyType] || r.companyType }) },
    { title: "官网", dataIndex: "website", ellipsis: true, render: (_, r) => r.website || "-" },
    { title: "状态", dataIndex: "status", width: 80, render: (_, r) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: r.status ? "green" : "default", children: r.status ? "启用" : "停用" }) },
    {
      title: "操作",
      width: 180,
      valueType: "option",
      render: (_, r) => [
        /* @__PURE__ */ jsxRuntime.jsx("a", { onClick: () => {
          setCurrent(r);
          setFormOpen(true);
        }, children: "编辑" }, "edit"),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "确定删除？", onConfirm: async () => {
          try {
            await api.deleteCompany(r.id);
            antd.message.success("删除成功");
            actionRef.current?.reload();
          } catch (e) {
            antd.message.error(e.message);
          }
        }, children: /* @__PURE__ */ jsxRuntime.jsx("a", { style: { color: "#ff4d4f" }, children: "删除" }) }, "del")
      ]
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      proComponents.ProTable,
      {
        rowKey: "id",
        actionRef,
        columns,
        search: false,
        request: async (params) => {
          const res = await api.getCompanies({ page: params.current, pageSize: params.pageSize });
          return { data: res.records || [], total: res.total || 0, success: true };
        },
        toolBarRender: () => [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: () => {
            setCurrent(void 0);
            setFormOpen(true);
          }, children: "新建公司" }, "new")
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      proComponents.ModalForm,
      {
        title: current ? "编辑公司" : "新建公司",
        open: formOpen,
        onOpenChange: (v) => {
          setFormOpen(v);
          if (!v) setCurrent(void 0);
        },
        initialValues: current || { companyType: "bank-subsidiary", status: true },
        modalProps: { destroyOnClose: true },
        onFinish: async (values) => {
          try {
            if (current) {
              await api.updateCompany(current.id, values);
              antd.message.success("更新成功");
            } else {
              await api.createCompany(values);
              antd.message.success("创建成功");
            }
            actionRef.current?.reload();
            return true;
          } catch (e) {
            antd.message.error(e.message);
            return false;
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "name", label: "公司名称", rules: [{ required: true }] }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "shortName", label: "简称" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSelect, { name: "companyType", label: "类型", options: Object.entries(COMPANY_TYPES).map(([v, l]) => ({ value: v, label: l })) }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormText, { name: "website", label: "官网地址" }),
          /* @__PURE__ */ jsxRuntime.jsx(proComponents.ProFormSwitch, { name: "status", label: "状态" })
        ]
      }
    )
  ] });
};
const Product = () => /* @__PURE__ */ jsxRuntime.jsx(
  antd.Tabs,
  {
    defaultActiveKey: "product",
    items: [
      { key: "product", label: "产品列表", children: /* @__PURE__ */ jsxRuntime.jsx(ProductList, {}) },
      { key: "company", label: "理财公司", children: /* @__PURE__ */ jsxRuntime.jsx(CompanyList, {}) }
    ]
  }
);
const App = () => /* @__PURE__ */ jsxRuntime.jsx(antd.ConfigProvider, { prefixCls: "zw", iconPrefixCls: "zw-icon", locale: zhCN__default.default, children: /* @__PURE__ */ jsxRuntime.jsx(PluginLayout, { children: /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(Dashboard, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "collect", element: /* @__PURE__ */ jsxRuntime.jsx(Collect, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "metrics", element: /* @__PURE__ */ jsxRuntime.jsx(Metrics, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "product", element: /* @__PURE__ */ jsxRuntime.jsx(Product, {}) }),
  /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx("div", { children: "404" }) })
] }) }) });
exports.App = App;
