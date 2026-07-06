import { jsxs, jsx } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { useNavigate, useParams, Routes, Route } from "react-router-dom";
import { useCallback, useState, useEffect } from "react";
import { Main, Box, Flex, Typography, Button, EmptyStateLayout, Table, Thead, Tr, Th, Tbody, Td, Status, Modal, Field, TextInput, Textarea, Grid, Switch } from "@strapi/design-system";
import { Plus, Pencil, Trash, ArrowLeft } from "@strapi/icons";
import { P as PLUGIN_ID } from "./index-C5-kHZPs.mjs";
const ADMIN_API_PREFIX = `/admin/plugins/${PLUGIN_ID}`;
function useChannelApi() {
  const { get, post, put, del } = useFetchClient();
  const getChannels = useCallback(
    async (params) => {
      const { data } = await get(`${ADMIN_API_PREFIX}/channels`, { params });
      return data;
    },
    [get]
  );
  const getChannel = useCallback(async (id) => {
    const { data } = await get(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [get]);
  const createChannel = useCallback(
    async (body) => {
      const { data } = await post(`${ADMIN_API_PREFIX}/channels`, body);
      return data;
    },
    [post]
  );
  const createRootChannel = useCallback(
    async (body) => {
      const { data } = await post(
        `${ADMIN_API_PREFIX}/channels`,
        body
      );
      return data;
    },
    [post]
  );
  const getChildren = useCallback(async (id) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/children`
    );
    return data;
  }, [get]);
  const getHierarchy = useCallback(async (id) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/hierarchy`
    );
    return data;
  }, [get]);
  const updateChannel = useCallback(
    async (id, body) => {
      const { data } = await put(
        `${ADMIN_API_PREFIX}/channels/${id}`,
        body
      );
      return data;
    },
    [put]
  );
  const deleteChannel = useCallback(async (id) => {
    const { data } = await del(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [del]);
  const getTierTree = useCallback(async (parentTier) => {
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
  const navigate = useNavigate();
  const { getChannels, createRootChannel, deleteChannel } = useChannelApi();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const fetchChannels = useCallback(async () => {
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
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsx(
      Box,
      {
        paddingTop: 6,
        paddingBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
        background: "neutral0",
        children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", tag: "h1", children: "根渠道管理" }),
            /* @__PURE__ */ jsx(Box, { paddingTop: 1, children: /* @__PURE__ */ jsx(Typography, { variant: "epsilon", textColor: "neutral600", tag: "p", children: "管理所有根级渠道及其下属渠道" }) })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              startIcon: /* @__PURE__ */ jsx(Plus, {}),
              onClick: () => setShowCreateModal(true),
              children: "创建根渠道"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsx(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: loading ? /* @__PURE__ */ jsx(Box, { padding: 8, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsx(Typography, { children: "加载中..." }) }) : error ? /* @__PURE__ */ jsxs(Box, { padding: 8, background: "neutral100", borderRadius: 4, children: [
      /* @__PURE__ */ jsx(Typography, { textColor: "danger600", children: error }),
      /* @__PURE__ */ jsx(Box, { marginTop: 2, children: /* @__PURE__ */ jsx(Button, { onClick: fetchChannels, children: "重试" }) })
    ] }) : channels.length === 0 ? /* @__PURE__ */ jsx(Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsx(
      EmptyStateLayout,
      {
        icon: /* @__PURE__ */ jsx(Plus, {}),
        content: "暂无根渠道，点击上方按钮创建",
        action: /* @__PURE__ */ jsx(
          Button,
          {
            startIcon: /* @__PURE__ */ jsx(Plus, {}),
            onClick: () => setShowCreateModal(true),
            children: "创建根渠道"
          }
        )
      }
    ) }) : /* @__PURE__ */ jsx(Box, { background: "neutral0", borderRadius: 4, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Table, { colCount: 6, rowCount: channels.length, children: [
      /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "名称" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "编码" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "层级" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "创建时间" }) }),
        /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
      ] }) }),
      /* @__PURE__ */ jsx(Tbody, { children: channels.map((channel) => /* @__PURE__ */ jsxs(Tr, { children: [
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
          Typography,
          {
            fontWeight: "bold",
            textColor: "primary600",
            style: { cursor: "pointer" },
            onClick: () => navTo(channel.id),
            children: channel.attributes.name
          }
        ) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: channel.attributes.code }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: channel.attributes.channelTier }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
          Status,
          {
            variant: channel.attributes.status ? "success" : "danger",
            children: /* @__PURE__ */ jsx(Typography, { children: channel.attributes.status ? "启用" : "禁用" })
          }
        ) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: new Date(
          channel.attributes.createdAt
        ).toLocaleDateString() }) }),
        /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "S",
              variant: "tertiary",
              startIcon: /* @__PURE__ */ jsx(Pencil, {}),
              onClick: () => navTo(channel.id),
              children: "管理"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "S",
              variant: "danger-light",
              startIcon: /* @__PURE__ */ jsx(Trash, {}),
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
    showCreateModal && /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: showCreateModal,
        onOpenChange: (open) => {
          if (!open) {
            setShowCreateModal(false);
            setCreateError(null);
          }
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "创建根渠道" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxs(Field.Root, { name: "name", required: true, children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "渠道名称" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: createName,
                  onChange: (e) => setCreateName(e.target.value),
                  placeholder: "输入渠道名称"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "description", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "渠道描述" }),
              /* @__PURE__ */ jsx(
                Textarea,
                {
                  value: createDesc,
                  onChange: (e) => setCreateDesc(e.target.value),
                  placeholder: "可选：输入渠道描述"
                }
              )
            ] }),
            createError && /* @__PURE__ */ jsx(Typography, { textColor: "danger600", variant: "pi", children: createError })
          ] }) }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "tertiary",
                onClick: () => {
                  setShowCreateModal(false);
                  setCreateError(null);
                },
                children: "取消"
              }
            ),
            /* @__PURE__ */ jsx(Button, { onClick: handleCreate, loading: createLoading, children: "确认创建" })
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
  const renderNode = (node, depth) => /* @__PURE__ */ jsxs(Box, { paddingLeft: depth * 4, children: [
    /* @__PURE__ */ jsxs(
      Box,
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
  return /* @__PURE__ */ jsxs(
    Box,
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
        /* @__PURE__ */ jsxs(
          Box,
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
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;
  return /* @__PURE__ */ jsxs(Box, { marginLeft: 4, marginTop: 1, children: [
    /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: hasChildren ? "▾" : "·" }),
      /* @__PURE__ */ jsx(
        Typography,
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
      /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral500", children: [
        "(",
        node.channelTier,
        ")"
      ] })
    ] }),
    hasChildren && node.children.map((child) => /* @__PURE__ */ jsx(TreeNode, { node: child }, child.id))
  ] });
}
function TabButton({
  active,
  label,
  onClick
}) {
  return /* @__PURE__ */ jsx(
    Box,
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
  const { id } = useParams();
  const navigate = useNavigate();
  const channelId = Number(id);
  const {
    getChannel,
    getChildren,
    getHierarchy,
    updateChannel,
    deleteChannel,
    createChannel
  } = useChannelApi();
  const [channel, setChannel] = useState(null);
  const [children, setChildren] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const TABS = ["详情", `子渠道 (0)`, "层级关系"];
  const [activeTab, setActiveTab] = useState(0);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [childName, setChildName] = useState("");
  const [childDesc, setChildDesc] = useState("");
  const [childTier, setChildTier] = useState("");
  const [tierTree, setTierTree] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fetchData = useCallback(async () => {
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
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (activeTab === 2) {
      getHierarchy(channelId).then((result) => setHierarchy(result?.hierarchy || null)).catch(() => {
      });
    }
  }, [activeTab, channelId, getHierarchy]);
  useEffect(() => {
    TABS[1] = `子渠道 (${children.length})`;
  }, [children.length]);
  useEffect(() => {
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
    return /* @__PURE__ */ jsxs(Main, { children: [
      /* @__PURE__ */ jsx(
        Box,
        {
          paddingTop: 6,
          paddingBottom: 4,
          paddingLeft: 10,
          paddingRight: 10,
          background: "neutral0",
          children: /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "加载中..." })
        }
      ),
      /* @__PURE__ */ jsx(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: /* @__PURE__ */ jsx(Typography, { children: "加载渠道详情..." }) })
    ] });
  }
  if (error || !channel) {
    return /* @__PURE__ */ jsxs(Main, { children: [
      /* @__PURE__ */ jsx(
        Box,
        {
          paddingTop: 6,
          paddingBottom: 4,
          paddingLeft: 10,
          paddingRight: 10,
          background: "neutral0",
          children: /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", children: [
            /* @__PURE__ */ jsxs(
              Typography,
              {
                textColor: "primary600",
                style: { cursor: "pointer" },
                onClick: navToList,
                children: [
                  /* @__PURE__ */ jsx(ArrowLeft, {}),
                  " 返回"
                ]
              }
            ),
            /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "渠道详情" })
          ] })
        }
      ),
      /* @__PURE__ */ jsxs(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
        /* @__PURE__ */ jsx(Typography, { textColor: "danger600", children: error || "渠道不存在" }),
        /* @__PURE__ */ jsx(Box, { marginTop: 2, children: /* @__PURE__ */ jsx(Button, { onClick: fetchData, children: "重试" }) })
      ] })
    ] });
  }
  const { attributes } = channel;
  return /* @__PURE__ */ jsxs(Main, { children: [
    /* @__PURE__ */ jsxs(
      Box,
      {
        paddingTop: 6,
        paddingBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
        background: "neutral0",
        children: [
          /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", marginBottom: 2, children: [
            /* @__PURE__ */ jsxs(
              Typography,
              {
                textColor: "primary600",
                style: { cursor: "pointer" },
                onClick: navToList,
                children: [
                  /* @__PURE__ */ jsx(ArrowLeft, {}),
                  " 返回"
                ]
              }
            ),
            /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: attributes.name })
          ] }),
          /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
            /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral600", children: [
              "层级: ",
              attributes.channelTier,
              " · 编码: ",
              attributes.code
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "danger-light",
                startIcon: /* @__PURE__ */ jsx(Trash, {}),
                onClick: handleDeleteChannel,
                loading: deleting,
                children: "删除渠道"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      Box,
      {
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 2,
        style: { borderBottom: "1px solid #EAEAEF" },
        children: /* @__PURE__ */ jsx(Flex, { gap: 0, children: TABS.map((label, index) => /* @__PURE__ */ jsx(
          TabButton,
          {
            active: activeTab === index,
            label: index === 1 ? `子渠道 (${children.length})` : label,
            onClick: () => setActiveTab(index)
          },
          index
        )) })
      }
    ),
    /* @__PURE__ */ jsxs(Box, { paddingLeft: 10, paddingRight: 10, paddingTop: 4, children: [
      activeTab === 0 && /* @__PURE__ */ jsxs(Box, { padding: 4, background: "neutral100", borderRadius: 4, children: [
        /* @__PURE__ */ jsxs(Grid.Root, { gap: 4, children: [
          /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "name", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "名称" }),
            /* @__PURE__ */ jsx(
              TextInput,
              {
                value: editName,
                onChange: (e) => setEditName(e.target.value)
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 6, children: /* @__PURE__ */ jsxs(Field.Root, { name: "code", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "编码" }),
            /* @__PURE__ */ jsx(TextInput, { value: attributes.code, disabled: true })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "tier", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "层级类型" }),
            /* @__PURE__ */ jsx(TextInput, { value: attributes.channelTier, disabled: true })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "depth", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "层级深度" }),
            /* @__PURE__ */ jsx(TextInput, { value: String(attributes.depth), disabled: true })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "path", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "路径" }),
            /* @__PURE__ */ jsx(TextInput, { value: attributes.path, disabled: true })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Box, { marginTop: 4, children: /* @__PURE__ */ jsxs(Field.Root, { name: "description", children: [
          /* @__PURE__ */ jsx(Field.Label, { children: "渠道描述" }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              value: editDescription,
              onChange: (e) => setEditDescription(e.target.value)
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(Box, { marginTop: 4, children: /* @__PURE__ */ jsxs(Flex, { gap: 4, alignItems: "center", children: [
          /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", children: "启用状态" }),
          /* @__PURE__ */ jsx(
            Switch,
            {
              checked: editStatus,
              onCheckedChange: (checked) => setEditStatus(checked),
              onLabel: "启用",
              offLabel: "禁用"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(Box, { marginTop: 4, children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: saving, children: "保存修改" }) })
      ] }),
      activeTab === 1 && /* @__PURE__ */ jsxs(Box, { padding: 4, children: [
        /* @__PURE__ */ jsx(Flex, { justifyContent: "end", marginBottom: 4, children: /* @__PURE__ */ jsx(
          Button,
          {
            startIcon: /* @__PURE__ */ jsx(Plus, {}),
            onClick: () => setShowCreateModal(true),
            children: "创建子渠道"
          }
        ) }),
        children.length === 0 ? /* @__PURE__ */ jsx(Box, { background: "neutral100", padding: 8, borderRadius: 4, children: /* @__PURE__ */ jsx(EmptyStateLayout, { content: "暂无子渠道" }) }) : /* @__PURE__ */ jsx(
          Box,
          {
            background: "neutral0",
            borderRadius: 4,
            shadow: "filterShadow",
            children: /* @__PURE__ */ jsxs(Table, { colCount: 5, rowCount: children.length, children: [
              /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
                /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "名称" }) }),
                /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "编码" }) }),
                /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "层级" }) }),
                /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "状态" }) }),
                /* @__PURE__ */ jsx(Th, { children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: "操作" }) })
              ] }) }),
              /* @__PURE__ */ jsx(Tbody, { children: children.map((child) => /* @__PURE__ */ jsxs(Tr, { children: [
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
                  Typography,
                  {
                    fontWeight: "bold",
                    textColor: "primary600",
                    style: { cursor: "pointer" },
                    onClick: () => navTo(child.id),
                    children: child.attributes.name
                  }
                ) }),
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: child.attributes.code }) }),
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { children: child.attributes.channelTier }) }),
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
                  Status,
                  {
                    variant: child.attributes.status ? "success" : "danger",
                    children: /* @__PURE__ */ jsx(Typography, { children: child.attributes.status ? "启用" : "禁用" })
                  }
                ) }),
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "S",
                      variant: "tertiary",
                      onClick: () => navTo(child.id),
                      children: "管理"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "S",
                      variant: "danger-light",
                      startIcon: /* @__PURE__ */ jsx(Trash, {}),
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
      activeTab === 2 && /* @__PURE__ */ jsx(Box, { padding: 4, children: !hierarchy ? /* @__PURE__ */ jsx(Typography, { textColor: "neutral500", children: "加载层级关系中..." }) : /* @__PURE__ */ jsx(Box, { background: "neutral100", padding: 4, borderRadius: 4, children: /* @__PURE__ */ jsx(TreeNode, { node: hierarchy }) }) })
    ] }),
    showCreateModal && /* @__PURE__ */ jsx(
      Modal.Root,
      {
        open: showCreateModal,
        onOpenChange: (open) => {
          if (!open) {
            setShowCreateModal(false);
            setCreateError(null);
          }
        },
        children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { closeLabel: "关闭", children: /* @__PURE__ */ jsx(Modal.Title, { children: "创建子渠道" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, alignItems: "stretch", children: [
            /* @__PURE__ */ jsxs(Field.Root, { name: "childName", required: true, children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "渠道名称" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: childName,
                  onChange: (e) => setChildName(e.target.value),
                  placeholder: "输入子渠道名称"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "childDesc", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "渠道描述" }),
              /* @__PURE__ */ jsx(
                Textarea,
                {
                  value: childDesc,
                  onChange: (e) => setChildDesc(e.target.value),
                  placeholder: "可选"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "childTier", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "层级类型（可选）" }),
              /* @__PURE__ */ jsxs(Box, { children: [
                /* @__PURE__ */ jsx(Box, { marginBottom: 2, children: /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral500", children: [
                  "父渠道层级: ",
                  attributes.channelTier,
                  "，不选则自动推断"
                ] }) }),
                /* @__PURE__ */ jsx(
                  TierTreeSelect,
                  {
                    tree: tierTree,
                    value: childTier,
                    onChange: setChildTier
                  }
                )
              ] })
            ] }),
            createError && /* @__PURE__ */ jsx(Typography, { textColor: "danger600", variant: "pi", children: createError })
          ] }) }),
          /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "tertiary",
                onClick: () => {
                  setShowCreateModal(false);
                  setCreateError(null);
                },
                children: "取消"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
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
  return /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "channels/:id", element: /* @__PURE__ */ jsx(ChannelDetailPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Page.Error, {}) })
  ] });
};
export {
  App
};
