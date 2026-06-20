import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Modal,
  Field,
  TextInput,
  Textarea,
  Status,
  EmptyStateLayout,
  Switch,
  Grid,
} from "@strapi/design-system";
import { Plus, Trash, ArrowLeft } from "@strapi/icons";
import { useChannelApi } from "../utils/api";

interface ChannelAttrs {
  name: string;
  code: string;
  channelTier: string;
  status: boolean;
  description: string;
  path: string;
  depth: number;
  createdAt: string;
  parentChannelId: { id: number; name: string } | null;
}

interface ChannelData {
  id: number;
  attributes: ChannelAttrs;
}

interface HierarchyNode {
  id: number;
  name: string;
  code: string;
  channelTier: string;
  path: string;
  depth: number;
  children: HierarchyNode[];
}

interface TierTreeOption {
  tier: string;
  children: TierTreeOption[];
}

// 层级父子关系映射表（与服务端 config/tiers.ts 保持一致）
const TIER_CHILDREN_MAP: Record<string, string[]> = {
  root:       ["core", "senior", "global", "authorized", "official", "partner", "agent"],
  core:       ["national"],
  senior:     ["national"],
  global:     ["national"],
  authorized: ["national"],
  official:   ["national"],
  partner:    ["national"],
  agent:      ["national"],
  national:   ["regional"],
  regional:   ["city"],
  city:       ["county"],
  county:     ["local"],
  local:      ["store"],
  store:      [],
};

/** 递归构建层级树 */
function buildTierTree(parentTier: string): TierTreeOption[] {
  return (TIER_CHILDREN_MAP[parentTier] || []).map((child) => ({
    tier: child,
    children: buildTierTree(child),
  }));
}

// ── 层级树形选择组件 ──

function TierTreeSelect({
  tree,
  value,
  onChange,
}: {
  tree: TierTreeOption[];
  value: string;
  onChange: (tier: string) => void;
}) {
  const renderNode = (node: TierTreeOption, depth: number) => (
    <Box key={node.tier} paddingLeft={depth * 4}>
      <Box
        tag="button"
        style={{
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
          fontSize: "14px",
        }}
        onClick={() => onChange(value === node.tier ? "" : node.tier)}
      >
        {value === node.tier ? "\u25C9 " : "\u25CB "}
        {node.tier}
      </Box>
      {node.children.map((child) => renderNode(child, depth + 1))}
    </Box>
  );

  return (
    <Box
      style={{
        border: "1px solid #DCDCE4",
        borderRadius: "4px",
        padding: "4px",
        maxHeight: "240px",
        overflowY: "auto",
        background: "#FFFFFF",
      }}
    >
      <Box
        tag="button"
        style={{
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
          fontSize: "14px",
        }}
        onClick={() => onChange("")}
      >
        {!value ? "\u25C9 " : "\u25CB "}
        不选（自动推断）
      </Box>
      {tree.map((node) => renderNode(node, 0))}
    </Box>
  );
}

// ── 层级树节点组件 ──

function TreeNode({ node }: { node: HierarchyNode }) {
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box marginLeft={4} marginTop={1}>
      <Flex gap={2} alignItems="center">
        <Typography textColor="neutral600">
          {hasChildren ? "\u25BE" : "\u00B7"}
        </Typography>
        <Typography
          textColor="primary600"
          fontWeight={node.depth === 0 ? "bold" : undefined}
          style={{ cursor: "pointer" }}
          onClick={() =>
            navigate(
              `/plugins/zhao-channel/channels/${node.id}`
            )
          }
        >
          {node.name}
        </Typography>
        <Typography variant="pi" textColor="neutral500">
          ({node.channelTier})
        </Typography>
      </Flex>
      {hasChildren &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} />
        ))}
    </Box>
  );
}

