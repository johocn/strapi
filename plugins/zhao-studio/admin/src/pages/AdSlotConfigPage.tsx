// admin/src/pages/AdSlotConfigPage.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { useAdSlots, AdSlot } from '../hooks/useAdSlots';
import AdSlotForm from '../components/AdSlotForm';

const POSITION_LABELS: Record<string, string> = {
  'article-content': '文章内容',
  sidebar: '侧边栏',
  footer: '底部',
  header: '顶部',
  'list-page': '列表页',
  'home-page': '首页',
};

const TYPE_LABELS: Record<string, string> = {
  'product-link': '产品链接',
  banner: '横幅广告',
  popup: '弹窗广告',
  native: '原生广告',
};

const AdSlotConfigPage = () => {
  const { adSlots, loading, error, createAdSlot, updateAdSlot, deleteAdSlot, toggleAdSlot } = useAdSlots();
  const [showForm, setShowForm] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<AdSlot | null>(null);

  const handleCreate = () => {
    setEditingSlot(null);
    setShowForm(true);
  };

  const handleEdit = (slot: AdSlot) => {
    setEditingSlot(slot);
    setShowForm(true);
  };

  const handleDelete = async (slot: AdSlot) => {
    if (window.confirm(`确定删除广告位 "${slot.name}"？`)) {
      await deleteAdSlot(slot.documentId);
    }
  };

  const handleToggle = async (slot: AdSlot) => {
    await toggleAdSlot(slot.documentId, !slot.isActive);
  };

  const handleSave = async (data: Partial<AdSlot>) => {
    try {
      if (editingSlot) {
        await updateAdSlot(editingSlot.documentId, data);
      } else {
        await createAdSlot(data);
      }
      setShowForm(false);
      setEditingSlot(null);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSlot(null);
  };

  return (
    <Box padding={4}>
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta">广告位配置</Typography>
        <Button onClick={handleCreate}>新建广告位</Button>
      </Flex>

      {error && (
        <Box marginTop={4} padding={3} background="danger100" hasRadius>
          <Typography variant="pi" textColor="danger700">{error}</Typography>
        </Box>
      )}

      {loading && !showForm && (
        <Box marginTop={4} padding={4}>
          <Typography variant="pi" textColor="neutral600">加载中...</Typography>
        </Box>
      )}

      {/* 广告位列表 */}
      <Flex marginTop={4} gap={3} direction="column">
        {adSlots.map((slot) => (
          <Box key={slot.documentId} padding={3} background="neutral100" hasRadius>
            <Flex justifyContent="space-between" alignItems="center">
              <Flex gap={2} alignItems="center">
                <Typography variant="pi" fontWeight="bold">{slot.name}</Typography>
                <Badge>{POSITION_LABELS[slot.position] || slot.position}</Badge>
                <Badge>{TYPE_LABELS[slot.type] || slot.type}</Badge>
                <Typography variant="pi" textColor="neutral600">{slot.code}</Typography>
                {!slot.isActive && <Badge variant="warning">已禁用</Badge>}
              </Flex>
              <Flex gap={2}>
                <Button variant="secondary" size="S" onClick={() => handleToggle(slot)}>
                  {slot.isActive ? '禁用' : '启用'}
                </Button>
                <Button variant="secondary" size="S" onClick={() => handleEdit(slot)}>
                  编辑
                </Button>
                <Button variant="danger" size="S" onClick={() => handleDelete(slot)}>
                  删除
                </Button>
              </Flex>
            </Flex>
          </Box>
        ))}

        {adSlots.length === 0 && !loading && (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography variant="pi" textColor="neutral600">暂无广告位配置</Typography>
          </Box>
        )}
      </Flex>

      {/* 表单 */}
      {showForm && (
        <Box marginTop={4}>
          <AdSlotForm adSlot={editingSlot} onSave={handleSave} onCancel={handleCancel} />
        </Box>
      )}
    </Box>
  );
};

export default AdSlotConfigPage;