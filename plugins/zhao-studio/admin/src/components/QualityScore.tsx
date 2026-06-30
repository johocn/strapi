// admin/src/components/QualityScore.tsx

import React from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { getQualityLabel } from '../utils/qualityCalculator';

interface QualityScoreProps {
  score: any;
}

const QualityScore: React.FC<QualityScoreProps> = ({ score }) => {
  return (
    <Box padding={2}>
      <Flex direction="column" gap={2}>
        <Typography variant="delta">
          质量评分: {score.total}分 ({getQualityLabel(score.total)})
        </Typography>

        <Box marginTop={2}>
          <Typography variant="pi">详细评分:</Typography>
          <Flex direction="column" gap={1} marginTop={1}>
            <Typography variant="pi">文字长度: {score.details.length}分</Typography>
            <Typography variant="pi">图片数量: {score.details.images}分</Typography>
            <Typography variant="pi">作者信息: {score.details.author}分</Typography>
            <Typography variant="pi">日期信息: {score.details.date}分</Typography>
            <Typography variant="pi">标题质量: {score.details.title}分</Typography>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default QualityScore;