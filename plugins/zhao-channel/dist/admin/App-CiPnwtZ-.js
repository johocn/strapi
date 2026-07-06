"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const admin = require("@strapi/strapi/admin");
const reactRouterDom = require("react-router-dom");
const react = require("react");
const designSystem = require("@strapi/design-system");
const icons = require("@strapi/icons");
const index = require("./index-BK5lKmCQ.js");
const ADMIN_API_PREFIX = `/admin/plugins/${index.PLUGIN_ID}`;
function useChannelApi() {
  const { get, post, put, del } = admin.useFetchClient();
  const getChannels = react.useCallback(
    async (params) => {
      const { data } = await get(`${ADMIN_API_PREFIX}/channels`, { params });
      return data;
    },
    [get]
  );
  const getChannel = react.useCallback(async (id) => {
    const { data } = await get(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [get]);
  const createChannel = react.useCallback(
    async (body) => {
      const { data } = await post(`${ADMIN_API_PREFIX}/channels`, body);
      return data;
    },
    [post]
  );
  const createRootChannel = react.useCallback(
    async (body) => {
      const { data } = await post(
        `${ADMIN_API_PREFIX}/channels`,
        body
      );
      return data;
    },
    [post]
  );
  const getChildren = react.useCallback(async (id) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/children`
    );
    return data;
  }, [get]);
  const getHierarchy = react.useCallback(async (id) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/hierarchy`
    );
    return data;
  }, [get]);
  const updateChannel = react.useCallback(
    async (id, body) => {
      const { data } = await put(
        `${ADMIN_API_PREFIX}/channels/${id}`,
        body
      );
      return data;
    },
    [put]
  );
  const deleteChannel = react.useCallback(async (id) => {
    const { data } = await del(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [del]);
  const getTierTree = react.useCallback(async (parentTier) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/tier-tree/${parentTier}`
    );
    return data;
  }, [get]);
  return {
    getChannels,
    getChannel,
    createChannel,
    createRootChannel,
    getChildren,
    getHierarchy,
    updateChannel,
    deleteChannel,
    getTierTree
  };
}
const HomePage = () => {
  const navigate = reactRouterDom.useNavigate();
  const { getChannels, createRootChannel, deleteChannel } = useChannelApi();
  const [channels, setChannels] = react.useState([]);
  const [loading, setLoading] = react.useState(true);
  const [error, setError] = react.useState(null);
  const [showCreateModal, setShowCreateModal] = react.useState(false);
  const [createName, setCreateName] = react.useState("");
  const [createDesc, setCreateDesc] = react.useState("");
  const [createLoading, setCreateLoading] = react.useState(false);
  const [createError, setCreateError] = react.useState(null);
  const fetchChannels = react.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getChannels({ depth: 0 });
      setChannels(result?.data || []);
    } catch (err) {
      setError(err?.message || "加载渠道列表失败");
    } finally {
      setLoading(false);
    }
  }, [getChannels]);
  react.useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);
  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError("渠道名称不能为空");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createRootChannel({
        name: createName.trim(),
        description: createDesc.trim() || void 0
      });
      setShowCreateModal(false);
      setCreateName("");
      setCreateDesc("");
      await fetchChannels();
    } catch (err) {
      setCreateError(err?.message || "创建失败");
    } finally {
      setCreateLoading(false);
    }
  };
  const handleDelete = async (id, name) => {
    if (!window.confirm(
      `确定要删除渠道 "${name}" 吗？此操作将级联删除所有子渠道且不可恢复。`
    )) {
      return;
    }
    try {
      await deleteChannel(id);
      await fetchChannels();
    } catch (err) {
      alert(err?.message || "删除失败");
    }
  };
  const navTo = (id) => {
    navigate(`/plugins/zhao-channel/channels/${id}`);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Main, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.Box,
      {
        paddingTop: 6,
        paddingBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
        background: "neutral0",
        children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", tag: "h1", children: "根渠道管理" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 1, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", textColor: "neutral600", tag: "p", children: "管理所有根级渠道及其下属渠道" }) })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Button,
            {
              startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Plus, {}),
              onClick: () => setShowCreateModal(true),
              children: "创建根渠道"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: loading ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: "加载中..." }) }) : error ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, background: "neutral100", borderRadius: 4, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "danger600", children: error }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 2, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: fetchChannels, children: "重试" }) })
    ] }) : channels.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.EmptyStateLayout,
      {
        icon: /* @__PURE__ */ jsxRuntime.jsx(icons.Plus, {}),
        content: "暂无根渠道，点击上方按钮创建",
        action: /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Plus, {}),
            onClick: () => setShowCreateModal(true),
            children: "创建根渠道"
          }
        )
      }
    ) }) : /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 6, rowCount: channels.length, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "名称" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "编码" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "层级" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "状态" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "创建时间" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "操作" }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: channels.map((channel) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Typography,
          {
            fontWeight: "bold",
            textColor: "primary600",
            style: { cursor: "pointer" },
            onClick: () => navTo(channel.id),
            children: channel.attributes.name
          }
        ) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral600", children: channel.attributes.code }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: channel.attributes.channelTier }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Status,
          {
            variant: channel.attributes.status ? "success" : "danger",
            children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: channel.attributes.status ? "启用" : "禁用" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral600", children: new Date(
          channel.attributes.createdAt
        ).toLocaleDateString() }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Button,
            {
              size: "S",
              variant: "tertiary",
              startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Pencil, {}),
              onClick: () => navTo(channel.id),
              children: "管理"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Button,
            {
              size: "S",
              variant: "danger-light",
              startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Trash, {}),
              onClick: () => handleDelete(
                channel.id,
                channel.attributes.name
              ),
              children: "删除"
            }
          )
        ] }) })
      ] }, channel.id)) })
    ] }) }) }),
    showCreateModal && /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.Modal.Root,
      {
        open: showCreateModal,
        onOpenChange: (open) => {
          if (!open) {
            setShowCreateModal(false);
            setCreateError(null);
          }
        },
        children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: "创建根渠道" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "name", required: true, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "渠道名称" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.TextInput,
                {
                  value: createName,
                  onChange: (e) => setCreateName(e.target.value),
                  placeholder: "输入渠道名称"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "description", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "渠道描述" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Textarea,
                {
                  value: createDesc,
                  onChange: (e) => setCreateDesc(e.target.value),
                  placeholder: "可选：输入渠道描述"
                }
              )
            ] }),
            createError && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "danger600", variant: "pi", children: createError })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                variant: "tertiary",
                onClick: () => {
                  setShowCreateModal(false);
                  setCreateError(null);
                },
                children: "取消"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: handleCreate, loading: createLoading, children: "确认创建" })
          ] }) })
        ] })
      }
    )
  ] });
};
const TIER_CHILDREN_MAP = {
  root: ["core", "senior", "global", "authorized", "official", "partner", "agent"],
  core: ["national"],
  senior: ["national"],
  global: ["national"],
  authorized: ["national"],
  official: ["national"],
  partner: ["national"],
  agent: ["national"],
  national: ["regional"],
  regional: ["city"],
  city: ["county"],
  county: ["local"],
  local: ["store"],
  store: []
};
function buildTierTree(parentTier) {
  return (TIER_CHILDREN_MAP[parentTier] || []).map((child) => ({
    tier: child,
    children: buildTierTree(child)
  }));
}
function TierTreeSelect({
  tree,
  value,
  onChange
}) {
  const renderNode = (node, depth) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { paddingLeft: depth * 4, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      designSystem.Box,
      {
        tag: "button",
        style: {
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "6px 8px",
          border: "none",
          borderRadius: "4px",
          background: value === node.tier ? "#E9EAFF" : "transparent",
          cursor: "pointer",
          fontWeight: value === node.tier ? 600 : 400,
          color: "#32324D",
          fontSize: "14px"
        },
        onClick: () => onChange(value === node.tier ? "" : node.tier),
        children: [
          value === node.tier ? "◉ " : "○ ",
          node.tier
        ]
      }
    ),
    node.children.map((child) => renderNode(child, depth + 1))
  ] }, node.tier);
  return /* @__PURE__ */ jsxRuntime.jsxs(
    designSystem.Box,
    {
      style: {
        border: "1px solid #DCDCE4",
        borderRadius: "4px",
        padding: "4px",
        maxHeight: "240px",
        overflowY: "auto",
        background: "#FFFFFF"
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs(
          designSystem.Box,
          {
            tag: "button",
            style: {
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 8px",
              border: "none",
              borderRadius: "4px",
              background: !value ? "#E9EAFF" : "transparent",
              cursor: "pointer",
              fontWeight: !value ? 600 : 400,
              color: "#666687",
              fontSize: "14px"
            },
            onClick: () => onChange(""),
            children: [
              !value ? "◉ " : "○ ",
              "不选（自动推断）"
            ]
          }
        ),
        tree.map((node) => renderNode(node, 0))
      ]
    }
  );
}
function TreeNode({ node }) {
  const navigate = reactRouterDom.useNavigate();
  const hasChildren = node.children && node.children.length > 0;
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { marginLeft: 4, marginTop: 1, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral600", children: hasChildren ? "▾" : "·" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Typography,
        {
          textColor: "primary600",
          fontWeight: node.depth === 0 ? "bold" : void 0,
          style: { cursor: "pointer" },
          onClick: () => navigate(
            `/plugins/zhao-channel/channels/${node.id}`
          ),
          children: node.name
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
        "(",
        node.channelTier,
        ")"
      ] })
    ] }),
    hasChildren && node.children.map((child) => /* @__PURE__ */ jsxRuntime.jsx(TreeNode, { node: child }, child.id))
  ] });
}
function TabButton({
  active,
  label,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntime.jsx(
    designSystem.Box,
    {
      tag: "button",
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 4,
      paddingRight: 4,
      style: {
        cursor: "pointer",
        border: "none",
        borderBottom: active ? "2px solid #4945FF" : "2px solid transparent",
        background: "transparent",
        fontWeight: active ? 600 : 400,
        color: active ? "#4945FF" : "#666"
      },
      onClick,
      children: label
    }
  );
}
const ChannelDetailPage = () => {
  const { id } = reactRouterDom.useParams();
  const navigate = reactRouterDom.useNavigate();
  const channelId = Number(id);
  const {
    getChannel,
    getChildren,
    getHierarchy,
    updateChannel,
    deleteChannel,
    createChannel
  } = useChannelApi();
  const [channel, setChannel] = react.useState(null);
  const [children, setChildren] = react.useState([]);
  const [hierarchy, setHierarchy] = react.useState(null);
  const [loading, setLoading] = react.useState(true);
  const [error, setError] = react.useState(null);
  const TABS = ["详情", `子渠道 (0)`, "层级关系"];
  const [activeTab, setActiveTab] = react.useState(0);
  const [editName, setEditName] = react.useState("");
  const [editDescription, setEditDescription] = react.useState("");
  const [editStatus, setEditStatus] = react.useState(true);
  const [saving, setSaving] = react.useState(false);
  const [showCreateModal, setShowCreateModal] = react.useState(false);
  const [childName, setChildName] = react.useState("");
  const [childDesc, setChildDesc] = react.useState("");
  const [childTier, setChildTier] = react.useState("");
  const [tierTree, setTierTree] = react.useState([]);
  const [createLoading, setCreateLoading] = react.useState(false);
  const [createError, setCreateError] = react.useState(null);
  const [deleting, setDeleting] = react.useState(false);
  const fetchData = react.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chanResult, childrenResult] = await Promise.all([
        getChannel(channelId),
        getChildren(channelId)
      ]);
      if (!chanResult?.data) {
        setError("渠道不存在");
      } else {
        setChannel(chanResult.data);
        setEditName(chanResult.data.attributes.name || "");
        setEditDescription(chanResult.data.attributes.description || "");
        setEditStatus(chanResult.data.attributes.status);
      }
      setChildren(childrenResult?.data || []);
    } catch (err) {
      setError(err?.message || "加载渠道详情失败");
    } finally {
      setLoading(false);
    }
  }, [channelId, getChannel, getChildren]);
  react.useEffect(() => {
    fetchData();
  }, [fetchData]);
  react.useEffect(() => {
    if (activeTab === 2) {
      getHierarchy(channelId).then((result) => setHierarchy(result?.hierarchy || null)).catch(() => {
      });
    }
  }, [activeTab, channelId, getHierarchy]);
  react.useEffect(() => {
    TABS[1] = `子渠道 (${children.length})`;
  }, [children.length]);
  react.useEffect(() => {
    if (showCreateModal && channel) {
      setChildTier("");
      setTierTree(buildTierTree(channel.attributes.channelTier));
    }
  }, [showCreateModal, channel]);
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateChannel(channelId, {
        name: editName,
        description: editDescription,
        status: editStatus
      });
      if (result?.data) {
        setChannel(result.data);
        setEditName(result.data.attributes.name || "");
        setEditDescription(result.data.attributes.description || "");
        setEditStatus(result.data.attributes.status);
      }
    } catch (err) {
      alert(err?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteChannel = async () => {
    if (!channel) return;
    if (!window.confirm(
      `确定要删除渠道 "${channel.attributes.name}" 吗？此操作将级联删除所有子渠道且不可恢复。`
    )) {
      return;
    }
    setDeleting(true);
    try {
      await deleteChannel(channelId);
      navigate(`/plugins/zhao-channel`);
    } catch (err) {
      alert(err?.message || "删除失败");
      setDeleting(false);
    }
  };
  const handleCreateChild = async () => {
    if (!childName.trim()) {
      setCreateError("渠道名称不能为空");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body = {
        name: childName.trim(),
        parentChannel: channelId
      };
      if (childDesc.trim()) body.description = childDesc.trim();
      if (childTier.trim()) body.channelTier = childTier.trim();
      await createChannel(body);
      setShowCreateModal(false);
      setChildName("");
      setChildDesc("");
      setChildTier("");
      await fetchData();
    } catch (err) {
      setCreateError(err?.message || "创建失败");
    } finally {
      setCreateLoading(false);
    }
  };
  const handleDeleteChild = async (childId, childNameStr) => {
    if (!window.confirm(`确定要删除子渠道 "${childNameStr}" 吗？`)) return;
    try {
      await deleteChannel(childId);
      await fetchData();
    } catch (err) {
      alert(err?.message || "删除失败");
    }
  };
  const navToList = () => {
    navigate(`/plugins/zhao-channel`);
  };
  const navTo = (cid) => {
    navigate(`/plugins/zhao-channel/channels/${cid}`);
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Main, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Box,
        {
          paddingTop: 6,
          paddingBottom: 4,
          paddingLeft: 10,
          paddingRight: 10,
          background: "neutral0",
          children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "加载中..." })
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: "加载渠道详情..." }) })
    ] });
  }
  if (error || !channel) {
    return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Main, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Box,
        {
          paddingTop: 6,
          paddingBottom: 4,
          paddingLeft: 10,
          paddingRight: 10,
          background: "neutral0",
          children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              designSystem.Typography,
              {
                textColor: "primary600",
                style: { cursor: "pointer" },
                onClick: navToList,
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowLeft, {}),
                  " 返回"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "渠道详情" })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "danger600", children: error || "渠道不存在" }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 2, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: fetchData, children: "重试" }) })
      ] })
    ] });
  }
  const { attributes } = channel;
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Main, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      designSystem.Box,
      {
        paddingTop: 6,
        paddingBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
        background: "neutral0",
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, alignItems: "center", marginBottom: 2, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              designSystem.Typography,
              {
                textColor: "primary600",
                style: { cursor: "pointer" },
                onClick: navToList,
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowLeft, {}),
                  " 返回"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: attributes.name })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: [
              "层级: ",
              attributes.channelTier,
              " · 编码: ",
              attributes.code
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                variant: "danger-light",
                startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Trash, {}),
                onClick: handleDeleteChannel,
                loading: deleting,
                children: "删除渠道"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.Box,
      {
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 2,
        style: { borderBottom: "1px solid #EAEAEF" },
        children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { gap: 0, children: TABS.map((label, index2) => /* @__PURE__ */ jsxRuntime.jsx(
          TabButton,
          {
            active: activeTab === index2,
            label: index2 === 1 ? `子渠道 (${children.length})` : label,
            onClick: () => setActiveTab(index2)
          },
          index2
        )) })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
      activeTab === 0 && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 4, background: "neutral100", borderRadius: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Grid.Root, { gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "name", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "名称" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.TextInput,
              {
                value: editName,
                onChange: (e) => setEditName(e.target.value)
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 6, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "code", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "编码" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.TextInput, { value: attributes.code, disabled: true })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "tier", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "层级类型" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.TextInput, { value: attributes.channelTier, disabled: true })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "depth", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "层级深度" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.TextInput, { value: String(attributes.depth), disabled: true })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "path", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "路径" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.TextInput, { value: attributes.path, disabled: true })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "description", children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "渠道描述" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Textarea,
            {
              value: editDescription,
              onChange: (e) => setEditDescription(e.target.value)
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "bold", children: "启用状态" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Switch,
            {
              checked: editStatus,
              onCheckedChange: (checked) => setEditStatus(checked),
              onLabel: "启用",
              offLabel: "禁用"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: handleSave, loading: saving, children: "保存修改" }) })
      ] }),
      activeTab === 1 && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "end", marginBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Plus, {}),
            onClick: () => setShowCreateModal(true),
            children: "创建子渠道"
          }
        ) }),
        children.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.EmptyStateLayout, { content: "暂无子渠道" }) }) : /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Box,
          {
            background: "neutral0",
            borderRadius: 4,
            shadow: "filterShadow",
            children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 5, rowCount: children.length, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "名称" }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "编码" }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "层级" }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "状态" }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", children: "操作" }) })
              ] }) }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: children.map((child) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(
                  designSystem.Typography,
                  {
                    fontWeight: "bold",
                    textColor: "primary600",
                    style: { cursor: "pointer" },
                    onClick: () => navTo(child.id),
                    children: child.attributes.name
                  }
                ) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral600", children: child.attributes.code }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: child.attributes.channelTier }) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(
                  designSystem.Status,
                  {
                    variant: child.attributes.status ? "success" : "danger",
                    children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: child.attributes.status ? "启用" : "禁用" })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.Button,
                    {
                      size: "S",
                      variant: "tertiary",
                      onClick: () => navTo(child.id),
                      children: "管理"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.Button,
                    {
                      size: "S",
                      variant: "danger-light",
                      startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Trash, {}),
                      onClick: () => handleDeleteChild(
                        child.id,
                        child.attributes.name
                      ),
                      children: "删除"
                    }
                  )
                ] }) })
              ] }, child.id)) })
            ] })
          }
        )
      ] }),
      activeTab === 2 && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, children: !hierarchy ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral500", children: "加载层级关系中..." }) : /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { background: "neutral100", padding: 4, borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(TreeNode, { node: hierarchy }) }) })
    ] }),
    showCreateModal && /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.Modal.Root,
      {
        open: showCreateModal,
        onOpenChange: (open) => {
          if (!open) {
            setShowCreateModal(false);
            setCreateError(null);
          }
        },
        children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: "创建子渠道" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "childName", required: true, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "渠道名称" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.TextInput,
                {
                  value: childName,
                  onChange: (e) => setChildName(e.target.value),
                  placeholder: "输入子渠道名称"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "childDesc", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "渠道描述" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Textarea,
                {
                  value: childDesc,
                  onChange: (e) => setChildDesc(e.target.value),
                  placeholder: "可选"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "childTier", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "层级类型（可选）" }),
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginBottom: 2, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral500", children: [
                  "父渠道层级: ",
                  attributes.channelTier,
                  "，不选则自动推断"
                ] }) }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  TierTreeSelect,
                  {
                    tree: tierTree,
                    value: childTier,
                    onChange: setChildTier
                  }
                )
              ] })
            ] }),
            createError && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "danger600", variant: "pi", children: createError })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                variant: "tertiary",
                onClick: () => {
                  setShowCreateModal(false);
                  setCreateError(null);
                },
                children: "取消"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                onClick: handleCreateChild,
                loading: createLoading,
                children: "确认创建"
              }
            )
          ] }) })
        ] })
      }
    )
  ] });
};
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(HomePage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "channels/:id", element: /* @__PURE__ */ jsxRuntime.jsx(ChannelDetailPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Error, {}) })
  ] });
};
exports.App = App;
