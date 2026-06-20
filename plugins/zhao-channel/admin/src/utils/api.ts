import { useCallback } from "react";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const ADMIN_API_PREFIX = `/admin/plugins/${PLUGIN_ID}`;

export function useChannelApi() {
  const { get, post, put, del } = useFetchClient();

  /** 获取渠道列表（支持 depth=0 筛选根渠道） */
  const getChannels = useCallback(
    async (params?: Record<string, any>) => {
      const { data } = await get(`${ADMIN_API_PREFIX}/channels`, { params });
      return data;
    },
    [get]
  );

  /** 获取单个渠道详情 */
  const getChannel = useCallback(async (id: number) => {
    const { data } = await get(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [get]);

  /** 创建子渠道（需传 parentChannel） */
  const createChannel = useCallback(
    async (body: {
      name: string;
      parentChannel: number;
      description?: string;
      channelTier?: string;
    }) => {
      const { data } = await post(`${ADMIN_API_PREFIX}/channels`, body);
      return data;
    },
    [post]
  );

  /** 创建根渠道 */
  const createRootChannel = useCallback(
    async (body: { name: string; description?: string }) => {
      const { data } = await post(
        `${ADMIN_API_PREFIX}/channels`,
        body
      );
      return data;
    },
    [post]
  );

  /** 获取直接子渠道列表 */
  const getChildren = useCallback(async (id: number) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/children`
    );
    return data;
  }, [get]);

  /** 获取完整子树 */
  const getHierarchy = useCallback(async (id: number) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/${id}/hierarchy`
    );
    return data;
  }, [get]);

  /** 更新渠道 */
  const updateChannel = useCallback(
    async (id: number, body: Record<string, any>) => {
      const { data } = await put(
        `${ADMIN_API_PREFIX}/channels/${id}`,
        body
      );
      return data;
    },
    [put]
  );

  /** 删除渠道（级联删除） */
  const deleteChannel = useCallback(async (id: number) => {
    const { data } = await del(`${ADMIN_API_PREFIX}/channels/${id}`);
    return data;
  }, [del]);

  /** 获取指定父层级的可用层级树 */
  const getTierTree = useCallback(async (parentTier: string) => {
    const { data } = await get(
      `${ADMIN_API_PREFIX}/channels/tier-tree/${parentTier}`
    );
    return data;
  }, [get]);

  return {
    getChannels,
    getChannel,
    createChannel,
    createRootChannel,
    getChildren,
    getHierarchy,
    updateChannel,
    deleteChannel,
    getTierTree,
  };
}
