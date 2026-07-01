import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import PlatformForm from '../components/PlatformForm';

const { Title, Text } = Typography;

const PlatformConfigPage = () => {
  const { platforms, loading, createPlatform, updatePlatform, deletePlatform } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deletePlatform(record.documentId || record.id);
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
        <Title level={3}>平台配置</Title>
        <Text type="secondary">管理发布平台</Text>
      </div>
      <Card
        title="平台列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增平台</Button>}
      >
        <Table columns={columns} dataSource={platforms} rowKey={(r) => r.documentId || r.id} loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑平台' : '新增平台'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <PlatformForm
          platform={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await updatePlatform(editing.documentId || editing.id, data);
              } else {
                await createPlatform(data);
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

export default PlatformConfigPage;
