import React from 'react';
import { Box, Typography } from '@strapi/design-system';

const HomePage = () => {
  return (
    <Box padding={8}>
      <Typography variant="alpha">内容工作室</Typography>
      <Box paddingTop={4}>
        <Typography>定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计</Typography>
      </Box>
    </Box>
  );
};

export default HomePage;