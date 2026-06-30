// admin/src/components/StatsChart.tsx

import React from 'react';
import { Box, Typography, Flex, Badge } from '@strapi/design-system';
import { formatNumber } from '../utils/statsCalculator';

interface StatsChartProps {
  type: 'line' | 'bar' | 'pie';
  data: { label: string; value: number }[];
  title: string;
}

const StatsChart: React.FC<StatsChartProps> = ({ type, data, title }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Box padding={4} background="neutral100" hasRadius>
      <Typography variant="delta">{title}</Typography>

      {type === 'bar' && (
        <Flex marginTop={3} gap={2} direction="column">
          {data.map((item) => (
            <Box key={item.label} width="100%">
              <Flex justifyContent="space-between" marginBottom={1}>
                <Typography variant="pi">{item.label}</Typography>
                <Badge>{formatNumber(item.value)}</Badge>
              </Flex>
              <Box background="neutral200" height="8px" hasRadius>
                <Box
                  background="primary500"
                  height="100%"
                  hasRadius
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </Box>
            </Box>
          ))}
        </Flex>
      )}

      {type === 'pie' && (
        <Flex marginTop={3} gap={3} direction="column">
          {data.map((item) => {
            const percent = ((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
            return (
              <Flex key={item.label} justifyContent="space-between" alignItems="center">
                <Typography variant="pi">{item.label}</Typography>
                <Flex gap={2}>
                  <Typography variant="pi" textColor="neutral600">
                    {percent}%
                  </Typography>
                  <Badge>{formatNumber(item.value)}</Badge>
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      )}

      {type === 'line' && (
        <Flex marginTop={3} gap={2} direction="column">
          {data.map((item) => (
            <Flex key={item.label} justifyContent="space-between">
              <Typography variant="pi">{item.label}</Typography>
              <Badge>{formatNumber(item.value)}</Badge>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
};

export default StatsChart;