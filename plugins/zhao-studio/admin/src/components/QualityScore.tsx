// admin/src/components/QualityScore.tsx

import React from 'react';
import { Space, Typography } from 'antd';
import { getQualityLabel } from '../utils/qualityCalculator';

const { Text } = Typography;

interface QualityScoreProps {
  score: any;
}

const QualityScore: React.FC<QualityScoreProps> = ({ score }) => {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%', padding: 8 }}>
      <Text strong>
        质量评分: {score.total}分 ({getQualityLabel(score.total)})
      </Text>

      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Text type="secondary">详细评分:</Text>
        <Space direction="vertical" size={0}>
          <Text>文字长度: {score.details.length}分</Text>
          <Text>图片数量: {score.details.images}分</Text>
          <Text>作者信息: {score.details.author}分</Text>
          <Text>日期信息: {score.details.date}分</Text>
          <Text>标题质量: {score.details.title}分</Text>
        </Space>
      </Space>
    </Space>
  );
};

export default QualityScore;