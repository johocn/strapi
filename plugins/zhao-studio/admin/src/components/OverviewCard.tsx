// admin/src/components/OverviewCard.tsx

import React from 'react';
import { Box, Typography, Flex, Badge } from '@strapi/design-system';
import { formatNumber, formatPercent } from '../utils/statsCalculator';

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

  const getChangeBadge = () => {
    if (change === 0) {
      return (
        <Badge variant="neutral" size="S">
          持平
        </Badge>
      );
    }
    if (change > 0) {
      return (
        <Badge variant="success" size="S">
          ↑ {change}%
        </Badge>
      );
    }
    return (
      <Badge variant="danger" size="S">
        ↓ {Math.abs(change)}%
      </Badge>
    );
  };

  return (
    <Box padding={4} background="neutral100" hasRadius>
      <Typography variant="pi" textColor="neutral600">
        {title}
      </Typography>
      <Flex marginTop={2} gap={2} alignItems="baseline">
        <Typography variant="delta" fontWeight="bold">
          {formatValue()}
        </Typography>
      </Flex>
      <Flex marginTop={2}>{getChangeBadge()}</Flex>
    </Box>
  );
};

export default OverviewCard;