// admin/src/pages/ChannelReportPage.tsx
// 渠道报表（含 A/B 文案变体对比）—— 判优核心指标：CTR = 点击(打开) / 曝光
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, Table, Select, Tabs, Tag, Alert, Spin } from 'antd';
import { PermissionGate } from '../components/PermissionGate';
import { promoApi, ChannelReportData, VariantReportRow } from '../utils/promoApi';

const { Title, Text } = Typography;

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const defaultRange = (): [string, string] => {
  const end = new Date();
  const start = new Date(Date.now() - 6 * 86400000);
  return [`${fmt(start)}T00:00:00.000Z`, `${fmt(end)}T23:59:59.999Z`];
};

const ChannelReportPage = () => {
  const [channels, setChannels] = useState<Array<{ code: string; name: string }>>([]);
  const [channelCode, setChannelCode] = useState<string>('xxl-wechat');
  const [range, setRange] = useState<[string, string]>(defaultRange);
  const [groupBy, setGroupBy] = useState<'variant' | 'day' | 'campaign'>('variant');
  const [data, setData] = useState<ChannelReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    promoApi.listChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  const load = useCallback(async () => {
    if (!channelCode) return;
    setLoading(true);
    setError(null);
    try {
      setData(await promoApi.getChannelReport({ channelCode, startDate: range[0], endDate: range[1], groupBy }));
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [channelCode, range, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  const variantRows = data?.byVariant || [];
  // CTR 最高的行标记「领先」
  const leadId = useMemo(() => {
    let best: string | null = null;
    for (const r of variantRows) {
      if (r.impressions > 0 && (!best || r.ctr > (variantRows.find((x) => x.variantId === best)?.ctr ?? -1))) {
        best = r.variantId;
      }
    }
    return best;
  }, [variantRows]);
  const maxCtr = Math.max(1, ...variantRows.map((r) => r.ctr));

  const variantColumns = [
    {
      title: '文案变体',
      dataIndex: 'variantName',
      render: (_: any, r: VariantReportRow) => (
        <Space size={6}>
          <span style={{ fontWeight: 600 }}>{r.variantName}</span>
          {r.variantId === leadId && <Tag color="green">领先</Tag>}
        </Space>
      ),
    },
    { title: '活动', dataIndex: 'campaignName', render: (v: string) => <Text type="secondary">{v}</Text> },
    { title: '曝光', dataIndex: 'impressions', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '点击(打开)', dataIndex: 'clicks', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      align: 'right' as const,
      render: (v: number, r: VariantReportRow) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.variantId === leadId ? '#0f7b5f' : undefined }}>
          {r.impressions > 0 ? `${v.toFixed(2)}%` : '—'}
        </span>
      ),
    },
    {
      title: 'CTR 相对',
      key: 'bar',
      width: 160,
      render: (_: any, r: VariantReportRow) => (
        <div style={{ background: 'rgba(128,128,128,.12)', height: 6, borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.round((r.ctr / maxCtr) * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: r.variantId === leadId ? '#0f7b5f' : '#2f6fb2',
            }}
          />
        </div>
      ),
    },
    { title: '订单', dataIndex: 'orders', align: 'right' as const },
    { title: '有效佣金', dataIndex: 'matchedCommission', align: 'right' as const, render: (v: number) => Number(v || 0).toFixed(2) },
  ];

  const campaignColumns = [
    { title: '活动', dataIndex: 'campaign', key: 'campaign' },
    { title: 'Code', dataIndex: 'code', key: 'code', render: (v: string) => <Text code>{v}</Text> },
  ];

  return (
    <PermissionGate action="zhao-studio.channel-report.view">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>渠道报表</Title>
          <Text type="secondary">推广渠道效果与 A/B 文案变体对比（判优指标：CTR = 点击(打开) / 曝光）</Text>
        </div>

        <Card size="small">
          <Space wrap>
            <Text>渠道：</Text>
            <Select
              style={{ minWidth: 220 }}
              value={channelCode}
              onChange={setChannelCode}
              options={channels.map((c) => ({ value: c.code, label: `${c.name}（${c.code}）` }))}
              showSearch
              optionFilterProp="label"
            />
            <Text>日期：</Text>
            <input
              type="date"
              value={range[0].slice(0, 10)}
              onChange={(e) => setRange([`${e.target.value}T00:00:00.000Z`, range[1]])}
              style={{ padding: 4, border: '1px solid #d9d9d9', borderRadius: 6 }}
            />
            <span>~</span>
            <input
              type="date"
              value={range[1].slice(0, 10)}
              onChange={(e) => setRange([range[0], `${e.target.value}T23:59:59.999Z`])}
              style={{ padding: 4, border: '1px solid #d9d9d9', borderRadius: 6 }}
            />
          </Space>
        </Card>

        {error && <Alert type="error" showIcon message={error} />}

        <Card size="small">
          <Tabs
            activeKey={groupBy}
            onChange={(k) => setGroupBy(k as any)}
            items={[
              { key: 'variant', label: '变体对比', children: null },
              { key: 'day', label: '按日', children: null },
              { key: 'campaign', label: '按活动', children: null },
            ]}
          />
          <Spin spinning={loading}>
            {groupBy === 'variant' && (
              <Table
                rowKey="variantId"
                size="middle"
                columns={variantColumns as any}
                dataSource={variantRows}
                pagination={false}
                rowClassName={(r) => (r.variantId === leadId ? 'ant-table-row-selected' : '')}
                locale={{ emptyText: '所选渠道与日期范围内暂无变体数据' }}
              />
            )}
            {groupBy !== 'variant' && (
              <>
                {data?.funnel && (
                  <Space wrap size="large" style={{ marginBottom: 16 }}>
                    {['impressions', 'adClicks', 'couponClicks', 'orders', 'paidOrders'].map((k) => (
                      <div key={k}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {k}
                        </Text>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>
                          {(data.funnel as any)[k] ?? 0}
                        </div>
                      </div>
                    ))}
                    {data.revenue && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ROI
                        </Text>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>
                          {Number(data.roi || 0).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </Space>
                )}
                <Table
                  rowKey="code"
                  size="middle"
                  columns={campaignColumns as any}
                  dataSource={data?.byCampaign || []}
                  pagination={false}
                  locale={{ emptyText: '暂无活动数据' }}
                />
              </>
            )}
          </Spin>
        </Card>
      </Space>
    </PermissionGate>
  );
};

export default ChannelReportPage;
