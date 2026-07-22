// admin/src/hooks/usePermissionCheck.ts
import { useMyPermissions } from '../context/PermissionsProvider';

export const usePermissionCheck = (action: string): boolean => {
  const { hasPermission } = useMyPermissions();
  return hasPermission(action);
};
