import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message } from 'antd';
import { PlusOutlined, GlobalOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { API } from '../utils/api';

const { Option } = Select;
const { TextArea } = Input;

const CATEGORIES = ['tone', 'style', 'phrase', 'disclaimer', 'cta'];
const CATEGORY_LABELS: Record<string, string> = {
  tone: '语气', style: '风格', phrase: '话术', disclaimer: '免责声明', cta: '行动号召',
};

export default function BrandVoicePage() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<boolean>();
  const [form] = Form.useForm();

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus !== undefined) params.status = filterStatus;
      const response = await fetch(API.bvFind(params));
      const data = await response.json();
      setVoices(data || []);
    } catch (err) {
      message.error('加载品牌话术失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVoices(); }, []);

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setModalOpen(true);
  };

  const handleCreateGlobal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setGlobalModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(record.site === null ? false : true);
    setGlobalModalOpen(record.site === null ? true : false);
  };

  const handleDelete = async (record: any) => {
    const url = record.site === null ? API.bvDeleteGlobal(record.documentId) : API.bvDelete(record.documentId);
    await fetch(url, { method: 'DELETE' });
    message.success('删除成功');
    fetchVoices();
  };

  const handleSave = async (isGlobal: boolean) => {
    const values = await form.validateFields();
    const isEdit = !!editing;
    let url: string;
    let method: string;
    if (isGlobal) {
      if (isEdit) { url = API.bvUpdateGlobal(editing.documentId); method = 'PUT'; }
      else { url = API.bvCreateGlobal; method = 'POST'; }
    } else {
      if (isEdit) { url = API.bvUpdate(editing.documentId); method = 'PUT'; }
      else { url = API.bvCreate; method = 'POST'; }
    }
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    message.success('保存成功');
    setModalOpen(false);
    setGlobalModalOpen(false);
    fetchVoices();
  };

  const handlePreview = async (record: any) => {
    const response = await fetch(API.bvResolve(record.documentId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: {} }),
    });
    const text = await response.json();
    setPreviewText(text);
    setPreviewOpen(true);
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类目', dataIndex: 'category', key: 'category',
      render: (cat: string) => <Tag>{CATEGORY_LABELS[cat] || cat}</Tag>,
    },
    {
      title: '层级', dataIndex: 'site', key: 'site',
      render: (site: any) => site === null ? <Tag color="blue">全局</Tag> : <Tag>租户</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: boolean) => <Switch checked={status} disabled />,
    },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (tags: any) => Array.isArray(tags) ? tags.join(', ') : '' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  const formContent = (
    <>
      <Form.Item name="name" label="名称" rules={[{ required: true }]}>
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="category" label="类目" rules={[{ required: true }]}>
        <Select>
          {CATEGORIES.map(c => <Option key={c} value={c}>{CATEGORY_LABELS[c]}</Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="content" label="内容模板" rules={[{ required: true }]}
        extra="支持 {{variable}} 占位符">
        <TextArea rows={6} />
      </Form.Item>
      <Form.Item name="variables" label="变量定义"
        extra='JSON 格式: [{"name":"var","description":"desc","defaultValue":"val"}]'>
        <TextArea rows={3} />
      </Form.Item>
      <Form.Item name="tags" label="标签"
        extra='JSON 数组格式: ["tag1","tag2"]'>
        <Input />
      </Form.Item>
      <Form.Item name="status" label="启用" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );

  return (
    <Card title="品牌话术管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选类目"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => { setFilterCategory(v); }}
        >
          {CATEGORIES.map(c => <Option key={c} value={c}>{CATEGORY_LABELS[c]}</Option>)}
        </Select>
        <Switch
          checkedChildren="启用" unCheckedChildren="全部"
          onChange={(v) => { setFilterStatus(v); }}
        />
        <Button onClick={fetchVoices}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建话术</Button>
        <Button icon={<GlobalOutlined />} onClick={handleCreateGlobal}>新建全局话术</Button>
      </Space>
      <Table columns={columns} dataSource={voices} rowKey="documentId" loading={loading} />
      <Modal title={editing ? '编辑话术' : '新建话术'} open={modalOpen}
        onOk={() => handleSave(false)} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">{formContent}</Form>
      </Modal>
      <Modal title={editing ? '编辑全局话术' : '新建全局话术'} open={globalModalOpen}
        onOk={() => handleSave(true)} onCancel={() => setGlobalModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">{formContent}</Form>
      </Modal>
      <Modal title="变量预览" open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{previewText}</pre>
      </Modal>
    </Card>
  );
}
