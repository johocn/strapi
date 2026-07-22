// admin/src/pages/AuditLogPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Input, Button, Space, message, Form, Tag } from 'antd';
import { fetchLogs, checkPermission } from '../api';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLogs({ page, pageSize: 20, action });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  const handleCheck = async (values: any) => {
    try {
      const res = await checkPermission(Number(values.userId), values.action);
      setCheckResult(res.data);
    } catch (err: any) {
      message.error(`检查失败: ${err.message}`);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="权限检查工具">
        <Form layout="inline" onFinish={handleCheck}>
          <Form.Item name="userId" label="用户ID" rules={[{ required: true }]}>
            <Input type="number" placeholder="1" />
          </Form.Item>
          <Form.Item name="action" label="Action" rules={[{ required: true }]}>
            <Input placeholder="zhao-deal.coupon.manage" style={{ width: 300 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">检查</Button>
          </Form.Item>
        </Form>
        {checkResult && (
          <div style={{ marginTop: 16 }}>
            <Tag color={checkResult.allowed ? 'green' : 'red'}>
              {checkResult.allowed ? '允许' : '拒绝'}
            </Tag>
            <span style={{ marginLeft: 8 }}>{checkResult.reasons.join('; ')}</span>
          </div>
        )}
      </Card>

      <Card title="操作日志">
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="按 action 筛选"
            value={action}
            onChange={e => setAction(e.target.value)}
            style={{ width: 300 }}
          />
          <Button onClick={load} loading={loading}>搜索</Button>
        </Space>
        <Table
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            onChange: p => setPage(p),
          }}
        >
          <Table.Column title="时间" dataIndex="createdAt" key="createdAt" />
          <Table.Column title="操作人" dataIndex="operatorName" key="operatorName" />
          <Table.Column title="动作" dataIndex="action" key="action" />
          <Table.Column title="目标" dataIndex="targetType" key="targetType" />
          <Table.Column title="详情" dataIndex="detail" key="detail" ellipsis />
        </Table>
      </Card>
    </Space>
  );
};

export default AuditLogPage;
