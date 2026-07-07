import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, ExportOutlined } from '@ant-design/icons';
import { useFetch, postJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const KnowledgeGraphPage = () => {
  const [activeTab, setActiveTab] = useState('entities');
  const [entityParams, setEntityParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [relationParams, setRelationParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [entityForm] = Form.useForm();
  const [relationForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { data: entities, loading: loadingEntities, refetch: refetchEntities } = useFetch<any[]>(
    activeTab === 'entities' ? API.kgFindEntities(entityParams) : null
  );
  const { data: relations, loading: loadingRelations, refetch: refetchRelations } = useFetch<any[]>(
    activeTab === 'relations' ? API.kgFindRelations(relationParams) : null
  );

  const handleCreateEntity = async (values: any) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgCreateEntity, values);
      message.success('实体创建成功');
      setEntityModalOpen(false);
      entityForm.resetFields();
      refetchEntities();
    } catch (err) {
      message.error(`创建失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntity = async (documentId: string) => {
    try {
      await deleteJSON(API.kgDeleteEntity(documentId));
      message.success('已删除');
      refetchEntities();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleAddRelation = async (values: any) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgAddRelation, values);
      message.success('关系创建成功');
      setRelationModalOpen(false);
      relationForm.resetFields();
      refetchRelations();
    } catch (err) {
      message.error(`创建失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRelation = async (documentId: string) => {
    try {
      await deleteJSON(API.kgDeleteRelation(documentId));
      message.success('已删除');
      refetchRelations();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(API.kgExportGraph).then((r) => r.json());
      setExportData(res);
      setExportModalOpen(true);
    } catch (err) {
      message.error(`导出失败: ${(err as Error).message}`);
    }
  };

  const entityColumns = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'entityType' },
    { title: 'Slug', dataIndex: 'slug' },
    { title: '来源', dataIndex: 'sourceType' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteEntity(record.documentId)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const relationColumns = [
    { title: '主体', dataIndex: ['subjectEntity', 'name'], render: (v: any) => v || '-' },
    { title: '谓词', dataIndex: 'predicate' },
    { title: '客体实体', dataIndex: ['objectEntity', 'name'], render: (v: any) => v || '-' },
    { title: '客体值', dataIndex: 'objectValue', render: (v: any) => v ?? '-' },
    { title: '客体文本', dataIndex: 'objectText', render: (v: any) => v ?? '-' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRelation(record.documentId)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出 JSON-LD</Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'entities',
            label: '实体',
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setEntityModalOpen(true)} style={{ marginBottom: 16 }}>
                  新建实体
                </Button>
                <Table
                  columns={entityColumns}
                  dataSource={entities || []}
                  rowKey="documentId"
                  loading={loadingEntities}
                  size="small"
                  pagination={{ current: entityParams.page, pageSize: entityParams.pageSize }}
                />
              </>
            ),
          },
          {
            key: 'relations',
            label: '关系',
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setRelationModalOpen(true)} style={{ marginBottom: 16 }}>
                  新建关系
                </Button>
                <Table
                  columns={relationColumns}
                  dataSource={relations || []}
                  rowKey="documentId"
                  loading={loadingRelations}
                  size="small"
                  pagination={{ current: relationParams.page, pageSize: relationParams.pageSize }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="新建实体"
        open={entityModalOpen}
        onCancel={() => setEntityModalOpen(false)}
        onOk={() => entityForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={entityForm} layout="vertical" onFinish={handleCreateEntity}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="entityType" label="类型" rules={[{ required: true }]}>
            <Select options={[
              'Organization', 'Person', 'Product', 'Article', 'CaseStudy',
              'Event', 'FAQ', 'HowTo', 'Download',
            ].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建关系"
        open={relationModalOpen}
        onCancel={() => setRelationModalOpen(false)}
        onOk={() => relationForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={relationForm} layout="vertical" onFinish={handleAddRelation}>
          <Form.Item name="subjectEntityId" label="主体 Entity Document ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="predicate" label="谓词" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="objectEntityId" label="客体 Entity Document ID（与值二选一）">
            <Input />
          </Form.Item>
          <Form.Item name="objectValue" label="客体值（与实体二选一）">
            <Input />
          </Form.Item>
          <Form.Item name="objectText" label="客体文本（与实体二选一）">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="JSON-LD 导出"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
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

export default KnowledgeGraphPage;
