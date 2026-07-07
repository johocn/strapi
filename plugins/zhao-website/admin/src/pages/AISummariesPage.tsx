import React, { useState } from 'react';
import { Card, Table, Button, Select, Space, message, Popconfirm, Modal, Form, Input, Tag } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useFetch, postJSON, putJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const AISummariesPage = () => {
  const [targetType, setTargetType] = useState<string | undefined>(undefined);
  const [summaryType, setSummaryType] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const params: Record<string, any> = {};
  if (targetType) params.targetType = targetType;
  if (summaryType) params.summaryType = summaryType;

  const { data: summaries, loading, refetch } = useFetch<any[]>(API.aiFindByTarget(params));

  const handleRegenerate = async (documentId: string) => {
    setRegenerating(documentId);
    try {
      await postJSON(API.aiRegenerate(documentId), {});
      message.success('AI 重新生成已触发（异步，请稍后刷新查看）');
      refetch();
    } catch (err) {
      message.error(`触发失败: ${(err as Error).message}`);
    } finally {
      setRegenerating(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteJSON(API.aiDelete(documentId));
      message.success('已删除');
      refetch();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingId(record.documentId);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await putJSON(API.aiUpdate(editingId), values);
        message.success('已更新');
      } else {
        await postJSON(API.aiCreate, values);
        message.success('已创建');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'targetType', dataIndex: 'targetType' },
    { title: 'targetId', dataIndex: 'targetId' },
    { title: 'summaryType', dataIndex: 'summaryType', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => v?.slice(0, 80) + (v?.length > 80 ? '...' : ''),
    },
    { title: '版本', dataIndex: 'version' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>编辑</Button>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            loading={regenerating === record.documentId}
            onClick={() => handleRegenerate(record.documentId)}
          >
            重新生成
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.documentId)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选 targetType"
          style={{ width: 150 }}
          value={targetType}
          onChange={setTargetType}
          options={['article', 'product', 'case', 'faq', 'tutorial'].map((t) => ({ label: t, value: t }))}
        />
        <Select
          allowClear
          placeholder="筛选 summaryType"
          style={{ width: 150 }}
          value={summaryType}
          onChange={setSummaryType}
          options={['brief', 'detailed', 'seo', 'social'].map((t) => ({ label: t, value: t }))}
        />
        <Button icon={<PlusOutlined />} onClick={handleOpenCreate}>新建</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={summaries || []}
        rowKey="documentId"
        loading={loading}
        size="small"
      />

      <Modal
        title={editingId ? '编辑摘要' : '新建摘要'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="targetType" label="targetType" rules={[{ required: true }]}>
            <Select options={['article', 'product', 'case', 'faq', 'tutorial'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="targetId" label="targetId" rules={[{ required: true }]}>
            <Input disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="summaryType" label="summaryType" rules={[{ required: true }]}>
            <Select options={['brief', 'detailed', 'seo', 'social'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="content" label="content" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AISummariesPage;
