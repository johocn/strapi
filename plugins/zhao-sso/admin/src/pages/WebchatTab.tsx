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
  Divider,
} from "@strapi/design-system";
import { Plus, Pencil, Trash, Lightning } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

// 将接口返回的任意结构规整为数组，兼容 { data: [...] } / Object / 嵌套列表等返回格式
const toArray = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj) return Array.isArray(obj.data) ? obj.data : toArray(obj.data);
    for (const key of ["list", "templates", "items", "records"]) {
      if (Array.isArray(obj[key])) return obj[key] as any[];
    }
  }
  return [];
};

/* ============================== 1. 接入配置 ============================== */
// 服务器配置：展示回调 URL，读写 sso-oauth-config(wechat/official_account) extra_config 中的 serverToken / welcomeReply
const CallbackConfig = () => {
  const { get, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any | null>(null);
  const [serverToken, setServerToken] = useState("");
  const [welcomeReply, setWelcomeReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/oauth-configs`);
      const list = toArray(data?.data ?? data);
      // 优先取 provider=wechat 且 app_type=official_account 的公众号配置
      const cfg =
        list.find(
          (c: any) => c.provider === "wechat" && c.app_type === "official_account"
        ) || list.find((c: any) => c.provider === "wechat") || null;
      setConfig(cfg);
      const extra = cfg?.extra_config && typeof cfg.extra_config === "object" ? cfg.extra_config : {};
      setServerToken(extra.serverToken ?? "");
      setWelcomeReply(extra.welcomeReply ?? "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!config?.id) return;
    setSaving(true);
    try {
      // 仅更新 extra_config，其余字段沿用现存配置，避免覆盖 app_id / app_secret 等
      const extra = {
        ...(config.extra_config && typeof config.extra_config === "object" ? config.extra_config : {}),
        serverToken,
        welcomeReply,
      };
      const payload: any = {
        name: config.name,
        provider: config.provider,
        app_type: config.app_type,
        app_id: config.app_id,
        scope: config.scope || undefined,
        is_enabled: !!config.is_enabled,
        description: config.description || undefined,
        extra_config: extra,
      };
      await put(`${API_PREFIX}/oauth-configs/${config.id}`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="delta" paddingBottom={3}>
        接入配置
      </Typography>
      {loading ? (
        <Loader>加载中...</Loader>
      ) : !config ? (
        <EmptyStateLayout content="未找到公众号 OAuth 配置，请先在“OAuth配置”创建 provider=wechat / app_type=official_account 的配置" />
      ) : (
        <Flex direction="column" gap={4} alignItems="stretch">
          <Field.Root name="server_url">
            <Field.Label>服务器 URL(GET/POST)</Field.Label>
            <TextInput disabled value="/api/zhao-sso/v1/wechat/callback" />
            <Typography variant="pi" textColor="neutral600">
              请在微信公众平台「服务器配置」中填写该地址为 URL，并填入下方 Token。
            </Typography>
          </Field.Root>
          <Flex direction="column" gap={4} alignItems="stretch">
            <Field.Root name="serverToken">
              <Field.Label>剩余Token(serverToken)</Field.Label>
              <TextInput
                value={serverToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setServerToken(e.target.value)
                }
                placeholder="微信公众号「服务器配置」中自定义的 Token"
              />
            </Field.Root>
            <Field.Root name="welcomeReply">
              <Field.Label>欢迎语(welcomeReply)</Field.Label>
              <Textarea
                value={welcomeReply}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setWelcomeReply(e.target.value)
                }
                placeholder="关注公众号后被动回复的欢迎语"
              />
            </Field.Root>
          </Flex>
          <Flex gap={2} alignItems="center">
            <Button onClick={handleSave} loading={saving}>
              保存配置
            </Button>
            {saved && <Typography textColor="success600">已保存</Typography>}
          </Flex>
        </Flex>
      )}
    </Box>
  );
};

/* ============================== 2. 带参二维码 ============================== */
const QrCodeSection = () => {
  const { get, post, del } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    scene_key: "",
    title: "",
    kind: "temporary",
    expire_seconds: "2592000",
    remark: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/wx/qrcodes`);
      setItems(toArray(data?.data ?? data));
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
      await post(`${API_PREFIX}/wx/qrcodes`, {
        scene_key: form.scene_key,
        title: form.title || undefined,
        kind: form.kind,
        expire_seconds: form.expire_seconds ? Number(form.expire_seconds) : undefined,
        remark: form.remark || undefined,
      });
      setOpen(false);
      setForm({ scene_key: "", title: "", kind: "temporary", expire_seconds: "2592000", remark: "" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del(`${API_PREFIX}/wx/qrcodes/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const kindLabel = (v: string) => (v === "permanent" ? "永久" : "临时");

  const formFields = () => (
    <Flex direction="column" gap={4} alignItems="stretch">
      <Field.Root name="scene_key" required>
        <Field.Label>场景值(scene_key)</Field.Label>
        <TextInput
          value={form.scene_key}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, scene_key: e.target.value })
          }
          placeholder="如 activity:12 / invite:ABC"
        />
        <Typography variant="pi" textColor="neutral600">
          微信扫码场景标识，用于来源归因
        </Typography>
      </Field.Root>
      <Field.Root name="title">
        <Field.Label>标题</Field.Label>
        <TextInput
          value={form.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, title: e.target.value })
          }
          placeholder="后台备注名"
        />
      </Field.Root>
      <Field.Root name="kind" required>
        <Field.Label>类型</Field.Label>
        <SingleSelect
          value={form.kind}
          onValueChange={(v: string) => setForm({ ...form, kind: v })}
        >
          <SingleSelectOption value="temporary">临时</SingleSelectOption>
          <SingleSelectOption value="permanent">永久</SingleSelectOption>
        </SingleSelect>
      </Field.Root>
      <Field.Root name="expire_seconds">
        <Field.Label>有效期(秒)</Field.Label>
        <TextInput
          type="number"
          value={form.expire_seconds}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, expire_seconds: e.target.value })
          }
          placeholder="默认 2592000，永久二维码忽略"
        />
      </Field.Root>
      <Field.Root name="remark">
        <Field.Label>备注</Field.Label>
        <Textarea
          value={form.remark}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setForm({ ...form, remark: e.target.value })
          }
        />
      </Field.Root>
    </Flex>
  );

  return (
    <Box>
      <Flex paddingBottom={4} justifyContent="space-between" alignItems="center">
        <Typography variant="delta">带参二维码</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setForm({ scene_key: "", title: "", kind: "temporary", expire_seconds: "2592000", remark: "" });
            setOpen(true);
          }}
        >
          新建二维码
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : items.length === 0 ? (
        <EmptyStateLayout content="暂无带参二维码" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={7} rowCount={items.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">ID</Typography></Th>
                <Th><Typography variant="sigma">场景值</Typography></Th>
                <Th><Typography variant="sigma">标题</Typography></Th>
                <Th><Typography variant="sigma">类型</Typography></Th>
                <Th><Typography variant="sigma">有效期(秒)</Typography></Th>
                <Th><Typography variant="sigma">二维码</Typography></Th>
                <Th><Typography variant="sigma">操作</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((q: any) => (
                <Tr key={q.id}>
                  <Td><Typography>{q.id}</Typography></Td>
                  <Td><Typography>{q.scene_key}</Typography></Td>
                  <Td><Typography>{q.title || "-"}</Typography></Td>
                  <Td><Status variant="neutral"><Typography>{kindLabel(q.kind)}</Typography></Status></Td>
                  <Td><Typography textColor="neutral600">{q.expire_seconds ?? "-"}</Typography></Td>
                  <Td>
                    {q.qrcode_url ? (
                      <a href={q.qrcode_url} target="_blank" rel="noreferrer">
                        <Typography textColor="primary600">查看图片</Typography>
                      </a>
                    ) : q.wx_url ? (
                      <a href={q.wx_url} target="_blank" rel="noreferrer">
                        <Typography textColor="primary600">微信链接</Typography>
                      </a>
                    ) : (
                      <Typography textColor="neutral600">-</Typography>
                    )}
                  </Td>
                  <Td>
                    <Button
                      size="S"
                      variant="danger-light"
                      startIcon={<Trash />}
                      onClick={() => {
                        setDeleteTarget(q);
                        setDeleteOpen(true);
                      }}
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

      <Modal.Root open={open} onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}>
        <Modal.Content>
          <Modal.Header closeLabel="关闭"><Modal.Title>新建带参二维码</Modal.Title></Modal.Header>
          <Modal.Body>{formFields()}</Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>创建</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root open={deleteOpen} onOpenChange={(o: boolean) => { if (!o) setDeleteOpen(false); }}>
        <Modal.Content>
          <Modal.Header closeLabel="关闭"><Modal.Title>确认删除</Modal.Title></Modal.Header>
          <Modal.Body>
            <Typography>
              确定要删除二维码 “{deleteTarget?.scene_key}” 吗?此操作不可撤销。
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setDeleteOpen(false)}>取消</Button>
              <Button variant="danger" onClick={handleDelete}>删除</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};

/* ============================== 3. 自定义菜单 ============================== */
const MenuSection = () => {
  const { get, post, put, del } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: "", menu_json: '{\n  "button": []\n}' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/wx/menus`);
      setItems(toArray(data?.data ?? data));
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
    let menuJson;
    try {
      menuJson = JSON.parse(form.menu_json);
    } catch (e) {
      console.error(e);
      return null;
    }
    return { name: form.name, menu_json: menuJson };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      if (editId) {
        await put(`${API_PREFIX}/wx/menus/${editId}`, payload);
      } else {
        await post(`${API_PREFIX}/wx/menus`, payload);
      }
      setOpen(false);
      setEditId(null);
      setForm({ name: "", menu_json: '{\n  "button": []\n}' });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await post(`${API_PREFIX}/wx/menus/${id}/publish`);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del(`${API_PREFIX}/wx/menus/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      name: m.name || "",
      menu_json: m.menu_json
        ? typeof m.menu_json === "string"
          ? m.menu_json
          : JSON.stringify(m.menu_json, null, 2)
        : "{}",
    });
    setOpen(true);
  };

  const stateLabel = (s: string) => {
    if (s === "published") return "已下发";
    if (s === "failed") return "失败";
    return "本地";
  };

  return (
    <Box>
      <Flex paddingBottom={4} justifyContent="space-between" alignItems="center">
        <Typography variant="delta">自定义菜单</Typography>
        <Button
          startIcon={<Plus />}
          onClick={() => {
            setEditId(null);
            setForm({ name: "", menu_json: '{\n  "button": []\n}' });
            setOpen(true);
          }}
        >
          新建菜单
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : items.length === 0 ? (
        <EmptyStateLayout content="暂无自定义菜单" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={6} rowCount={items.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">ID</Typography></Th>
                <Th><Typography variant="sigma">名称</Typography></Th>
                <Th><Typography variant="sigma">按钮数</Typography></Th>
                <Th><Typography variant="sigma">下发状态</Typography></Th>
                <Th><Typography variant="sigma">下发时间</Typography></Th>
                <Th><Typography variant="sigma">操作</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((m: any) => {
                const btnCount = m.menu_json?.button?.length ?? 0;
                return (
                  <Tr key={m.id}>
                    <Td><Typography>{m.id}</Typography></Td>
                    <Td><Typography>{m.name}</Typography></Td>
                    <Td><Typography textColor="neutral600">{btnCount}</Typography></Td>
                    <Td>
                      <Status
                        variant={
                          m.publish_state === "published"
                            ? "success"
                            : m.publish_state === "failed"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        <Typography>{stateLabel(m.publish_state)}</Typography>
                      </Status>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {m.last_publish_at ? new Date(m.last_publish_at).toLocaleString() : "-"}
                      </Typography>
                    </Td>
                    <Td>
                      <Flex gap={1}>
                        <Button
                          size="S"
                          variant="tertiary"
                          startIcon={<Lightning />}
                          onClick={() => handlePublish(m.id)}
                        >
                          下发
                        </Button>
                        <Button
                          size="S"
                          variant="tertiary"
                          startIcon={<Pencil />}
                          onClick={() => openEdit(m)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="S"
                          variant="danger-light"
                          startIcon={<Trash />}
                          onClick={() => {
                            setDeleteTarget(m);
                            setDeleteOpen(true);
                          }}
                        >
                          删除
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal.Root open={open} onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}>
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>{editId ? "编辑菜单" : "新建菜单"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" gap={4} alignItems="stretch">
              <Field.Root name="name" required>
                <Field.Label>菜单名称</Field.Label>
                <TextInput
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </Field.Root>
              <Field.Root name="menu_json" required>
                <Field.Label>菜单结构 (JSON)</Field.Label>
                <Textarea
                  value={form.menu_json}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setForm({ ...form, menu_json: e.target.value })
                  }
                  placeholder='{"button":[...]}'
                />
                <Typography variant="pi" textColor="neutral600">
                  微信菜单按钮结构，参考菜单创建接口 {"{ \"button\": [...] }"}
                </Typography>
              </Field.Root>
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root open={deleteOpen} onOpenChange={(o: boolean) => { if (!o) setDeleteOpen(false); }}>
        <Modal.Content>
          <Modal.Header closeLabel="关闭"><Modal.Title>确认删除</Modal.Title></Modal.Header>
          <Modal.Body>
            <Typography>确定要删除菜单 “{deleteTarget?.name}” 吗?此操作不可撤销。</Typography>
          </Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setDeleteOpen(false)}>取消</Button>
              <Button variant="danger" onClick={handleDelete}>删除</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};

/* ============================== 4. 模板消息配置 ============================== */
const TemplateSection = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/wx/templates`);
      setItems(toArray(data?.data ?? data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 模板字段：兼容 template_id / templateId / object_id 等命名
  const templateId = (t: any) =>
    t.template_id ?? t.templateId ?? t.object_id ?? t.type ?? t.title ?? "";

  return (
    <Box>
      <Typography variant="delta" paddingBottom={3}>
        模板消息配置
      </Typography>
      <Box paddingBottom={4}>
        <Typography textColor="neutral600" variant="pi">
          以下为公众号已添加的模板列表(来自 /v1/admin/wx/templates)。请在「消息中心 / OAuth 相关 msg-template
          配置」中，把模板的 <code>wxTemplateId</code> 填为列表中的模板 ID，并在 <code>wxTemplateFields</code>
          中配置字段映射后，即可用于发送微信模板消息。
        </Typography>
      </Box>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : items.length === 0 ? (
        <EmptyStateLayout content="暂无模板数据，或公众号未添加模板" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={5} rowCount={items.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">模板 ID</Typography></Th>
                <Th><Typography variant="sigma">标题</Typography></Th>
                <Th><Typography variant="sigma">一级行业</Typography></Th>
                <Th><Typography variant="sigma">二级行业</Typography></Th>
                <Th><Typography variant="sigma">内容</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((t: any, idx: number) => (
                <Tr key={t.template_id ?? t.object_id ?? idx}>
                  <Td><Typography>{templateId(t)}</Typography></Td>
                  <Td><Typography>{t.title || "-"}</Typography></Td>
                  <Td><Typography textColor="neutral600">{t.primary_industry || "-"}</Typography></Td>
                  <Td><Typography textColor="neutral600">{t.deputy_industry || "-"}</Typography></Td>
                  <Td>
                    <Typography textColor="neutral600" variant="pi">
                      {(t.content || "").slice(0, 120)}
                      {(t.content || "").length > 120 ? "..." : ""}
                    </Typography>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

/* ============================== 公众号 Tab 主容器 ============================== */
export const WebchatTab = () => {
  return (
    <Box padding={4}>
      <Flex direction="column" gap={6} alignItems="stretch">
        <CallbackConfig />
        <Divider />
        <QrCodeSection />
        <Divider />
        <MenuSection />
        <Divider />
        <TemplateSection />
      </Flex>
    </Box>
  );
};