// admin/src/pages/PlatformConfigPage.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import PlatformForm from '../components/PlatformForm';
import { getPlatformType } from '../utils/platformTypes';

const PlatformConfigPage = () => {
  const { platforms, loading, error, createPlatform, updatePlatform, deletePlatform } = usePublishPlatforms();
  const [showForm, setShowForm] = React.useState(false);
  const [editingPlatform, setEditingPlatform] = React.useState<any>(null);

  const handleCreate = () => {
    setEditingPlatform(null);
    setShowForm(true);
  };

  const handleEdit = (platform: any) => {
    setEditingPlatform(platform);
    setShowForm(true);
  };

  const handleDelete = async (platformId: string) => {
    if (window.confirm('确定要删除此平台吗？')) {
      await deletePlatform(platformId);
    }
  };

  const handleSave = async (data: any) => {
    if (editingPlatform) {
      await updatePlatform(editingPlatform.documentId, data);
    } else {
      await createPlatform(data);
    }
    setShowForm(false);
    setEditingPlatform(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPlatform(null);
  };

  return (
    <Box padding={4}>
      <Flex justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="alpha">发布平台配置</Typography>
          <Typography variant="pi" color="neutral600">管理发布平台类型和参数</Typography>
        </Box>
        <Button onClick={handleCreate}>新建平台</Button>
      </Flex>

      {error && (
        <Box marginTop={4}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      {showForm ? (
        <Box marginTop={4}>
          <PlatformForm
            platform={editingPlatform}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </Box>
      ) : (
        <Flex marginTop={4} gap={4} direction="column">
          {loading ? (
            <Badge>加载中...</Badge>
          ) : platforms.length === 0 ? (
            <Badge variant="warning">暂无平台配置</Badge>
          ) : (
            platforms.map((platform) => {
              const platformType = getPlatformType(platform.type);
              return (
                <Box key={platform.documentId} padding={3} background="neutral100" hasRadius>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Flex gap={2} alignItems="center">
                      <Typography variant="pi" fontWeight="bold">{platform.name}</Typography>
                      <Badge>{platformType?.displayName || '自定义'}</Badge>
                      {!platform.isActive && <Badge variant="warning">已禁用</Badge>}
                    </Flex>

                    <Flex gap={2}>
                      <Button variant="secondary" onClick={() => handleEdit(platform)}>
                        编辑
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(platform.documentId)}>
                        删除
                      </Button>
                    </Flex>
                  </Flex>

                  {platform.description && (
                    <Box marginTop={2}>
                      <Typography variant="pi" color="neutral600">{platform.description}</Typography>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Flex>
      )}
    </Box>
  );
};

export default PlatformConfigPage;