import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { MediaPicker, type MediaValue } from "./PhotoUploader";
import {
  absoluteMediaUrl,
  errorMessage,
  useTireApi,
  type TireApi,
} from "../utils/api";

const { Text } = Typography;

const moveItem = async (
  api: TireApi,
  name: string,
  list: any[],
  record: any,
  direction: -1 | 1
) => {
  const sorted = [...list].sort(
    (a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)
  );
  const index = sorted.findIndex((item) => item.id === record.id);
  const target = sorted[index + direction];
  if (index < 0 || !target) return;
  try {
    await api.updateCollection(name, Number(target.id), {
      sort: Number(record.sort) || 0,
    });
    await api.updateCollection(name, Number(record.id), {
      sort: Number(target.sort) || 0,
    });
    message.success("排序已更新");
  } catch (error) {
    message.error(`排序失败：${errorMessage(error)}`);
  }
};

type ManagerProps = {
  name: string;
  title: string;
  onChanged?: () => void;
};

const FaqManager = ({ name, title, onChanged }: ManagerProps) => {
  const api = useTireApi();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, enabled: true });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const submit = async () => {
    const values: any = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        question: values.question,
        answer: values.answer,
        sort: Number(values.sort) || 0,
        enabled: Boolean(values.enabled),
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: any) => {
    try {
      await api.removeCollection(name, Number(record.id));
      message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`删除失败：${errorMessage(error)}`);
    }
  };

  const columns = [
    {
      title: "问题",
      dataIndex: "question",
      width: 260,
      render: (value: string) => value || "-",
    },
    {
      title: "回答",
      dataIndex: "answer",
      width: 420,
      render: (value: string) => (
        <div style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</div>
      ),
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value: boolean) =>
        value ? (
          <Text type="success">启用</Text>
        ) : (
          <Text type="secondary">停用</Text>
        ),
    },
    {
      title: "操作",
      width: 220,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Button size="small" type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<ArrowUpOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }}
          />
          <Button
            size="small"
            type="link"
            icon={<ArrowDownOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }}
          />
          <Popconfirm title="删除该问答？" onConfirm={() => remove(record)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={title}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增问答
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns as any}
          dataSource={list}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      </Card>
      <Modal
        open={open}
        title={editing ? "编辑问答" : "新增问答"}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        width={620}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="question"
            label="问题"
            rules={[{ required: true, message: "请填写问题" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="answer"
            label="回答"
            rules={[{ required: true, message: "请填写回答" }]}
          >
            <Input.TextArea rows={5} />
          </Form.Item>
          <Space size={16} style={{ display: "flex" }}>
            <Form.Item name="sort" label="排序" style={{ width: 160 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
};

const ReviewManager = ({ name, title, onChanged }: ManagerProps) => {
  const api = useTireApi();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ rating: 5, showOnHome: false, sort: 0 });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const submit = async () => {
    const values: any = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        nickname: values.nickname || "",
        content: values.content || "",
        rating: Number(values.rating) || 0,
        showOnHome: Boolean(values.showOnHome),
        sort: Number(values.sort) || 0,
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: any) => {
    try {
      await api.removeCollection(name, Number(record.id));
      message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`删除失败：${errorMessage(error)}`);
    }
  };

  const columns = [
    { title: "昵称", dataIndex: "nickname", width: 140, render: (v: string) => v || "-" },
    {
      title: "评价内容",
      dataIndex: "content",
      width: 420,
      render: (value: string) => (
        <div style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</div>
      ),
    },
    {
      title: "评分",
      dataIndex: "rating",
      width: 90,
      render: (value: number) => `${value || 0} 分`,
    },
    {
      title: "首页展示",
      dataIndex: "showOnHome",
      width: 100,
      render: (value: boolean) =>
        value ? <Text type="success">是</Text> : <Text type="secondary">否</Text>,
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "操作",
      width: 220,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Button size="small" type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<ArrowUpOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }}
          />
          <Button
            size="small"
            type="link"
            icon={<ArrowDownOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }}
          />
          <Popconfirm title="删除该评价？" onConfirm={() => remove(record)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={title}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增评价
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns as any}
          dataSource={list}
          pagination={false}
          scroll={{ x: 1050 }}
        />
      </Card>
      <Modal
        open={open}
        title={editing ? "编辑评价" : "新增评价"}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        width={620}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nickname" label="昵称">
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item name="content" label="评价内容">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Space size={16} style={{ display: "flex" }}>
            <Form.Item name="rating" label="评分" style={{ width: 160 }}>
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="sort" label="排序" style={{ width: 160 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="showOnHome" label="首页展示" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
};

const GalleryManager = ({ name, title, onChanged }: ManagerProps) => {
  const api = useTireApi();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<MediaValue>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setImage(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0 });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    setImage(
      record.image
        ? { id: Number(record.image.id), url: absoluteMediaUrl(record.image.url) }
        : null
    );
    form.setFieldsValue(record);
    setOpen(true);
  };

  const submit = async () => {
    const values: any = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        caption: values.caption || "",
        sort: Number(values.sort) || 0,
        imageId: image?.id ?? null,
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: any) => {
    try {
      await api.removeCollection(name, Number(record.id));
      message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      message.error(`删除失败：${errorMessage(error)}`);
    }
  };

  const columns = [
    {
      title: "图片",
      dataIndex: "image",
      width: 120,
      render: (value: any) =>
        value?.url ? (
          <Image
            src={absoluteMediaUrl(value.url)}
            width={72}
            height={72}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          <Text type="secondary">未设置</Text>
        ),
    },
    {
      title: "说明",
      dataIndex: "caption",
      width: 300,
      render: (value: string) => value || "-",
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "操作",
      width: 220,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Button size="small" type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<ArrowUpOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }}
          />
          <Button
            size="small"
            type="link"
            icon={<ArrowDownOutlined />}
            onClick={async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }}
          />
          <Popconfirm title="删除该图片？" onConfirm={() => remove(record)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={title}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增图片
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns as any}
          dataSource={list}
          pagination={false}
          scroll={{ x: 850 }}
        />
      </Card>
      <Modal
        open={open}
        title={editing ? "编辑图片" : "新增图片"}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="图片" required>
            <MediaPicker
              value={image}
              onChange={setImage}
              hint="建议使用横向或方形图片，单张不超过 5MB。"
            />
          </Form.Item>
          <Form.Item name="caption" label="图片说明">
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export { FaqManager, ReviewManager, GalleryManager };
