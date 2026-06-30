// admin/src/components/ContentPreview.tsx

import React from 'react';
import { Box, Typography, Card, CardBody, Badge, Button, Flex } from '@strapi/design-system';
import { getQualityLabel, isQualityAcceptable } from '../utils/qualityCalculator';

interface ContentPreviewProps {
  contents: any[];
  onConfirm: (confirmed: any[]) => void;
  onCancel: () => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({
  contents,
  onConfirm,
  onCancel,
}) => {
  const [confirmedContents, setConfirmedContents] = React.useState<any[]>([]);

  const handleToggle = (content: any) => {
    const isConfirmed = confirmedContents.find((c) => c.sourceUrl === content.sourceUrl);
    if (isConfirmed) {
      setConfirmedContents(confirmedContents.filter((c) => c.sourceUrl !== content.sourceUrl));
    } else {
      setConfirmedContents([...confirmedContents, content]);
    }
  };

  const handleConfirmAll = () => {
    const acceptable = contents.filter((c) => isQualityAcceptable(c.qualityScore.total));
    setConfirmedContents(acceptable);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">内容预览与质量评估</Typography>

      <Flex marginTop={2} gap={2}>
        <Button variant="secondary" onClick={handleConfirmAll}>
          确认所有合格内容
        </Button>
        <Button onClick={() => onConfirm(confirmedContents)} disabled={confirmedContents.length === 0}>
          入库 ({confirmedContents.length})
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </Flex>

      <Flex direction="column" gap={4} marginTop={4}>
        {contents.map((content, index) => (
          <Card key={index}>
            <CardBody>
              <Flex justifyContent="space-between">
                <Typography fontWeight="bold">{content.title || '无标题'}</Typography>
                <Badge variant={content.qualityScore.total >= 70 ? 'success' : content.qualityScore.total >= 50 ? 'warning' : 'danger'}>
                  {getQualityLabel(content.qualityScore.total)} ({content.qualityScore.total}分)
                </Badge>
              </Flex>

              <Box marginTop={2}>
                <Typography variant="pi">
                  {content.content?.substring(0, 200)}...
                </Typography>
              </Box>

              <Box marginTop={2}>
                <Typography variant="pi">作者: {content.sourceAuthor || '未知'}</Typography>
                <Typography variant="pi">日期: {content.sourcePublishedAt || '未知'}</Typography>
                <Typography variant="pi">图片: {content.images?.length || 0}张</Typography>
              </Box>

              <Flex marginTop={2} gap={2}>
                <Button
                  variant="secondary"
                  onClick={() => handleToggle(content)}
                  disabled={!isQualityAcceptable(content.qualityScore.total)}
                >
                  {confirmedContents.find((c) => c.sourceUrl === content.sourceUrl) ? '取消入库' : '确认入库'}
                </Button>
                {content.error && (
                  <Badge variant="danger">错误: {content.error}</Badge>
                )}
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Flex>
    </Box>
  );
};

export default ContentPreview;