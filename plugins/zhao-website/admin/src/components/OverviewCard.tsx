import React from 'react';
import { Card, Typography } from 'antd';

const { Text, Title } = Typography;

interface OverviewCardProps {
  title: string;
  value: number | string;
  suffix?: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, suffix }) => (
  <Card>
    <Text type="secondary">{title}</Text>
    <Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>
      {value}{suffix && <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>{suffix}</Text>}
    </Title>
  </Card>
);

export default OverviewCard;
