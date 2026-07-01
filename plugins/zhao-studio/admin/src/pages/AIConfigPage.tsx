import React from 'react';
import { Card, Typography, Space, message, Spin } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';
import AIConfigForm from '../components/AIConfigForm';

const { Title, Text } = Typography;

const AIConfigPage = () => {
  const { config, loading, updateConfig, testConfig } = useAIConfig();

  if (loading && !config) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin /></div>;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>AI 配置</Title>
        <Text type="secondary">配置 AI 服务商参数</Text>
      </div>
      <Card title="配置详情">
        <AIConfigForm
          config={config}
          onSave={async (data) => {
            try {
              await updateConfig(data);
              message.success('保存成功');
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => message.info('已取消')}
        />
      </Card>
    </Space>
  );
};

export default AIConfigPage;
