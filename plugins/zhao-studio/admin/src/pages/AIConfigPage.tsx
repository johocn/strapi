// admin/src/pages/AIConfigPage.tsx

import React from 'react';
import { Box, Typography, Badge } from '@strapi/design-system';
import { useAIConfig } from '../hooks/useAIConfig';
import AIConfigForm from '../components/AIConfigForm';

const AIConfigPage = () => {
  const {
    config,
    loading,
    error,
    updateConfig,
    testConnection,
  } = useAIConfig();

  const handleSave = async (data: any) => {
    await updateConfig(data);
  };

  const handleTest = async (provider: string, apiKey: string, endpoint?: string) => {
    const result = await testConnection(provider, apiKey, endpoint);
    if (result.success) {
      alert('连接成功！');
    } else {
      alert(`连接失败：${result.message}`);
    }
  };

  return (
    <Box padding={4}>
      <Typography variant="alpha">AI配置</Typography>
      <Typography variant="pi" color="neutral600">配置AI服务提供商</Typography>

      {error && (
        <Box marginTop={4}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      <Box marginTop={4}>
        <AIConfigForm
          config={config}
          onSave={handleSave}
          onTest={handleTest}
        />
      </Box>
    </Box>
  );
};

export default AIConfigPage;