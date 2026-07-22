// admin/src/components/PermissionMatrix.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Checkbox, Button, Card, Space, message, Tag, Input, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { fetchPermissionMatrix, updateRolePermissions, resetRolePermissions, fetchAllActions } from '../api';

export const PermissionMatrix: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matrixRes, actionsRes] = await Promise.all([fetchPermissionMatrix(), fetchAllActions()]);
      setRoles(matrixRes.data || []);
      setActions(actionsRes.data || []);
    } catch (err: any) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredActions = actions.filter(a => !filter || a.includes(filter));

  const handleToggle = async (role: string, action: string, checked: boolean) => {
    const roleData = roles.find(r => r.role === role);
    if (!roleData) return;
    const newPerms = checked
      ? [...new Set([...(roleData.permissions || []), action])]
      : (roleData.permissions || []).filter((p: string) => p !== action);

    setSaving(role);
    try {
      await updateRolePermissions(role, newPerms);
      setRoles(prev => prev.map(r => r.role === role ? { ...r, permissions: newPerms } : r));
    } catch (err: any) {
      message.error(`更新失败: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (role: string) => {
    setSaving(role);
    try {
      const res = await resetRolePermissions(role);
      setRoles(prev => prev.map(r => r.role === role ? { ...r, permissions: res.permissions } : r));
      message.success('已恢复默认');
    } catch (err: any) {
      message.error(`恢复失败: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const columns = [
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      fixed: 'left' as const,
      width: 180,
      render: (role: string, record: any) => (
        <Space>
          <span>{record.displayName || role}</span>
          {role === 'ADMIN' && <Tag color="red">不可改</Tag>}
          {record.isSystem && role !== 'ADMIN' && (
            <Button size="small" icon={<ReloadOutlined />} onClick={() => handleReset(role)} loading={saving === role}>
              恢复默认
            </Button>
          )}
        </Space>
      ),
    },
    ...filteredActions.map(action => ({
      title: action,
      key: action,
      width: 120,
      render: (_: any, record: any) => {
        if (record.role === 'ADMIN') {
          return <Checkbox checked disabled />;
        }
        const has = (record.permissions || []).includes(action);
        return (
          <Checkbox
            checked={has}
            onChange={e => handleToggle(record.role, action, e.target.checked)}
            disabled={saving === record.role}
          />
        );
      },
    })),
  ];

  return (
    <Card title="权限矩阵">
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="筛选 action（如 zhao-deal）"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: 300 }}
        />
        <Button onClick={load} loading={loading}>刷新</Button>
      </Space>
      <Table
        dataSource={roles}
        columns={columns}
        rowKey="role"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
    </Card>
  );
};

export default PermissionMatrix;
