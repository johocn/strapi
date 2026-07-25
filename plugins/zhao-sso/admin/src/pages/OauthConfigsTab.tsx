import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Typography,
  Button,
  Loader,
  EmptyStateLayout,
  TextInput,
  Textarea,
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
import { Plus, Pencil, Trash } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

const emptyForm = {
  name: "",
  provider: "wechat",
  app_type: "default",
  app_id: "",
  app_secret: "",
  scope: "",
  is_enabled: "true",
  description: "",
  extra_config: "{}",
};

const PROVIDERS = [
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
  { value: "douyin", label: "抖音" },
  { value: "google", label: "Google" },
  { value: "github", label: "GitHub" },
];

const APP_TYPES = [
  { value: "official_account", label: "公众号" },
  { value: "open_platform", label: "开放平台" },
  { value: "mini_program", label: "小程序" },
  { value: "app", label: "APP" },
  { value: "default", label: "默认" },
];

export const OauthConfigsTab = () => {
  const { get, post, put, del } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/oauth-configs`);
      setConfigs(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parseExtraConfig = (raw: string) => {
    if (!raw || raw.trim() === "") return undefined;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  };

  const buildPayload = () => {
    const payload: any = {
      name: form.name,
      provider: form.provider,
      app_type: form.app_type,
      app_id: form.app_id,
      scope: form.scope || undefined,
      is_enabled: form.is_enabled === "true",
      description: form.description || undefined,
    };
    if (form.app_secret) payload.app_secret = form.app_secret;
    const extra = parseExtraConfig(form.extra_config);
    if (extra !== undefined) payload.extra_config = extra;
    return payload;
  };

  const handleCreate = async () => {
    try {
      await post(`${API_PREFIX}/oauth-configs`, buildPayload());
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
      await put(`${API_PREFIX}/oauth-configs/${editId}`, buildPayload());
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del(`${API_PREFIX}/oauth-configs/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (cfg: any) => {
    setEditId(cfg.id);
    setForm({
      name: cfg.name || "",
      provider: cfg.provider || "wechat",
      app_type: cfg.app_type || "default",
      app_id: cfg.app_id || "",
      app_secret: "",
      scope: cfg.scope || "",
      is_enabled: String(cfg.is_enabled ?? true),
      description: cfg.description || "",
      extra_config: cfg.extra_config
        ? typeof cfg.extra_config === "string"
          ? cfg.extra_config
          : JSON.stringify(cfg.extra_config, null, 2)
        : "{}",
    });
    setEditOpen(true);
  };

  const openDelete = (cfg: any) => {
    setDeleteTarget(cfg);
    setDeleteOpen(true);
  };

  const formFields = () => (
    <Flex direction="column" gap={4} alignItems="stretch">
      <Field.Root name="name" required>
        <Field.Label>配置名称</Field.Label>
        <TextInput
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, name: e.target.value })
          }
        />
      </Field.Root>
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
      <Field.Root name="app_type" required>
        <Field.Label>应用类型</Field.Label>
        <SingleSelect
          value={form.app_type}
          onValueChange={(v: string) => setForm({ ...form, app_type: v })}
        >
          {APP_TYPES.map((t) => (
            <SingleSelectOption key={t.value} value={t.value}>
              {t.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      <Field.Root name="app_id" required>
        <Field.Label>App ID</Field.Label>
        <TextInput
          value={form.app_id}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, app_id: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="app_secret" required>
        <Field.Label>App Secret</Field.Label>
        <TextInput
          type="password"
          placeholder={editOpen ? "留空则不修改" : ""}
          value={form.app_secret}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, app_secret: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="scope">
        <Field.Label>Scope</Field.Label>
        <TextInput
          value={form.scope}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, scope: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="is_enabled" required>
        <Field.Label>启用状态</Field.Label>
        <SingleSelect
          value={form.is_enabled}
          onValueChange={(v: string) => setForm({ ...form, is_enabled: v })}
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
      <Field.Root name="extra_config">
        <Field.Label>额外配置 (JSON)</Field.Label>
        <Textarea
          value={form.extra_config}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setForm({ ...form, extra_config: e.target.value })
          }
          placeholder="{}"
        />
      </Field.Root>
    </Flex>
  );

  const providerLabel = (v: string) =>
    PROVIDERS.find((p) => p.value === v)?.label || v;

  const appTypeLabel = (v: string) =>
    APP_TYPES.find((t) => t.value === v)?.label || v;

  return (
    <Box padding={4}>
      <Flex paddingBottom={4} justifyContent="space-between">
        <Typography variant="delta">OAuth 配置列表</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
          }}
        >
          新建配置
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : configs.length === 0 ? (
        <EmptyStateLayout content="暂无 OAuth 配置" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={8} rowCount={configs.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">名称</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">平台</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">应用类型</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">App ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">状态</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">描述</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">操作</Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {configs.map((cfg: any) => (
                <Tr key={cfg.id}>
                  <Td>
                    <Typography>{cfg.id}</Typography>
                  </Td>
                  <Td>
                    <Typography>{cfg.name}</Typography>
                  </Td>
                  <Td>
                    <Typography>{providerLabel(cfg.provider)}</Typography>
                  </Td>
                  <Td>
                    <Typography>{appTypeLabel(cfg.app_type)}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {cfg.app_id || "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Status variant={cfg.is_enabled ? "success" : "neutral"}>
                      <Typography>
                        {cfg.is_enabled ? "启用" : "禁用"}
                      </Typography>
                    </Status>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {cfg.description || "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Flex gap={1}>
                      <Button
                        size="S"
                        variant="tertiary"
                        startIcon={<Pencil />}
                        onClick={() => openEdit(cfg)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="S"
                        variant="danger-light"
                        startIcon={<Trash />}
                        onClick={() => openDelete(cfg)}
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

      <Modal.Root
        open={createOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>新建 OAuth 配置</Modal.Title>
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
            <Modal.Title>编辑 OAuth 配置</Modal.Title>
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
              确定要删除配置 “{deleteTarget?.name}” 吗?此操作不可撤销。
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
