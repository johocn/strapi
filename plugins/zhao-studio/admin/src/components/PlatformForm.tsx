// admin/src/components/PlatformForm.tsx

import React from 'react';
import { Box, Typography, TextInput, Button, Flex, Badge } from '@strapi/design-system';
import { getAllPlatformTypes } from '../utils/platformTypes';

interface PlatformFormProps {
  platform?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const PlatformForm: React.FC<PlatformFormProps> = ({ platform, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    name: platform?.name || '',
    type: platform?.type || 'toutiao',
    description: platform?.description || '',
    isActive: platform?.isActive ?? true,
  });

  const platformTypes = getAllPlatformTypes();
  const selectedType = platformTypes.find((t) => t.type === formData.type);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">{platform ? '编辑平台' : '新建平台'}</Typography>

      <Flex marginTop={4} gap={4} direction="column">
        <Box>
          <Typography variant="pi">平台名称</Typography>
          <TextInput
            name="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入平台名称"
          />
        </Box>

        <Box>
          <Typography variant="pi">平台类型</Typography>
          <Flex gap={2} marginTop={2}>
            {platformTypes.map((pt) => (
              <Button
                key={pt.type}
                variant={formData.type === pt.type ? 'default' : 'secondary'}
                onClick={() => setFormData({ ...formData, type: pt.type })}
              >
                {pt.displayName}
              </Button>
            ))}
          </Flex>
        </Box>

        {selectedType && (
          <Box>
            <Typography variant="pi">平台限制</Typography>
            <Flex gap={2} marginTop={2}>
              <Badge>标题: {selectedType.maxTitleLength}字</Badge>
              <Badge>内容: {selectedType.maxContentLength}字</Badge>
              {selectedType.supportsImage && <Badge>支持图片</Badge>}
              {selectedType.supportsVideo && <Badge>支持视频</Badge>}
              {selectedType.requiresCover && <Badge variant="warning">需要封面</Badge>}
            </Flex>
          </Box>
        )}

        <Box>
          <Typography variant="pi">描述</Typography>
          <TextInput
            name="description"
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入平台描述"
          />
        </Box>

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

export default PlatformForm;