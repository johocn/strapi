import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import AccountForm from '../components/AccountForm';

const { Title, Text } = Typography;

const AccountConfigPage = () => {
  const { accounts, loading, createAccount, updateAccount, deleteAccount } = usePublishAccounts();
  const { platforms } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
      render: (v: string) => v || '-',
    },
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
                await deleteAccount(record.documentId || record.id);
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
        <Title level={3}>账号配置</Title>
        <Text type="secondary">管理各平台的发布账号</Text>
      </div>
      <Card
        title="账号列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增账号</Button>}
      >
        <Table columns={columns} dataSource={accounts} rowKey={(r) => r.documentId || r.id} loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑账号' : '新增账号'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <AccountForm
          account={editing}
          platforms={platforms}
          onSave={async (data) => {
            try {
              if (editing) {
                await updateAccount(editing.documentId || editing.id, data);
              } else {
                await createAccount(data);
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

export default AccountConfigPage;
