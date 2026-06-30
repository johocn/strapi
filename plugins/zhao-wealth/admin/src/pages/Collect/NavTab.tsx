import { ProTable, type ProColumns, ModalForm, ProFormDigit, ProFormDatePicker, ProFormSelect } from '@ant-design/pro-components';
import { Button, Select, DatePicker, Space, message, Popconfirm, Tag } from 'antd';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';

const { RangePicker } = DatePicker;

const NavTab = () => {
  const api = useApi();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any]>(undefined);
  const [navData, setNavData] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  // 加载产品列表
  useEffect(() => {
    api.getProducts({ pageSize: 500 }).then(res => setProducts(res.records || []));
  }, []);

  const fetchNav = async () => {
    if (!selectedProduct) { setNavData([]); return; }
    const params: any = { pageSize: 500 };
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    const res = await api.getNavData(selectedProduct, params);
    setNavData(res.records || []);
  };

  const chartOption = {
    xAxis: { type: 'category', data: navData.map(n => n.navDate).reverse() },
    yAxis: { type: 'value', scale: true },
    series: [
      { name: '单位净值', type: 'line', data: navData.map(n => n.unitNav).reverse(), smooth: true },
      { name: '累计净值', type: 'line', data: navData.map(n => n.accNav).reverse(), smooth: true },
    ],
    legend: { data: ['单位净值', '累计净值'] },
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
  };

  const columns: ProColumns<any>[] = [
    { title: '日期', dataIndex: 'navDate', width: 120 },
    { title: '单位净值', dataIndex: 'unitNav', width: 100, render: (_, r) => r.unitNav ?? '-' },
    { title: '累计净值', dataIndex: 'accNav', width: 100, render: (_, r) => r.accNav ?? '-' },
    { title: '来源', dataIndex: 'dataSource', width: 80, render: (_, r) => <Tag color={r.dataSource === 'crawler' ? 'blue' : 'default'}>{r.dataSource === 'crawler' ? '爬虫' : '手动'}</Tag> },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 240 }}
          placeholder="选择产品"
          value={selectedProduct}
          onChange={(v) => setSelectedProduct(v)}
          options={products.map(p => ({ value: p.id, label: p.productName }))}
          showSearch
          optionFilterProp="label"
        />
        <RangePicker onChange={(v) => setDateRange(v as any)} />
        <Button onClick={fetchNav} disabled={!selectedProduct}>查询</Button>
        <Button type="primary" onClick={() => setFormOpen(true)} disabled={!selectedProduct}>新增净值</Button>
        <Popconfirm title="重算年化与风险指标？" onConfirm={async () => {
          try { await api.triggerRecalculate({ productId: selectedProduct }); await api.recalculateRiskMetric({ productId: selectedProduct, type: 'risk-metric' }); message.success('重算任务已触发'); } catch (e: any) { message.error(e.message); }
        }} disabled={!selectedProduct}>
          <Button disabled={!selectedProduct}>重算</Button>
        </Popconfirm>
      </Space>

      {navData.length > 0 && (
        <div style={{ marginBottom: 16, height: 300 }}>
          <ReactECharts option={chartOption} style={{ height: 300 }} />
        </div>
      )}

      <ProTable<any>
        rowKey="id"
        columns={columns}
        search={false}
        dataSource={navData}
        pagination={{ pageSize: 20 }}
      />

      <ModalForm
        title="新增净值"
        open={formOpen}
        onOpenChange={setFormOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            await api.createNavData(selectedProduct!, {
              navDate: values.navDate ? values.navDate.format('YYYY-MM-DD') : null,
              unitNav: values.unitNav,
              accNav: values.accNav,
              dataSource: values.dataSource,
            });
            message.success('创建成功');
            fetchNav();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormDatePicker name="navDate" label="日期" rules={[{ required: true }]} />
        <ProFormDigit name="unitNav" label="单位净值" fieldProps={{ step: 0.0001 }} />
        <ProFormDigit name="accNav" label="累计净值" fieldProps={{ step: 0.0001 }} />
        <ProFormSelect name="dataSource" label="来源" options={[{ value: 'manual', label: '手动录入' }, { value: 'crawler', label: '爬虫采集' }]} initialValue="manual" />
      </ModalForm>
    </div>
  );
};

export default NavTab;
