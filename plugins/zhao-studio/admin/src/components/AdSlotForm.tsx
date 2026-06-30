// admin/src/components/AdSlotForm.tsx

import React from 'react';
import { Box, Typography, TextInput, Button, Flex, Badge } from '@strapi/design-system';
import { AdSlot } from '../hooks/useAdSlots';

interface AdSlotFormProps {
  adSlot?: AdSlot | null;
  onSave: (data: Partial<AdSlot>) => void;
  onCancel: () => void;
}

const POSITION_OPTIONS = [
  { value: 'article-content', label: '文章内容' },
  { value: 'sidebar', label: '侧边栏' },
  { value: 'footer', label: '底部' },
  { value: 'header', label: '顶部' },
  { value: 'list-page', label: '列表页' },
  { value: 'home-page', label: '首页' },
];

const TYPE_OPTIONS = [
  { value: 'product-link', label: '产品链接' },
  { value: 'banner', label: '横幅广告' },
  { value: 'popup', label: '弹窗广告' },
  { value: 'native', label: '原生广告' },
];

const AdSlotForm: React.FC<AdSlotFormProps> = ({ adSlot, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState<Partial<AdSlot>>({
    name: adSlot?.name || '',
    code: adSlot?.code || '',
    position: adSlot?.position || 'article-content',
    type: adSlot?.type || 'product-link',
    targetUrl: adSlot?.targetUrl || '',
    productId: adSlot?.productId || '',
    imageUrl: adSlot?.imageUrl || '',
    isActive: adSlot?.isActive ?? true,
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Box padding={4} background="neutral100" hasRadius>
      <Typography variant="delta">{adSlot ? '编辑广告位' : '新建广告位'}</Typography>

      <Flex marginTop={4} gap={4} direction="column">
        <Box>
          <Typography variant="pi">名称 *</Typography>
          <TextInput
            value={formData.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入广告位名称"
          />
        </Box>

        <Box>
          <Typography variant="pi">代码 *</Typography>
          <TextInput
            value={formData.code || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
            placeholder="唯一标识符，如 home-banner-1"
          />
        </Box>

        <Box>
          <Typography variant="pi">位置</Typography>
          <Flex gap={2} marginTop={1}>
            {POSITION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={formData.position === opt.value ? 'default' : 'secondary'}
                onClick={() => setFormData({ ...formData, position: opt.value as AdSlot['position'] })}
              >
                {opt.label}
              </Button>
            ))}
          </Flex>
        </Box>

        <Box>
          <Typography variant="pi">类型</Typography>
          <Flex gap={2} marginTop={1}>
            {TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={formData.type === opt.value ? 'default' : 'secondary'}
                onClick={() => setFormData({ ...formData, type: opt.value as AdSlot['type'] })}
              >
                {opt.label}
              </Button>
            ))}
          </Flex>
        </Box>

        <Box>
          <Typography variant="pi">目标URL</Typography>
          <TextInput
            value={formData.targetUrl || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, targetUrl: e.target.value })}
            placeholder="点击跳转链接"
          />
        </Box>

        <Box>
          <Typography variant="pi">产品ID</Typography>
          <TextInput
            value={formData.productId || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, productId: e.target.value })}
            placeholder="关联产品ID（可选）"
          />
        </Box>

        <Box>
          <Typography variant="pi">图片URL</Typography>
          <TextInput
            value={formData.imageUrl || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="广告图片地址"
          />
        </Box>

        <Box>
          <Typography variant="pi">状态</Typography>
          <Flex gap={2} marginTop={1}>
            <Button variant={formData.isActive ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, isActive: true })}>
              启用
            </Button>
            <Button variant={!formData.isActive ? 'default' : 'secondary'} onClick={() => setFormData({ ...formData, isActive: false })}>
              禁用
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Flex marginTop={4} justifyContent="flex-end" gap={2}>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave}>保存</Button>
      </Flex>
    </Box>
  );
};

export default AdSlotForm;