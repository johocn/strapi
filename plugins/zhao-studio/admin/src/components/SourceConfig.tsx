// admin/src/components/SourceConfig.tsx

import React from 'react';
import { Box, Typography, TextInput, Button, Flex } from '@strapi/design-system';

interface SourceConfigProps {
  source?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const templates = [
  { value: 'sina-finance', label: '新浪财经' },
  { value: 'sohu-tech', label: '搜狐科技' },
  { value: 'netease-news', label: '网易新闻' },
  { value: 'tencent-tech', label: '腾讯科技' },
];

const SourceConfig: React.FC<SourceConfigProps> = ({ source, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    name: source?.name || '',
    url: source?.url || '',
    type: source?.type || 'template',
    template: source?.template || 'sina-finance',
    titleSelector: source?.titleSelector || '',
    contentSelector: source?.contentSelector || '',
    authorSelector: source?.authorSelector || '',
    dateSelector: source?.dateSelector || '',
    isActive: source?.isActive ?? true,
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">{source ? '编辑采集源' : '创建采集源'}</Typography>

      <Flex direction="column" gap={4} marginTop={4}>
        <Box>
          <Typography variant="pi">名称</Typography>
          <TextInput
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
          />
        </Box>

        <Box>
          <Typography variant="pi">URL</Typography>
          <TextInput
            value={formData.url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url: e.target.value })}
          />
        </Box>

        <Box>
          <Typography variant="pi">类型</Typography>
          <Flex gap={2}>
            <Button variant={formData.type === 'template' ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, type: 'template' })}>
              预设模板
            </Button>
            <Button variant={formData.type === 'custom' ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, type: 'custom' })}>
              自定义
            </Button>
          </Flex>
        </Box>

        {formData.type === 'template' && (
          <Box>
            <Typography variant="pi">模板</Typography>
            <Flex gap={2}>
              {templates.map((t) => (
                <Button key={t.value} variant={formData.template === t.value ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, template: t.value })}>
                  {t.label}
                </Button>
              ))}
            </Flex>
          </Box>
        )}

        {formData.type === 'custom' && (
          <>
            <Box>
              <Typography variant="pi">标题选择器</Typography>
              <TextInput
                value={formData.titleSelector}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, titleSelector: e.target.value })}
              />
            </Box>

            <Box>
              <Typography variant="pi">内容选择器</Typography>
              <TextInput
                value={formData.contentSelector}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, contentSelector: e.target.value })}
              />
            </Box>

            <Box>
              <Typography variant="pi">作者选择器</Typography>
              <TextInput
                value={formData.authorSelector}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, authorSelector: e.target.value })}
              />
            </Box>

            <Box>
              <Typography variant="pi">日期选择器</Typography>
              <TextInput
                value={formData.dateSelector}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dateSelector: e.target.value })}
              />
            </Box>
          </>
        )}
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

export default SourceConfig;