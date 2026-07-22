// admin/src/hooks/useTenant.ts
import { useMyPermissions } from '../context/PermissionsProvider';

export const useTenant = () => {
  const { tenant } = useMyPermissions();
  return tenant;
};
