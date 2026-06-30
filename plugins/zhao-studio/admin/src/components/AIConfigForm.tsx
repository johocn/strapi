// admin/src/components/AIConfigForm.tsx

import React from 'react';
import { Box, Typography, TextInput, Button, Flex, Badge } from '@strapi/design-system';
import { getAllProviders, AIProvider } from '../utils/aiProviders';

interface AIConfigFormProps {
  config: any;
  onSave: (data: any) => void;
  onTest: (provider: string, apiKey: string, endpoint?: string) => void;
}

const AIConfigForm: React.FC<AIConfigFormProps> = ({ config, onSave, onTest }) => {
  const [formData, setFormData] = React.useState({
    enabled: config.enabled || false,
    provider: config.provider || 'qwen',
    apiKey: config.apiKey || '',
    endpoint: config.endpoint || '',
    model: config.model || '',
    maxTokens: config.maxTokens || 2000,
    temperature: config.temperature || 0.7,
  });

  const providers = getAllProviders();
  const selectedProvider = providers.find((p) => p.name === formData.provider);

  const handleTest = () => {
    onTest(formData.provider, formData.apiKey, formData.endpoint);
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">AI配置</Typography>

      <Flex marginTop={4} gap={4} direction="column">
        <Box>
          <Typography variant="pi">启用AI功能</Typography>
          <Flex gap={2} marginTop={1}>
            <Button variant={formData.enabled ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, enabled: true })}>
              启用
            </Button>
            <Button variant={!formData.enabled ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, enabled: false })}>
              禁用
            </Button>
          </Flex>
        </Box>

        {formData.enabled && (
          <>
            <Box>
              <Typography variant="pi">AI提供商</Typography>
              <Flex gap={2} marginTop={1}>
                {providers.map((p) => (
                  <Button key={p.name} variant={formData.provider === p.name ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, provider: p.name })}>
                    {p.displayName}
                  </Button>
                ))}
              </Flex>
            </Box>

            <Box>
              <Typography variant="pi">API密钥</Typography>
              <TextInput
                value={formData.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </Box>

            {formData.provider === 'custom' && (
              <Box>
                <Typography variant="pi">自定义接口URL</Typography>
                <TextInput
                  value={formData.endpoint}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endpoint: e.target.value })}
                />
              </Box>
            )}

            {selectedProvider && selectedProvider.models.length > 0 && (
              <Box>
                <Typography variant="pi">模型</Typography>
                <Flex gap={2} marginTop={1}>
                  {selectedProvider.models.map((m) => (
                    <Button key={m} variant={(formData.model || selectedProvider.defaultModel) === m ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, model: m })}>
                      {m}
                    </Button>
                  ))}
                </Flex>
              </Box>
            )}

            <Box>
              <Typography variant="pi">最大Token数</Typography>
              <TextInput
                type="number"
                value={formData.maxTokens.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })}
              />
            </Box>

            <Box>
              <Typography variant="pi">温度参数 (0-1)</Typography>
              <TextInput
                type="number"
                value={formData.temperature.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
              />
            </Box>
          </>
        )}
      </Flex>

      <Flex marginTop={4} justifyContent="flex-end" gap={2}>
        {formData.enabled && (
          <Button variant="secondary" onClick={handleTest}>
            测试连接
          </Button>
        )}
        <Button onClick={handleSave}>
          保存配置
        </Button>
      </Flex>
    </Box>
  );
};

export default AIConfigForm;