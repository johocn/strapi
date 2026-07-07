import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, InputNumber, Space, message, Popconfirm, Alert } from 'antd';
import { PlusOutlined, ExportOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useFetch, postJSON, putJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const FirstTruthPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [listParams, setListParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { data: truths, loading } = useFetch<any[]>(API.ftFind(listParams));
  const { data: conflicts, loading: loadingConflicts } = useFetch<any[]>(
    activeTab === 'conflicts' ? API.ftConflicts : null
  );

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
        await putJSON(API.ftUpdate(editingId), values);
        message.success('已更新');
      } else {
        await postJSON(API.ftCreate, values);
        message.success('已创建');
      }
      setModalOpen(false);
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (documentId: string) => {
    try {
      await postJSON(API.ftVerify(documentId), {});
      message.success('已标记为 verified');
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteJSON(API.ftDelete(documentId));
      message.success('已删除');
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(API.ftExportFacts).then((r) => r.json());
      setExportData(res);
      setExportOpen(true);
    } catch (err) {
      message.error(`导出失败: ${(err as Error).message}`);
    }
  };

  const columns = [
    { title: 'claimKey', dataIndex: 'claimKey' },
    { title: 'claim', dataIndex: 'claim' },
    { title: 'canonicalValue', dataIndex: 'canonicalValue' },
    { title: '类目', dataIndex: 'claimCategory' },
    { title: '优先级', dataIndex: 'priority' },
    {
      title: '状态',
      dataIndex: 'verificationStatus',
      render: (v: string) => (
        <span style={{ color: v === 'verified' ? '#52c41a' : v === 'conflict' ? '#ff4d4f' : '#faad14' }}>{v}</span>
      ),
    },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>编辑</Button>
          {record.verificationStatus !== 'verified' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record.documentId)}>
              verify
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.documentId)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const conflictColumns = [
    { title: 'claimKey', dataIndex: 'claimKey' },
    {
      title: '严重级别',
      dataIndex: 'severity',
      render: (v: string) => (
        <Space>
          <WarningOutlined style={{ color: v === 'error' ? '#ff4d4f' : '#faad14' }} />
          {v}
        </Space>
      ),
    },
    {
      title: '冲突值',
      dataIndex: 'values',
      render: (values: any[]) => (
        <div>
          {values?.map((v, i) => (
            <div key={i}>
              <strong>{v.value}</strong> <span style={{ color: '#999' }}>({v.sourceType}: {v.sourceUrl || '-'})</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={handleOpenCreate}>新建真值</Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出 Facts</Button>
      </Space>

      {conflicts && conflicts.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`检测到 ${conflicts.length} 个冲突，请到「冲突检测」Tab 处理`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: '真值列表',
            children: (
              <Table
                columns={columns}
                dataSource={truths || []}
                rowKey="documentId"
                loading={loading}
                size="small"
                pagination={{ current: listParams.page, pageSize: listParams.pageSize }}
              />
            ),
          },
          {
            key: 'conflicts',
            label: '冲突检测',
            children: (
              <Table
                columns={conflictColumns}
                dataSource={conflicts || []}
                rowKey="claimKey"
                loading={loadingConflicts}
                size="small"
                pagination={false}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingId ? '编辑真值' : '新建真值'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="claimKey" label="claimKey" rules={[{ required: true }]}>
            <Input disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="claim" label="claim" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="canonicalValue" label="canonicalValue" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="claimCategory" label="类目">
            <Input />
          </Form.Item>
          <Form.Item name="priority" label="优先级（0-100）">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="canonicalSourceUrl" label="来源 URL">
            <Input />
          </Form.Item>
          <Form.Item name="canonicalSourceType" label="来源类型">
            <Select options={['official', 'report', 'news', 'other'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Facts 导出"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        footer={null}
        width={700}
      >
        <pre style={{ maxHeight: 500, overflow: 'auto' }}>
          {exportData ? JSON.stringify(exportData, null, 2) : '加载中...'}
        </pre>
      </Modal>
    </Card>
  );
};

export default FirstTruthPage;
