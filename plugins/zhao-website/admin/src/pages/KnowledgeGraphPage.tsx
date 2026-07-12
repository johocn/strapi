import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, ExportOutlined, GlobalOutlined } from '@ant-design/icons';
import { useFetch, postJSON, putJSON, deleteJSON } from '../hooks/useFetch';
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
  const [globalMode, setGlobalMode] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);

  const { data: entities, loading: loadingEntities, refetch: refetchEntities } = useFetch<any[]>(
    activeTab === 'entities' ? API.kgFindEntities(entityParams) : null
  );
  const { data: relations, loading: loadingRelations, refetch: refetchRelations } = useFetch<any[]>(
    activeTab === 'relations' ? API.kgFindRelations(relationParams) : null
  );

  const handleCreateEntity = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingEntity) {
        const url = globalMode
          ? API.kgUpdateGlobalEntity(editingEntity.documentId)
          : API.kgUpdateEntity(editingEntity.documentId);
        await putJSON(url, values);
        message.success('实体更新成功');
      } else {
        const url = globalMode ? API.kgCreateGlobalEntity : API.kgCreateEntity;
        await postJSON(url, values);
        message.success('实体创建成功');
      }
      setEntityModalOpen(false);
      entityForm.resetFields();
      setEditingEntity(null);
      refetchEntities();
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGlobalEntity = () => {
    setEditingEntity(null);
    setGlobalMode(true);
    entityForm.resetFields();
    setEntityModalOpen(true);
  };

  const handleEditEntity = (record: any) => {
    setEditingEntity(record);
    setGlobalMode(record.site === null);
    entityForm.setFieldsValue(record);
    setEntityModalOpen(true);
  };

  const handleDeleteEntity = async (record: any) => {
    try {
      const url = record.site === null
        ? API.kgDeleteGlobalEntity(record.documentId)
        : API.kgDeleteEntity(record.documentId);
      await deleteJSON(url);
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
    {
      title: '层级', dataIndex: 'site', key: 'site',
      render: (site: any) => site === null ? <Tag color="blue">全局</Tag> : <Tag>租户</Tag>,
    },
    { title: '类型', dataIndex: 'entityType' },
    { title: 'Slug', dataIndex: 'slug' },
    { title: '来源', dataIndex: 'sourceType' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditEntity(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteEntity(record)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
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
                <Space style={{ marginBottom: 16 }}>
                  <Button icon={<PlusOutlined />} onClick={() => { setEditingEntity(null); setGlobalMode(false); entityForm.resetFields(); setEntityModalOpen(true); }}>
                    新建实体
                  </Button>
                  <Button icon={<GlobalOutlined />} onClick={handleCreateGlobalEntity}>
                    新建全局实体
                  </Button>
                </Space>
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
        title={editingEntity ? (globalMode ? '编辑全局实体' : '编辑实体') : (globalMode ? '新建全局实体' : '新建实体')}
        open={entityModalOpen}
        onCancel={() => { setEntityModalOpen(false); setEditingEntity(null); setGlobalMode(false); }}
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
