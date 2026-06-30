// admin/src/components/StatsTable.tsx

import React from 'react';
import { Box, Typography, Flex, Badge } from '@strapi/design-system';

interface StatsTableProps {
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  title: string;
}

const StatsTable: React.FC<StatsTableProps> = ({ columns, data, title }) => {
  return (
    <Box padding={4} background="neutral100" hasRadius>
      <Typography variant="delta">{title}</Typography>

      <Box marginTop={3}>
        {/* 表头 */}
        <Flex gap={2} background="neutral200" padding={2} hasRadius>
          {columns.map((col) => (
            <Box key={col.key} flex={1}>
              <Typography variant="pi" fontWeight="bold">
                {col.label}
              </Typography>
            </Box>
          ))}
        </Flex>

        {/* 数据行 */}
        {data.length === 0 ? (
          <Flex padding={4} justifyContent="center">
            <Typography variant="pi" textColor="neutral600">
              暂无数据
            </Typography>
          </Flex>
        ) : (
          data.map((row, index) => (
            <Flex key={row.id || index} gap={2} padding={2} background={index % 2 === 0 ? 'neutral0' : 'neutral50'}>
              {columns.map((col) => (
                <Box key={col.key} flex={1}>
                  {col.key === 'change' ? (
                    <Badge variant={row[col.key] >= 0 ? 'success' : 'danger'}>{row[col.key] >= 0 ? '+' : ''}
                      {row[col.key]}%</Badge>
                  ) : (
                    <Typography variant="pi">{row[col.key]}</Typography>
                  )}
                </Box>
              ))}
            </Flex>
          ))
        )}
      </Box>
    </Box>
  );
};

export default StatsTable;