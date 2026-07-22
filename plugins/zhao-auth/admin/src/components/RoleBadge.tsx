// admin/src/components/RoleBadge.tsx
import React from 'react';
import { Tag } from 'antd';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  CHANNEL_ADMIN: 'orange',
  PLUGIN_MANAGER: 'blue',
  INSTRUCTOR: 'green',
  USER: 'default',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  CHANNEL_ADMIN: '渠道管理员',
  PLUGIN_MANAGER: '插件管理员',
  INSTRUCTOR: '讲师',
  USER: '用户',
};

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const color = ROLE_COLORS[role] || 'default';
  const label = ROLE_LABELS[role] || role;
  return <Tag color={color}>{label}</Tag>;
};

export default RoleBadge;
