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
} from "@strapi/design-system";
import { Plus, Trash } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

const emptyForm = {
  provider: "wechat",
  provider_user_id: "",
  provider_union_id: "",
  provider_nickname: "",
  provider_avatar: "",
  user: "",
};

const PROVIDERS = [
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
  { value: "douyin", label: "抖音" },
  { value: "google", label: "Google" },
  { value: "github", label: "GitHub" },
];

export const BindingsTab = () => {
  const { get, post, put, del } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [bindings, setBindings] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/bindings`);
      setBindings(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buildPayload = () => {
    const payload: any = {
      provider: form.provider,
      provider_user_id: form.provider_user_id || undefined,
      provider_union_id: form.provider_union_id || undefined,
      provider_nickname: form.provider_nickname || undefined,
      provider_avatar: form.provider_avatar || undefined,
    };
    if (form.user !== "") {
      const userId = Number(form.user);
      payload.user = Number.isNaN(userId) ? form.user : userId;
    }
    return payload;
  };

  const handleCreate = async () => {
    try {
      await post(`${API_PREFIX}/bindings`, buildPayload());
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
      await put(`${API_PREFIX}/bindings/${editId}`, buildPayload());
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del(`${API_PREFIX}/bindings/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (b: any) => {
    setEditId(b.id);
    setForm({
      provider: b.provider || "wechat",
      provider_user_id: b.provider_user_id || "",
      provider_union_id: b.provider_union_id || "",
      provider_nickname: b.provider_nickname || "",
      provider_avatar: b.provider_avatar || "",
      user: b.user != null ? String(b.user) : "",
    });
    setEditOpen(true);
  };

  const openDelete = (b: any) => {
    setDeleteTarget(b);
    setDeleteOpen(true);
  };

  const providerLabel = (v: string) =>
    PROVIDERS.find((p) => p.value === v)?.label || v;

  const formFields = () => (
    <Flex direction="column" gap={4} alignItems="stretch">
      <Field.Root name="provider" required>
        <Field.Label>平台</Field.Label>
        <SingleSelect
          value={form.provider}
          onValueChange={(v: string) => setForm({ ...form, provider: v })}
        >
          {PROVIDERS.map((p) => (
            <SingleSelectOption key={p.value} value={p.value}>
              {p.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      <Field.Root name="provider_user_id" required>
        <Field.Label>三方用户 ID</Field.Label>
        <TextInput
          value={form.provider_user_id}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, provider_user_id: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="provider_union_id">
        <Field.Label>Union ID</Field.Label>
        <TextInput
          value={form.provider_union_id}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, provider_union_id: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="provider_nickname">
        <Field.Label>昵称</Field.Label>
        <TextInput
          value={form.provider_nickname}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, provider_nickname: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="provider_avatar">
        <Field.Label>头像</Field.Label>
        <TextInput
          value={form.provider_avatar}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, provider_avatar: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="user">
        <Field.Label>关联用户 ID</Field.Label>
        <TextInput
          value={form.user}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, user: e.target.value })
          }
        />
      </Field.Root>
    </Flex>
  );

  return (
    <Box padding={4}>
      <Flex paddingBottom={4} justifyContent="space-between">
        <Typography variant="delta">三方绑定列表</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
          }}
        >
          新建绑定
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : bindings.length === 0 ? (
        <EmptyStateLayout content="暂无绑定数据" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={6} rowCount={bindings.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">平台</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">三方用户 ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">昵称</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">关联用户</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">绑定时间</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">操作</Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {bindings.map((b: any) => (
                <Tr key={b.id}>
                  <Td>
                    <Typography>{providerLabel(b.provider)}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {b.provider_user_id || "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography>{b.provider_nickname || "-"}</Typography>
                  </Td>
                  <Td>
                    <Typography>{b.user ?? "-"}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {b.bound_at
                        ? new Date(b.bound_at).toLocaleString()
                        : "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Button
                      size="S"
                      variant="danger-light"
                      startIcon={<Trash />}
                      onClick={() => openDelete(b)}
                    >
                      删除
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
            <Modal.Title>新建三方绑定</Modal.Title>
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
            <Modal.Title>编辑三方绑定</Modal.Title>
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

      <Modal.Root
        open={deleteOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteOpen(false);
        }}
      >
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>确认删除</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Typography>
              确定要删除该绑定 ({providerLabel(deleteTarget?.provider)} /{" "}
              {deleteTarget?.provider_user_id || "-"}) 吗?此操作不可撤销。
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setDeleteOpen(false)}>
                取消
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                删除
              </Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};
