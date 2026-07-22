import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { useAdSlots } from '../hooks/useAdSlots';
import AdSlotForm from '../components/AdSlotForm';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;

const AdSlotConfigPage = () => {
  const { slots, loading, createSlot, updateSlot, deleteSlot } = useAdSlots();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '位置', dataIndex: 'position', key: 'position' },
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
                await deleteSlot(record.documentId || record.id);
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
    <PermissionGate action="zhao-studio.ad-slot.manage">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>广告位配置</Title>
          <Text type="secondary">管理广告位</Text>
        </div>
        <Card
          title="广告位列表"
          extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增广告位</Button>}
        >
          <Table columns={columns} dataSource={slots} rowKey={(r) => r.documentId || r.id} loading={loading} />
        </Card>
        <Modal
          open={showModal}
          title={editing ? '编辑广告位' : '新增广告位'}
          onCancel={() => setShowModal(false)}
          footer={null}
          destroyOnClose
        >
          <AdSlotForm
            slot={editing}
            onSave={async (data) => {
              try {
                if (editing) {
                  await updateSlot(editing.documentId || editing.id, data);
                } else {
                  await createSlot(data);
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
    </PermissionGate>
  );
};

export default AdSlotConfigPage;
