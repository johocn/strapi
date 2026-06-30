// admin/src/pages/PublishPage.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge, TextInput } from '@strapi/design-system';
import PublishPanel from '../components/PublishPanel';
import PublishRecordList from '../components/PublishRecordList';

const PublishPage = () => {
  const [selectedArticleId, setSelectedArticleId] = React.useState<string>('');
  const [selectedArticle, setSelectedArticle] = React.useState<any>(null);
  const [showPublishPanel, setShowPublishPanel] = React.useState(false);

  const handleArticleSelect = () => {
    // 简化实现：用户输入文章ID
    // 实际应该从草稿列表中选择
    if (selectedArticleId) {
      setSelectedArticle({ documentId: selectedArticleId, title: '示例文章' });
      setShowPublishPanel(true);
    }
  };

  const handlePublishComplete = () => {
    setShowPublishPanel(false);
  };

  return (
    <Box padding={4}>
      <Box>
        <Typography variant="alpha">发布管理</Typography>
        <Typography variant="pi" color="neutral600">将文章发布到多个平台</Typography>
      </Box>

      <Box marginTop={4}>
        <Typography variant="pi" fontWeight="bold">文章ID</Typography>
        <Flex gap={2} marginTop={2} alignItems="flex-end">
          <Box flex={1}>
            <TextInput
              name="articleId"
              value={selectedArticleId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedArticleId(e.target.value)}
              placeholder="请输入文章ID"
            />
          </Box>
          <Button onClick={handleArticleSelect} disabled={!selectedArticleId}>
            选择文章
          </Button>
        </Flex>
      </Box>

      {showPublishPanel && selectedArticle && (
        <Box marginTop={4}>
          <PublishPanel
            articleId={selectedArticle.documentId}
            article={selectedArticle}
            onPublishComplete={handlePublishComplete}
          />
        </Box>
      )}

      <Box marginTop={4}>
        <Typography variant="delta" fontWeight="bold">发布记录</Typography>
        <PublishRecordList articleId={selectedArticleId} />
      </Box>
    </Box>
  );
};

export default PublishPage;