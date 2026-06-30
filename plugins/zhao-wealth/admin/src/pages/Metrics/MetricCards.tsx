import { Card, Col, Row, Statistic, Tag } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { rateVolatility, rateMaxDrawdown, rateSharpe, rateRankPercentile, formatPercent } from '../../constants/metricRating';
import { METRIC_NAMES } from '../../constants/enums';

const MetricCards = ({ productId, period }: { productId: number; period: string }) => {
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId || !period) return;
    setLoading(true);
    api.getMetricAggregate(productId, period).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [productId, period]);

  if (loading) return <div>加载中...</div>;

  const cards = [
    { name: 'volatility', label: METRIC_NAMES.volatility, value: data?.volatility, rating: rateVolatility(data?.volatility), format: (v: number) => formatPercent(v, 4) },
    { name: 'maxDrawdown', label: METRIC_NAMES.maxDrawdown, value: data?.maxDrawdown, rating: rateMaxDrawdown(data?.maxDrawdown), format: (v: number) => formatPercent(v, 4) },
    { name: 'sharpe', label: METRIC_NAMES.sharpe, value: data?.sharpe, rating: rateSharpe(data?.sharpe), format: (v: number) => v?.toFixed(4) },
    { name: 'rankPercentile', label: METRIC_NAMES.rankPercentile, value: data?.rankPercentile, rating: rateRankPercentile(data?.rankPercentile), format: (v: number) => formatPercent(v, 2) },
  ];

  return (
    <Row gutter={16}>
      {cards.map(c => (
        <Col span={6} key={c.name}>
          <Card>
            <Statistic
              title={c.label}
              value={c.value === null ? '无数据' : c.format(c.value)}
              suffix={<Tag color={c.rating.color}>{c.rating.label}</Tag>}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default MetricCards;