// ── Tab 按钮样式 ──

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      tag="button"
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={4}
      paddingRight={4}
      style={{
        cursor: "pointer",
        border: "none",
        borderBottom: active ? "2px solid #4945FF" : "2px solid transparent",
        background: "transparent",
        fontWeight: active ? 600 : 400,
        color: active ? "#4945FF" : "#666",
      }}
      onClick={onClick}
    >
      {label}
    </Box>
  );
}

// ── 主页面组件 ──

const ChannelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const channelId = Number(id);
  const {
    getChannel,
    getChildren,
    getHierarchy,
    updateChannel,
    deleteChannel,
    createChannel,
  } = useChannelApi();

  // 数据状态
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [children, setChildren] = useState<ChannelData[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 标签页
  const TABS = ["详情", `子渠道 (0)`, "层级关系"];
  const [activeTab, setActiveTab] = useState(0);

  // 编辑状态
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState(true);
  const [saving, setSaving] = useState(false);

  // 创建子渠道
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [childName, setChildName] = useState("");
  const [childDesc, setChildDesc] = useState("");
  const [childTier, setChildTier] = useState("");
  const [tierTree, setTierTree] = useState<TierTreeOption[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 删除
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chanResult, childrenResult] = await Promise.all([
        getChannel(channelId),
        getChildren(channelId),
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
    } catch (err: any) {
      setError(err?.message || "加载渠道详情失败");
    } finally {
      setLoading(false);
    }
  }, [channelId, getChannel, getChildren]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 切换到层级标签时加载树
  useEffect(() => {
    if (activeTab === 2) {
      getHierarchy(channelId)
        .then((result) => setHierarchy(result?.hierarchy || null))
        .catch(() => {});
    }
  }, [activeTab, channelId, getHierarchy]);

  // 更新 TABS 中的子渠道计数
  useEffect(() => {
    TABS[1] = `子渠道 (${children.length})`;
  }, [children.length]);

  // 打开创建弹窗时加载层级树
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
        status: editStatus,
      });
      if (result?.data) {
        setChannel(result.data);
        setEditName(result.data.attributes.name || "");
        setEditDescription(result.data.attributes.description || "");
        setEditStatus(result.data.attributes.status);
      }
    } catch (err: any) {
      alert(err?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channel) return;
    if (
      !window.confirm(
        `确定要删除渠道 "${channel.attributes.name}" 吗？此操作将级联删除所有子渠道且不可恢复。`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteChannel(channelId);
      navigate(`/plugins/zhao-channel`);
    } catch (err: any) {
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
      const body: any = {
        name: childName.trim(),
        parentChannel: channelId,
      };
      if (childDesc.trim()) body.description = childDesc.trim();
      if (childTier.trim()) body.channelTier = childTier.trim();
      await createChannel(body);
      setShowCreateModal(false);
      setChildName("");
      setChildDesc("");
      setChildTier("");
      await fetchData();
    } catch (err: any) {
      setCreateError(err?.message || "创建失败");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteChild = async (
    childId: number,
    childNameStr: string
  ) => {
    if (!window.confirm(`确定要删除子渠道 "${childNameStr}" 吗？`)) return;
    try {
      await deleteChannel(childId);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "删除失败");
    }
  };

  const navToList = () => {
    navigate(`/plugins/zhao-channel`);
  };

  const navTo = (cid: number) => {
    navigate(`/plugins/zhao-channel/channels/${cid}`);
  };

  // ── 加载状态 ──

  if (loading) {
    return (
      <Main>
        <Box
          paddingTop={6}
          paddingBottom={4}
          paddingLeft={10}
          paddingRight={10}
          background="neutral0"
        >
          <Typography variant="alpha" fontWeight="bold">
            加载中...
          </Typography>
        </Box>
        <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
          <Typography>加载渠道详情...</Typography>
        </Box>
      </Main>
    );
  }

  // ── 错误 / 不存在 ──

  if (error || !channel) {
    return (
      <Main>
        <Box
          paddingTop={6}
          paddingBottom={4}
          paddingLeft={10}
          paddingRight={10}
          background="neutral0"
        >
          <Flex gap={2} alignItems="center">
            <Typography
              textColor="primary600"
              style={{ cursor: "pointer" }}
              onClick={navToList}
            >
              <ArrowLeft />
              {" 返回"}
            </Typography>
            <Typography variant="alpha" fontWeight="bold">
              渠道详情
            </Typography>
          </Flex>
        </Box>
        <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
          <Typography textColor="danger600">
            {error || "渠道不存在"}
          </Typography>
          <Box marginTop={2}>
            <Button onClick={fetchData}>重试</Button>
          </Box>
        </Box>
      </Main>
    );
  }

  const { attributes } = channel;

  return (
    <Main>
      {/* 头部 */}

      <Box
        paddingTop={6}
        paddingBottom={4}
        paddingLeft={10}
        paddingRight={10}
        background="neutral0"
      >
        <Flex gap={2} alignItems="center" marginBottom={2}>
          <Typography
            textColor="primary600"
            style={{ cursor: "pointer" }}
            onClick={navToList}
          >
            <ArrowLeft />
            {" 返回"}
          </Typography>
          <Typography variant="alpha" fontWeight="bold">
            {attributes.name}
          </Typography>
        </Flex>
        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="pi" textColor="neutral600">
            层级: {attributes.channelTier} · 编码: {attributes.code}
          </Typography>
          <Button
            variant="danger-light"
            startIcon={<Trash />}
            onClick={handleDeleteChannel}
            loading={deleting}
          >
            删除渠道
          </Button>
        </Flex>
      </Box>

      {/* 标签页导航 */}

      <Box
        paddingLeft={10}
        paddingRight={10}
        paddingTop={2}
        style={{ borderBottom: "1px solid #EAEAEF" }}
      >
        <Flex gap={0}>
          {TABS.map((label, index) => (
            <TabButton
              key={index}
              active={activeTab === index}
              label={index === 1 ? `子渠道 (${children.length})` : label}
              onClick={() => setActiveTab(index)}
            />
          ))}
        </Flex>
      </Box>

      {/* 内容区域 */}

      <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
        {/* Tab 1: 详情 */}

        {activeTab === 0 && (
          <Box padding={4} background="neutral100" borderRadius={4}>
            <Grid.Root gap={4}>
              <Grid.Item col={6}>
                <Field.Root name="name">
                  <Field.Label>名称</Field.Label>
                  <TextInput
                    value={editName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditName(e.target.value)
                    }
                  />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={6}>
                <Field.Root name="code">
                  <Field.Label>编码</Field.Label>
                  <TextInput value={attributes.code} disabled />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4}>
                <Field.Root name="tier">
                  <Field.Label>层级类型</Field.Label>
                  <TextInput value={attributes.channelTier} disabled />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4}>
                <Field.Root name="depth">
                  <Field.Label>层级深度</Field.Label>
                  <TextInput value={String(attributes.depth)} disabled />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4}>
                <Field.Root name="path">
                  <Field.Label>路径</Field.Label>
                  <TextInput value={attributes.path} disabled />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>

            <Box marginTop={4}>
              <Field.Root name="description">
                <Field.Label>渠道描述</Field.Label>
                <Textarea
                  value={editDescription}
                  onChange={(
                    e: React.ChangeEvent<HTMLTextAreaElement>
                  ) => setEditDescription(e.target.value)}
                />
              </Field.Root>
            </Box>

            <Box marginTop={4}>
              <Flex gap={4} alignItems="center">
                <Typography variant="pi" fontWeight="bold">
                  启用状态
                </Typography>
                <Switch
                  checked={editStatus}
                  onCheckedChange={(checked: boolean) =>
                    setEditStatus(checked)
                  }
                  onLabel="启用"
                  offLabel="禁用"
                />
              </Flex>
            </Box>

            <Box marginTop={4}>
              <Button onClick={handleSave} loading={saving}>
                保存修改
              </Button>
            </Box>
          </Box>
        )}

        {/* Tab 2: 子渠道 */}

        {activeTab === 1 && (
          <Box padding={4}>
            <Flex justifyContent="end" marginBottom={4}>
              <Button
                startIcon={<Plus />}
                onClick={() => setShowCreateModal(true)}
              >
                创建子渠道
              </Button>
            </Flex>
            {children.length === 0 ? (
              <Box background="neutral100" padding={8} borderRadius={4}>
                <EmptyStateLayout content="暂无子渠道" />
              </Box>
            ) : (
              <Box
                background="neutral0"
                borderRadius={4}
                shadow="filterShadow"
              >
                <Table colCount={5} rowCount={children.length}>
                  <Thead>
                    <Tr>
                      <Th>
                        <Typography variant="sigma">名称</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">编码</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">层级</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">状态</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">操作</Typography>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {children.map((child) => (
                      <Tr key={child.id}>
                        <Td>
                          <Typography
                            fontWeight="bold"
                            textColor="primary600"
                            style={{ cursor: "pointer" }}
                            onClick={() => navTo(child.id)}
                          >
                            {child.attributes.name}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography textColor="neutral600">
                            {child.attributes.code}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography>
                            {child.attributes.channelTier}
                          </Typography>
                        </Td>
                        <Td>
                          <Status
                            variant={
                              child.attributes.status
                                ? "success"
                                : "danger"
                            }
                          >
                            <Typography>
                              {child.attributes.status
                                ? "启用"
                                : "禁用"}
                            </Typography>
                          </Status>
                        </Td>
                        <Td>
                          <Flex gap={2}>
                            <Button
                              size="S"
                              variant="tertiary"
                              onClick={() => navTo(child.id)}
                            >
                              管理
                            </Button>
                            <Button
                              size="S"
                              variant="danger-light"
                              startIcon={<Trash />}
                              onClick={() =>
                                handleDeleteChild(
                                  child.id,
                                  child.attributes.name
                                )
                              }
                            >
                              删除
                            </Button>
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: 层级关系 */}

        {activeTab === 2 && (
          <Box padding={4}>
            {!hierarchy ? (
              <Typography textColor="neutral500">
                加载层级关系中...
              </Typography>
            ) : (
              <Box background="neutral100" padding={4} borderRadius={4}>
                <TreeNode node={hierarchy} />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* 创建子渠道模态框 */}

      {showCreateModal && (
        <Modal.Root
          open={showCreateModal}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setShowCreateModal(false);
              setCreateError(null);
            }
          }}
        >
          <Modal.Content>
            <Modal.Header closeLabel="关闭">
              <Modal.Title>创建子渠道</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4} alignItems="stretch">
                <Field.Root name="childName" required>
                  <Field.Label>渠道名称</Field.Label>
                  <TextInput
                    value={childName}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setChildName(e.target.value)}
                    placeholder="输入子渠道名称"
                  />
                </Field.Root>
                <Field.Root name="childDesc">
                  <Field.Label>渠道描述</Field.Label>
                  <Textarea
                    value={childDesc}
                    onChange={(
                      e: React.ChangeEvent<HTMLTextAreaElement>
                    ) => setChildDesc(e.target.value)}
                    placeholder="可选"
                  />
                </Field.Root>
                <Field.Root name="childTier">
                  <Field.Label>层级类型（可选）</Field.Label>
                  <Box>
                    <Box marginBottom={2}>
                      <Typography variant="pi" textColor="neutral500">
                        父渠道层级: {attributes.channelTier}，不选则自动推断
                      </Typography>
                    </Box>
                    <TierTreeSelect
                      tree={tierTree}
                      value={childTier}
                      onChange={setChildTier}
                    />
                  </Box>
                </Field.Root>
                {createError && (
                  <Typography textColor="danger600" variant="pi">
                    {createError}
                  </Typography>
                )}
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Flex justifyContent="space-between" width="100%">
                <Button
                  variant="tertiary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateChild}
                  loading={createLoading}
                >
                  确认创建
                </Button>
              </Flex>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { ChannelDetailPage };
