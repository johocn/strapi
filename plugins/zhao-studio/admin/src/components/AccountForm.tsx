// admin/src/components/AccountForm.tsx

import React from 'react';
import { Box, Typography, TextInput, Button, Flex, Badge } from '@strapi/design-system';
import { getAllPlatformTypes, getPlatformType } from '../utils/platformTypes';

interface AccountFormProps {
  account?: any;
  platforms: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, platforms, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    name: account?.name || '',
    platform: account?.platform?.documentId || account?.platform || '',
    config: account?.config || {},
    isActive: account?.isActive ?? true,
  });

  const platformTypes = getAllPlatformTypes();

  const handleConfigChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      config: { ...formData.config, [key]: value },
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  const selectedPlatform = platforms.find((p) => p.documentId === formData.platform);
  const platformType = getPlatformType(selectedPlatform?.type || 'custom');

  return (
    <Box padding={4}>
      <Typography variant="delta">{account ? '编辑账号' : '新建账号'}</Typography>

      <Flex marginTop={4} gap={4} direction="column">
        <Box>
          <Typography variant="pi">账号名称</Typography>
          <TextInput
            name="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入账号名称"
          />
        </Box>

        <Box>
          <Typography variant="pi">所属平台</Typography>
          <Flex gap={2} marginTop={2}>
            {platforms.map((p) => (
              <Button
                key={p.documentId}
                variant={formData.platform === p.documentId ? 'default' : 'secondary'}
                onClick={() => setFormData({ ...formData, platform: p.documentId })}
              >
                {p.name}
              </Button>
            ))}
          </Flex>
        </Box>

        {selectedPlatform && (
          <Box>
            <Typography variant="pi">API配置</Typography>
            <Flex marginTop={2} gap={4} direction="column">
              {selectedPlatform.type !== 'internal' && (
                <>
                  <Box>
                    <Typography variant="pi">API密钥</Typography>
                    <TextInput
                      name="apiKey"
                      value={formData.config?.apiKey || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('apiKey', e.target.value)}
                      placeholder="请输入API密钥"
                    />
                  </Box>

                  <Box>
                    <Typography variant="pi">API端点</Typography>
                    <TextInput
                      name="endpoint"
                      value={formData.config?.endpoint || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('endpoint', e.target.value)}
                      placeholder="请输入API端点URL"
                    />
                  </Box>
                </>
              )}

              {selectedPlatform.type === 'wechat' && (
                <Box>
                  <Typography variant="pi">Media ID</Typography>
                  <TextInput
                    name="mediaId"
                    value={formData.config?.mediaId || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('mediaId', e.target.value)}
                    placeholder="请输入素材ID"
                  />
                </Box>
              )}

              {selectedPlatform.type === 'internal' && (
                <Box>
                  <Typography variant="pi">渠道编码</Typography>
                  <TextInput
                    name="channelCode"
                    value={formData.config?.channelCode || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('channelCode', e.target.value)}
                    placeholder="请输入渠道编码（如：web、app、h5）"
                  />
                </Box>
              )}
            </Flex>
          </Box>
        )}

        <Box>
          <Typography variant="pi">状态</Typography>
          <Flex gap={2} marginTop={2}>
            <Button
              variant={formData.isActive ? 'default' : 'secondary'}
              onClick={() => setFormData({ ...formData, isActive: true })}
            >
              启用
            </Button>
            <Button
              variant={!formData.isActive ? 'default' : 'secondary'}
              onClick={() => setFormData({ ...formData, isActive: false })}
            >
              禁用
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Flex marginTop={4} justifyContent="flex-end" gap={2}>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave}>
          保存
        </Button>
      </Flex>
    </Box>
  );
};

export default AccountForm;