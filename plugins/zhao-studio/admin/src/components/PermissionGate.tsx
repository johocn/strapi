// admin/src/components/PermissionGate.tsx
// 同步测试：tests/admin/permissions-parity.test.tsx
// 修改 zhao-auth 权限组件时，请同步更新本文件和同步测试
import React from 'react';
import { Button } from 'antd';
import { useMyPermissions } from '../context/PermissionsProvider';

export interface PermissionGateProps {
  action: string | string[];
  fallback?: React.ReactNode;
  mode?: 'hide' | 'disable';
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  action,
  fallback = null,
  mode = 'hide',
  children,
}) => {
  const { hasPermission } = useMyPermissions();
  const actions = Array.isArray(action) ? action : [action];
  const allowed = actions.some(a => hasPermission(a));

  if (allowed) return <>{children}</>;

  if (mode === 'disable') {
    return <div style={{ opacity: 0.5, pointerEvents: 'none' }}>{children}</div>;
  }

  return <>{fallback}</>;
};

export interface PermissionButtonProps extends React.ComponentProps<typeof Button> {
  action: string | string[];
  hideIfNoPermission?: boolean;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  action,
  hideIfNoPermission = false,
  disabled,
  ...rest
}) => {
  const { hasPermission } = useMyPermissions();
  const actions = Array.isArray(action) ? action : [action];
  const allowed = actions.some(a => hasPermission(a));

  if (!allowed && hideIfNoPermission) return null;

  return <Button {...rest} disabled={disabled || !allowed} />;
};

export default PermissionGate;
