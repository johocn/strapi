// admin/src/hooks/useChannelScope.ts
import { useMyPermissions } from '../context/PermissionsProvider';

export const useChannelScope = () => {
  const { channelScope } = useMyPermissions();
  return channelScope;
};
