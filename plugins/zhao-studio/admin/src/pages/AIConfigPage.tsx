import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';
import AIConfigForm from '../components/AIConfigForm';

const { Title, Text } = Typography;

const AIConfigPage = () => {
  const { configs, loading, createConfig, updateConfig, deleteConfig } = useAIConfig();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '服务商', dataIndex: 'provider', key: 'provider' },
    { title: '模型', dataIndex: 'model', key: 'model' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteConfig(record.documentId || record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>AI 配置</Title>
        <Text type="secondary">管理 AI 服务商配置</Text>
      </div>
      <Card
        title="配置列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增配置</Button>}
      >
        <Table columns={columns} dataSource={configs} rowKey={(r) => r.documentId || r.id} loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑 AI 配置' : '新增 AI 配置'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <AIConfigForm
          config={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await updateConfig(editing.documentId || editing.id, data);
              } else {
                await createConfig(data);
              }
              message.success('保存成功');
              setShowModal(false);
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default AIConfigPage;
