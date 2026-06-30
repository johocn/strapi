// admin/src/components/PublishRecordList.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { usePublishRecords } from '../hooks/usePublishRecords';
import { usePublishActions } from '../hooks/usePublishActions';

interface PublishRecordListProps {
  articleId?: string;
}

const PublishRecordList: React.FC<PublishRecordListProps> = ({ articleId }) => {
  const { records, loading, error } = usePublishRecords(articleId);
  const { retryPublish, loading: retryLoading } = usePublishActions();

  const handleRetry = async (recordId: string) => {
    try {
      await retryPublish(recordId);
    } catch (err) {
      // Error handled by hook
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">成功</Badge>;
      case 'failed':
        return <Badge variant="danger">失败</Badge>;
      case 'pending':
        return <Badge variant="warning">待处理</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">发布记录</Typography>

      {error && (
        <Box marginTop={2}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      <Flex marginTop={4} gap={4} direction="column">
        {loading ? (
          <Badge>加载中...</Badge>
        ) : records.length === 0 ? (
          <Badge variant="warning">暂无发布记录</Badge>
        ) : (
          records.map((record) => (
            <Box key={record.documentId} padding={3} background="neutral100" hasRadius>
              <Flex justifyContent="space-between" alignItems="center">
                <Flex gap={2} alignItems="center">
                  <Typography variant="pi">
                    {record.account?.name || '未知账号'}
                  </Typography>
                  {getStatusBadge(record.status)}
                  {record.externalId && (
                    <Typography variant="pi">ID: {record.externalId}</Typography>
                  )}
                </Flex>

                <Flex gap={2} alignItems="center">
                  {record.publishedAt && (
                    <Typography variant="pi">
                      {new Date(record.publishedAt).toLocaleString()}
                    </Typography>
                  )}
                  {record.status === 'failed' && (
                    <Button
                      variant="secondary"
                      onClick={() => handleRetry(record.documentId)}
                      loading={retryLoading}
                    >
                      重试
                    </Button>
                  )}
                </Flex>
              </Flex>

              {record.error && (
                <Box marginTop={2}>
                  <Typography variant="pi" textColor="danger500">
                    {record.error}
                  </Typography>
                </Box>
              )}

              {record.retryCount > 0 && (
                <Box marginTop={2}>
                  <Typography variant="pi">
                    重试次数: {record.retryCount}
                  </Typography>
                </Box>
              )}
            </Box>
          ))
        )}
      </Flex>
    </Box>
  );
};

export default PublishRecordList;