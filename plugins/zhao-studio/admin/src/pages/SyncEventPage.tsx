import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Tag, Space, Select, Radio, message, Descriptions } from 'antd';
import { CheckOutlined, EyeOutlined } from '@ant-design/icons';
import { syncEventApi } from '../utils/syncEventApi';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  resolved: 'green',
  ignored: 'default',
};
const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  resolved: '已处理',
  ignored: '已忽略',
};

export default function SyncEventPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [action, setAction] = useState<'create' | 'update' | 'ignore'>('create');
  const [draftId, setDraftId] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<string>();
  const [filterContentType, setFilterContentType] = useState<string>();
  const [drafts, setDrafts] = useState<any[]>([]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterStatus) params.eventStatus = filterStatus;
      if (filterContentType) params.sourceContentType = filterContentType;
      const data = await syncEventApi.list(params);
      setEvents(data || []);
    } catch (err) {
      message.error('加载同步事件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleResolve = async (record: any) => {
    setCurrentEvent(record);
    setAction('create');
    setDraftId(undefined);
    // 获取草稿列表
    try {
      const res = await fetch('/api/zhao-studio/v1/admin/article-drafts?status=draft');
      const data = await res.json();
      setDrafts(data || []);
    } catch (err) {
      setDrafts([]);
    }
    setResolveModalOpen(true);
  };

  const handleView = (record: any) => {
    setCurrentEvent(record);
    setDetailModalOpen(true);
  };

  const handleConfirmResolve = async () => {
    const body: any = { action, resolvedBy: 'admin' };
    if (action === 'update' && draftId) body.draftId = draftId;
    await syncEventApi.resolve(currentEvent.documentId, body);
    message.success('处理成功');
    setResolveModalOpen(false);
    fetchEvents();
  };

  const columns = [
    { title: '来源标题', dataIndex: 'sourceTitle', key: 'sourceTitle', ellipsis: true },
    { title: '内容类型', dataIndex: 'sourceContentType', key: 'sourceContentType' },
    {
      title: '状态', dataIndex: 'eventStatus', key: 'eventStatus',
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Tag>,
    },
    {
      title: '关联草稿', dataIndex: 'targetDraftId', key: 'targetDraftId',
      render: (draft: any) => draft ? draft.title || draft.documentId : '-',
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.eventStatus === 'pending' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleResolve(record)}>处理</Button>
          )}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="同步事件管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选状态"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => { setFilterStatus(v); }}
        >
          <Option value="pending">待处理</Option>
          <Option value="resolved">已处理</Option>
          <Option value="ignored">已忽略</Option>
        </Select>
        <Select
          placeholder="筛选内容类型"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => { setFilterContentType(v); }}
        >
          <Option value="article">文章</Option>
          <Option value="product">产品</Option>
          <Option value="case">案例</Option>
          <Option value="faq">FAQ</Option>
        </Select>
        <Button onClick={fetchEvents}>查询</Button>
      </Space>
      <Table columns={columns} dataSource={events} rowKey="documentId" loading={loading} />
      <Modal title="处理同步事件" open={resolveModalOpen}
        onOk={handleConfirmResolve} onCancel={() => setResolveModalOpen(false)}>
        {currentEvent && (
          <div>
            <p><strong>来源标题：</strong>{currentEvent.sourceTitle}</p>
            <p><strong>内容类型：</strong>{currentEvent.sourceContentType}</p>
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)} style={{ marginTop: 16 }}>
              <Space direction="vertical">
                <Radio value="create">新建草稿</Radio>
                <Radio value="update">更新已有草稿</Radio>
                <Radio value="ignore">忽略</Radio>
              </Space>
            </Radio.Group>
            {action === 'update' && (
              <Select
                placeholder="选择草稿"
                style={{ width: '100%', marginTop: 8 }}
                onChange={(v) => setDraftId(v)}
              >
                {drafts.map((d: any) => (
                  <Option key={d.documentId} value={d.documentId}>{d.title}</Option>
                ))}
              </Select>
            )}
          </div>
        )}
      </Modal>
      <Modal title="同步事件详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null}>
        {currentEvent && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="来源标题">{currentEvent.sourceTitle}</Descriptions.Item>
            <Descriptions.Item label="内容类型">{currentEvent.sourceContentType}</Descriptions.Item>
            <Descriptions.Item label="来源 URL">{currentEvent.sourceUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{STATUS_LABELS[currentEvent.eventStatus] || currentEvent.eventStatus}</Descriptions.Item>
            <Descriptions.Item label="处理人">{currentEvent.resolvedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="处理时间">{currentEvent.resolvedAt || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联草稿">{currentEvent.targetDraftId?.title || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}
