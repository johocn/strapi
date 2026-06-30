import { ProTable, type ProColumns, type ActionType, ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Tag, Statistic, Space, message, Popconfirm } from 'antd';
import { useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { COLLECT_METHODS, COLLECT_STATUS } from '../../constants/enums';

const TaskTab = () => {
  const api = useApi();
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);
  const [stats, setStats] = useState({ success: 0, failed: 0, pending: 0 });

  const refreshStats = async () => {
    const res = await api.getCollectConfigs({ pageSize: 500 });
    const list = res.records || [];
    setStats({
      success: list.filter((c: any) => c.collectStatus === 'success').length,
      failed: list.filter((c: any) => c.collectStatus === 'failed').length,
      pending: list.filter((c: any) => c.collectStatus === 'pending').length,
    });
  };

  const columns: ProColumns<any>[] = [
    { title: '产品名称', width: 200, render: (_, r) => r.product?.productName || '-' },
    { title: '采集方式', dataIndex: 'collectMethod', width: 120, render: (_, r) => <Tag>{COLLECT_METHODS[r.collectMethod]}</Tag> },
    { title: '采集URL', dataIndex: 'collectUrl', ellipsis: true, render: (_, r) => r.collectUrl || '-' },
    {
      title: '状态', dataIndex: 'collectStatus', width: 90,
      render: (_, r) => {
        const s = COLLECT_STATUS[r.collectStatus];
        return <Tag color={s?.color}>{s?.label || r.collectStatus}</Tag>;
      },
    },
    { title: '最后采集', dataIndex: 'lastCollectTime', width: 160, render: (_, r) => r.lastCollectTime ? new Date(r.lastCollectTime).toLocaleString() : '-' },
    { title: '失败次数', dataIndex: 'failCount', width: 90 },
    {
      title: '操作', width: 180, valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>配置</a>,
        <Popconfirm key="trigger" title="触发采集？" onConfirm={async () => {
          try { await api.triggerCollect(r.product?.id); message.success('采集任务已触发'); } catch (e: any) { message.error(e.message); }
        }}>
          <a>采集</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Statistic title="成功" value={stats.success} valueStyle={{ color: '#52c41a' }} />
        <Statistic title="失败" value={stats.failed} valueStyle={{ color: '#ff4d4f' }} />
        <Statistic title="待采" value={stats.pending} valueStyle={{ color: '#faad14' }} />
      </Space>
      <ProTable<any>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async (params) => {
          const res = await api.getCollectConfigs({ page: params.current, pageSize: params.pageSize });
          refreshStats();
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
      />
      <ModalForm
        title="编辑采集配置"
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setCurrent(undefined); }}
        initialValues={current ? {
          collectMethod: current.collectMethod,
          collectUrl: current.collectUrl,
          collectRules: current.collectRules ? JSON.stringify(current.collectRules, null, 2) : '',
        } : { collectMethod: 'web-crawler' }}
        modalProps={{ destroyOnClose: true, width: 600 }}
        onFinish={async (values) => {
          try {
            const data = {
              collectMethod: values.collectMethod,
              collectUrl: values.collectUrl,
              collectRules: values.collectRules ? JSON.parse(values.collectRules) : null,
            };
            await api.updateCollectConfig(current.id, data);
            message.success('更新成功');
            actionRef.current?.reload();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormSelect name="collectMethod" label="采集方式" options={Object.entries(COLLECT_METHODS).map(([v, l]) => ({ value: v, label: l }))} />
        <ProFormText name="collectUrl" label="采集URL" placeholder="可使用{productCode}占位符" />
        <ProFormTextArea name="collectRules" label="采集规则（JSON）" fieldProps={{ rows: 6 }} />
      </ModalForm>
    </>
  );
};

export default TaskTab;
