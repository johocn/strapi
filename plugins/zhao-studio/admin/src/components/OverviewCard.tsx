import React from 'react';
import { Card, Typography, Tag } from 'antd';
import { formatNumber, formatPercent } from '../utils/statsCalculator';

const { Text, Title } = Typography;

interface OverviewCardProps {
  title: string;
  value: number;
  change: number;
  unit?: string;
  type?: 'number' | 'percent' | 'duration';
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, change, unit = '', type = 'number' }) => {
  const formatValue = () => {
    if (type === 'percent') {
      return formatPercent(value);
    }
    if (type === 'duration') {
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    }
    return formatNumber(value) + (unit ? ` ${unit}` : '');
  };

  const getChangeTag = () => {
    if (change === 0) {
      return <Tag>持平</Tag>;
    }
    if (change > 0) {
      return <Tag color="success">↑ {change}%</Tag>;
    }
    return <Tag color="error">↓ {Math.abs(change)}%</Tag>;
  };

  return (
    <Card>
      <Text type="secondary">{title}</Text>
      <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
        {formatValue()}
      </Title>
      {getChangeTag()}
    </Card>
  );
};

export default OverviewCard;
