// admin/src/components/PublishPanel.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishActions } from '../hooks/usePublishActions';
import { getPlatformType } from '../utils/platformTypes';

interface PublishPanelProps {
  articleId: string;
  article: any;
  onPublishComplete?: () => void;
}

const PublishPanel: React.FC<PublishPanelProps> = ({ articleId, article, onPublishComplete }) => {
  const { accounts, loading: accountsLoading } = usePublishAccounts();
  const { loading: publishLoading, error, publishArticle } = usePublishActions();

  const [selectedAccounts, setSelectedAccounts] = React.useState<string[]>([]);
  const [publishResults, setPublishResults] = React.useState<any[]>([]);
  const [showResults, setShowResults] = React.useState(false);

  const handleAccountSelect = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
    } else {
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

  const handlePublish = async () => {
    if (selectedAccounts.length === 0) {
      return;
    }

    try {
      const results = await publishArticle(articleId, selectedAccounts);
      setPublishResults(results);
      setShowResults(true);

      if (onPublishComplete) {
        onPublishComplete();
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  const successCount = publishResults.filter((r) => r.success).length;
  const failedCount = publishResults.filter((r) => !r.success).length;

  return (
    <Box padding={4}>
      <Typography variant="delta">发布到平台</Typography>

      {error && (
        <Box marginTop={2}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      <Box marginTop={4}>
        <Typography variant="pi">选择发布账号（可多选）</Typography>
        <Flex marginTop={2} gap={2} direction="column">
          {accountsLoading ? (
            <Badge>加载中...</Badge>
          ) : accounts.length === 0 ? (
            <Badge variant="warning">暂无可用账号</Badge>
          ) : (
            accounts.map((account) => {
              const platformType = getPlatformType(account.platform?.type || 'custom');
              return (
                <Flex key={account.documentId} gap={2} alignItems="center">
                  <Button
                    variant={selectedAccounts.includes(account.documentId) ? 'default' : 'secondary'}
                    onClick={() => handleAccountSelect(account.documentId)}
                  >
                    {account.name}
                  </Button>
                  <Badge>{platformType?.displayName || '自定义'}</Badge>
                  {!account.isActive && <Badge variant="warning">已禁用</Badge>}
                </Flex>
              );
            })
          )}
        </Flex>
      </Box>

      <Flex marginTop={4} justifyContent="flex-end" gap={2}>
        <Typography variant="pi">
          已选择 {selectedAccounts.length} 个账号
        </Typography>
        <Button
          onClick={handlePublish}
          disabled={selectedAccounts.length === 0 || publishLoading}
          loading={publishLoading}
        >
          发布文章
        </Button>
      </Flex>

      {showResults && (
        <Box marginTop={4}>
          <Typography variant="delta">发布结果</Typography>
          <Flex marginTop={2} gap={2}>
            <Badge variant="success">成功: {successCount}</Badge>
            {failedCount > 0 && <Badge variant="danger">失败: {failedCount}</Badge>}
          </Flex>

          <Flex marginTop={2} gap={2} direction="column">
            {publishResults.map((result, index) => (
              <Flex key={index} gap={2} alignItems="center">
                <Badge>{result.accountName}</Badge>
                <Badge variant={result.success ? 'success' : 'danger'}>
                  {result.success ? '成功' : '失败'}
                </Badge>
                {result.error && <Typography variant="pi">{result.error}</Typography>}
              </Flex>
            ))}
          </Flex>

          <Button variant="secondary" onClick={() => setShowResults(false)}>
            关闭
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PublishPanel;