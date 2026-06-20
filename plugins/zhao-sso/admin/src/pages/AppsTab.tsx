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
  app_code: "",
  app_name: "",
  app_secret: "",
  redirect_uris: "",
  allowed_grant_types: "authorization_code,refresh_token",
  is_active: "true",
  description: "",
};

export const AppsTab = () => {
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/apps`);
      setApps(data?.data || []);
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
      await post(`${API_PREFIX}/apps`, {
        app_code: form.app_code,
        app_name: form.app_name,
        app_secret: form.app_secret || undefined,
        redirect_uris: form.redirect_uris
          ? form.redirect_uris.split(",").map((s: string) => s.trim())
          : [],
        allowed_grant_types: form.allowed_grant_types
          ? form.allowed_grant_types.split(",").map((s: string) => s.trim())
          : ["authorization_code", "refresh_token"],
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
      const body: any = {
        app_name: form.app_name,
        redirect_uris: form.redirect_uris
          ? form.redirect_uris.split(",").map((s: string) => s.trim())
          : [],
        allowed_grant_types: form.allowed_grant_types
          ? form.allowed_grant_types.split(",").map((s: string) => s.trim())
          : ["authorization_code", "refresh_token"],
        is_active: form.is_active === "true",
        description: form.description || undefined,
      };
      if (form.app_secret) body.app_secret = form.app_secret;
      await put(`${API_PREFIX}/apps/${editId}`, body);
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (app: any) => {
    setEditId(app.id);
    setForm({
      app_code: app.app_code || "",
      app_name: app.app_name || "",
      app_secret: "",
      redirect_uris: Array.isArray(app.redirect_uris)
        ? app.redirect_uris.join(", ")
        : "",
      allowed_grant_types: Array.isArray(app.allowed_grant_types)
        ? app.allowed_grant_types.join(", ")
        : "authorization_code, refresh_token",
      is_active: String(app.is_active ?? true),
      description: app.description || "",
    });
    setEditOpen(true);
  };

  const formFields = () => (
    <Flex direction="column" gap={4} alignItems="stretch">
      <Field.Root name="app_code" required>
        <Field.Label>应用编码</Field.Label>
        <TextInput
          value={form.app_code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, app_code: e.target.value })
          }
          disabled={editOpen}
        />
      </Field.Root>
      <Field.Root name="app_name" required>
        <Field.Label>应用名称</Field.Label>
        <TextInput
          value={form.app_name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, app_name: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="app_secret">
        <Field.Label>应用密钥</Field.Label>
        <TextInput
          placeholder={editOpen ? "留空则不修改" : "留空使用默认值"}
          value={form.app_secret}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, app_secret: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="redirect_uris">
        <Field.Label>回调地址 (逗号分隔)</Field.Label>
        <TextInput
          value={form.redirect_uris}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, redirect_uris: e.target.value })
          }
        />
      </Field.Root>
      <Field.Root name="allowed_grant_types">
        <Field.Label>授权类型 (逗号分隔)</Field.Label>
        <TextInput
          value={form.allowed_grant_types}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, allowed_grant_types: e.target.value })
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

  return (
    <Box padding={4}>
      <Flex paddingBottom={4} justifyContent="space-between">
        <Typography variant="delta">应用列表</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
          }}
        >
          新建应用
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : apps.length === 0 ? (
        <EmptyStateLayout content="暂无应用" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={7} rowCount={apps.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">应用编码</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">应用名称</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">回调地址</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">授权类型</Typography>
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
              {apps.map((app: any) => (
                <Tr key={app.id}>
                  <Td>
                    <Typography>{app.id}</Typography>
                  </Td>
                  <Td>
                    <Typography>{app.app_code}</Typography>
                  </Td>
                  <Td>
                    <Typography>{app.app_name}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {Array.isArray(app.redirect_uris)
                        ? app.redirect_uris.join(", ")
                        : "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {Array.isArray(app.allowed_grant_types)
                        ? app.allowed_grant_types.join(", ")
                        : "-"}
                    </Typography>
                  </Td>
                  <Td>
                    <Status variant={app.is_active ? "success" : "neutral"}>
                      <Typography>
                        {app.is_active ? "启用" : "禁用"}
                      </Typography>
                    </Status>
                  </Td>
                  <Td>
                    <Button
                      size="S"
                      variant="tertiary"
                      startIcon={<Pencil />}
                      onClick={() => openEdit(app)}
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
            <Modal.Title>新建应用</Modal.Title>
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
            <Modal.Title>编辑应用</Modal.Title>
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
