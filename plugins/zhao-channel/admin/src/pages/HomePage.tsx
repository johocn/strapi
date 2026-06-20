import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  EmptyStateLayout,
  Status,
} from "@strapi/design-system";
import { Plus, Trash, Pencil } from "@strapi/icons";
import { useChannelApi } from "../utils/api";

interface Channel {
  id: number;
  attributes: {
    name: string;
    code: string;
    channelTier: string;
    status: boolean;
    description: string;
    path: string;
    depth: number;
    createdAt: string;
    parentChannelId: { id: number; name: string } | null;
  };
}

const HomePage = () => {
  const navigate = useNavigate();
  const { getChannels, createRootChannel, deleteChannel } = useChannelApi();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 创建根渠道模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getChannels({ depth: 0 });
      setChannels(result?.data || []);
    } catch (err: any) {
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
        description: createDesc.trim() || undefined,
      });
      setShowCreateModal(false);
      setCreateName("");
      setCreateDesc("");
      await fetchChannels();
    } catch (err: any) {
      setCreateError(err?.message || "创建失败");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !window.confirm(
        `确定要删除渠道 "${name}" 吗？此操作将级联删除所有子渠道且不可恢复。`
      )
    ) {
      return;
    }
    try {
      await deleteChannel(id);
      await fetchChannels();
    } catch (err: any) {
      alert(err?.message || "删除失败");
    }
  };

  const navTo = (id: number) => {
    navigate(`/plugins/zhao-channel/channels/${id}`);
  };

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
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" fontWeight="bold" tag="h1">
              根渠道管理
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600" tag="p">
                管理所有根级渠道及其下属渠道
              </Typography>
            </Box>
          </Box>
          <Button
            startIcon={<Plus />}
            onClick={() => setShowCreateModal(true)}
          >
            创建根渠道
          </Button>
        </Flex>
      </Box>

      {/* 内容 */}

      <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
        {loading ? (
          <Box padding={8} background="neutral100" borderRadius={4}>
            <Typography>加载中...</Typography>
          </Box>
        ) : error ? (
          <Box padding={8} background="neutral100" borderRadius={4}>
            <Typography textColor="danger600">{error}</Typography>
            <Box marginTop={2}>
              <Button onClick={fetchChannels}>重试</Button>
            </Box>
          </Box>
        ) : channels.length === 0 ? (
          <Box background="neutral100" padding={8} borderRadius={4}>
            <EmptyStateLayout
              icon={<Plus />}
              content="暂无根渠道，点击上方按钮创建"
              action={
                <Button
                  startIcon={<Plus />}
                  onClick={() => setShowCreateModal(true)}
                >
                  创建根渠道
                </Button>
              }
            />
          </Box>
        ) : (
          <Box background="neutral0" borderRadius={4} shadow="filterShadow">
            <Table colCount={6} rowCount={channels.length}>
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
                    <Typography variant="sigma">创建时间</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">操作</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {channels.map((channel) => (
                  <Tr key={channel.id}>
                    <Td>
                      <Typography
                        fontWeight="bold"
                        textColor="primary600"
                        style={{ cursor: "pointer" }}
                        onClick={() => navTo(channel.id)}
                      >
                        {channel.attributes.name}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {channel.attributes.code}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {channel.attributes.channelTier}
                      </Typography>
                    </Td>
                    <Td>
                      <Status
                        variant={
                          channel.attributes.status ? "success" : "danger"
                        }
                      >
                        <Typography>
                          {channel.attributes.status ? "启用" : "禁用"}
                        </Typography>
                      </Status>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {new Date(
                          channel.attributes.createdAt
                        ).toLocaleDateString()}
                      </Typography>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button
                          size="S"
                          variant="tertiary"
                          startIcon={<Pencil />}
                          onClick={() => navTo(channel.id)}
                        >
                          管理
                        </Button>
                        <Button
                          size="S"
                          variant="danger-light"
                          startIcon={<Trash />}
                          onClick={() =>
                            handleDelete(
                              channel.id,
                              channel.attributes.name
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

      {/* 创建根渠道模态框 */}

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
              <Modal.Title>创建根渠道</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4} alignItems="stretch">
                <Field.Root name="name" required>
                  <Field.Label>渠道名称</Field.Label>
                  <TextInput
                    value={createName}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => setCreateName(e.target.value)}
                    placeholder="输入渠道名称"
                  />
                </Field.Root>
                <Field.Root name="description">
                  <Field.Label>渠道描述</Field.Label>
                  <Textarea
                    value={createDesc}
                    onChange={(
                      e: React.ChangeEvent<HTMLTextAreaElement>
                    ) => setCreateDesc(e.target.value)}
                    placeholder="可选：输入渠道描述"
                  />
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
                <Button onClick={handleCreate} loading={createLoading}>
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

export { HomePage };
