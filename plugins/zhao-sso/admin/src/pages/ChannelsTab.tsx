import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Typography,
  Button,
  Loader,
  EmptyStateLayout,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  Modal,
  Field,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Status,
} from "@strapi/design-system";
import { Plus, Pencil } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

const emptyForm = {
  channel_code: "",
  channel_name: "",
  channel_type: "organic",
  utm_template: "",
  is_active: "true",
  description: "",
};

const CHANNEL_TYPES = [
  { value: "organic", label: "自然流量" },
  { value: "paid", label: "付费推广" },
  { value: "social", label: "社交媒体" },
  { value: "referral", label: "推荐引流" },
  { value: "offline", label: "线下渠道" },
  { value: "other", label: "其他" },
];

export const ChannelsTab = () => {
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/channels`);
      setChannels(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await post(`${API_PREFIX}/channels`, {
        channel_code: form.channel_code,
        channel_name: form.channel_name,
        channel_type: form.channel_type,
        utm_template: form.utm_template || undefined,
        is_active: form.is_active === "true",
        description: form.description || undefined,
      });
      setCreateOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    try {
      await put(`${API_PREFIX}/channels/${editId}`, {
        channel_name: form.channel_name,
        channel_type: form.channel_type,
        utm_template: form.utm_template || undefined,
        is_active: form.is_active === "true",
        description: form.description || undefined,
      });
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (ch: any) => {
    setEditId(ch.id);
    setForm({
      channel_code: ch.channel_code || "",
      channel_name: ch.channel_name || "",
      channel_type: ch.channel_type || "organic",
      utm_template: ch.utm_template || "",
      is_active: String(ch.is_active ?? true),
      description: ch.description || "",
    });
    setEditOpen(true);
  };

  const formFields = () => (
    <Flex direction="column" gap={4} alignItems="stretch">
      <Field.Root name="channel_code" required>
        <Field.Label>渠道编码</Field.Label>
        <TextInput
          value={form.channel_code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, channel_code: e.target.value })
          }
          disabled={editOpen}
        />
      </Field.Root>
      <Field.Root name="channel_name" required>
        <Field.Label>渠道名称</Field.Label>
        <TextInput
          value={form.channel_name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, channel_name: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="channel_type" required>
        <Field.Label>渠道类型</Field.Label>
        <SingleSelect
          value={form.channel_type}
          onValueChange={(v: string) =>
            setForm({ ...form, channel_type: v })
          }
        >
          {CHANNEL_TYPES.map((t) => (
            <SingleSelectOption key={t.value} value={t.value}>
              {t.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      <Field.Root name="utm_template">
        <Field.Label>UTM 模板</Field.Label>
        <TextInput
          value={form.utm_template}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, utm_template: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="is_active" required>
        <Field.Label>启用状态</Field.Label>
        <SingleSelect
          value={form.is_active}
          onValueChange={(v: string) => setForm({ ...form, is_active: v })}
        >
          <SingleSelectOption value="true">启用</SingleSelectOption>
          <SingleSelectOption value="false">禁用</SingleSelectOption>
        </SingleSelect>
      </Field.Root>
      <Field.Root name="description">
        <Field.Label>描述</Field.Label>
        <TextInput
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, description: e.target.value })
          }
        />
      </Field.Root>
    </Flex>
  );

  const typeLabel = (v: string) =>
    CHANNEL_TYPES.find((t) => t.value === v)?.label || v;

  return (
    <Box padding={4}>
      <Flex paddingBottom={4} justifyContent="space-between">
        <Typography variant="delta">渠道列表</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
          }}
        >
          新建渠道
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : channels.length === 0 ? (
        <EmptyStateLayout content="暂无渠道" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={7} rowCount={channels.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">渠道编码</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">渠道名称</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">类型</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">UTM 模板</Typography>
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
              {channels.map((ch: any) => (
                <Tr key={ch.id}>
                  <Td>
                    <Typography>{ch.id}</Typography>
                  </Td>
                  <Td>
                    <Typography>{ch.channel_code}</Typography>
                  </Td>
                  <Td>
                    <Typography>{ch.channel_name}</Typography>
                  </Td>
                  <Td>
                    <Typography>{typeLabel(ch.channel_type)}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {ch.utm_template || "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Status variant={ch.is_active ? "success" : "neutral"}>
                      <Typography>
                        {ch.is_active ? "启用" : "禁用"}
                      </Typography>
                    </Status>
                  </Td>
                  <Td>
                    <Button
                      size="S"
                      variant="tertiary"
                      startIcon={<Pencil />}
                      onClick={() => openEdit(ch)}
                    >
                      编辑
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal.Root
        open={createOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>新建渠道</Modal.Title>
          </Modal.Header>
          <Modal.Body>{formFields()}</Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate}>创建</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={editOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setEditOpen(false);
        }}
      >
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>编辑渠道</Modal.Title>
          </Modal.Header>
          <Modal.Body>{formFields()}</Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditSave}>保存</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};
