// admin/src/pages/UserManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, Tag } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchUsers, fetchUserDetail, assignRole, revokeRole, updateChannelScope, fetchAssignableRoles } from '../api';
import { RoleBadge, ChannelScopePicker, PermissionButton } from '../components';

const { Column } = Table;

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsers({ page, pageSize, search });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      message.error(`加载用户失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetchAssignableRoles();
      setRoles(res.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadRoles(); }, [loadRoles]);

  const showDetail = async (record: any) => {
    try {
      const res = await fetchUserDetail(record.documentId);
      setDetail(res.data);
      setDetailVisible(true);
    } catch (err: any) {
      message.error(`加载详情失败: ${err.message}`);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      await assignRole(userId, role);
      message.success('角色已分配');
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err: any) {
      message.error(`分配失败: ${err.message}`);
    }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    try {
      await revokeRole(userId, role);
      message.success('角色已撤销');
      if (detail && detail.id === userId) {
        const res = await fetchUserDetail(detail.documentId);
        setDetail(res.data);
      }
    } catch (err: any) {
      message.error(`撤销失败: ${err.message}`);
    }
  };

  return (
    <Card title="用户管理">
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索用户名/邮箱"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onPressEnter={loadUsers}
          style={{ width: 300 }}
        />
        <Button type="primary" onClick={loadUsers}>搜索</Button>
      </Space>

      <Table
        dataSource={users}
        rowKey="documentId"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      >
        <Column title="用户名" dataIndex="username" key="username" />
        <Column title="邮箱" dataIndex="email" key="email" />
        <Column
          title="角色"
          dataIndex="zhaoRoles"
          key="zhaoRoles"
          render={(roles: string[]) => (
            <span>{roles?.map(r => <RoleBadge key={r} role={r} />)}</span>
          )}
        />
        <Column
          title="操作"
          key="action"
          render={(_, record: any) => (
            <PermissionButton action="zhao-auth.user.manage" type="link" onClick={() => showDetail(record)}>
              详情
            </PermissionButton>
          )}
        />
      </Table>

      <Modal
        title="用户详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {detail && (
          <div>
            <p><strong>用户名:</strong> {detail.username}</p>
            <p><strong>邮箱:</strong> {detail.email}</p>
            <p><strong>当前角色:</strong></p>
            <div style={{ marginBottom: 8 }}>
              {detail.zhaoRoles?.map((r: string) => (
                <Tag key={r} closable onClose={() => handleRevokeRole(detail.id, r)}>
                  {r}
                </Tag>
              ))}
            </div>
            <p><strong>分配新角色:</strong></p>
            <Select
              style={{ width: '100%', marginBottom: 16 }}
              placeholder="选择角色"
              onSelect={(role: string) => handleAssignRole(detail.id, role)}
            >
              {roles.filter(r => !detail.zhaoRoles?.includes(r.role)).map(r => (
                <Select.Option key={r.role} value={r.role}>{r.displayName}</Select.Option>
              ))}
            </Select>
            <p><strong>渠道范围:</strong></p>
            <ChannelScopePicker
              value={detail.channelScope}
              onChange={async (scope) => {
                try {
                  await updateChannelScope(detail.id, scope);
                  message.success('渠道范围已更新');
                } catch (err: any) {
                  message.error(`更新失败: ${err.message}`);
                }
              }}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default UserManagementPage;
