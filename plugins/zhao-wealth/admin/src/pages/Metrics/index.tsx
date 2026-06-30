import { useState, useEffect } from 'react';
import { Select, Button, Space, Row, Col, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { METRIC_PERIODS } from '../../constants/enums';
import MetricCards from './MetricCards';
import NavChart from './NavChart';
import PeerRank from './PeerRank';
import TrendChart from './TrendChart';

const Metrics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useApi();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<number | undefined>(Number(searchParams.get('productId')) || undefined);
  const [period, setPeriod] = useState('m1');

  useEffect(() => {
    api.getProducts({ pageSize: 500 }).then(res => setProducts(res.records || []));
  }, []);

  const handleRecalculate = async () => {
    if (!productId) return;
    try {
      await api.recalculateRiskMetric({ productId, type: 'risk-metric' });
      message.success('重算任务已触发');
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span>产品：</span>
        <Select
          style={{ width: 280 }}
          placeholder="选择产品"
          value={productId}
          onChange={(v) => { setProductId(v); setSearchParams({ productId: String(v) }); }}
          options={products.map(p => ({ value: p.id, label: p.productName }))}
          showSearch
          optionFilterProp="label"
        />
        <span>周期：</span>
        <Select
          style={{ width: 120 }}
          value={period}
          onChange={setPeriod}
          options={Object.entries(METRIC_PERIODS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Button onClick={handleRecalculate} disabled={!productId}>手动重算</Button>
      </Space>

      {productId ? (
        <>
          <MetricCards productId={productId} period={period} />
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={14}><NavChart productId={productId} /></Col>
            <Col span={10}><PeerRank period={period} currentProductId={productId} /></Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <TrendChart productId={productId} />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>请选择产品查看指标</div>
      )}
    </div>
  );
};

export default Metrics;
