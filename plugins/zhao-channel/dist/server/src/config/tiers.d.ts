/**
 * 渠道层级配置 — 单一事实来源
 *
 * 结构：
 *   root (depth=0)
 *   ├── core/senior/global/authorized/official/partner/agent (depth=1, 平级)
 *   └── national → regional → city → county → local → store (depth=2~7, 链式)
 */
export declare const TIER_HIERARCHY: Record<string, string[]>;
export declare const ROOT_TIER = "root";
export declare const LEAF_TIER = "store";
export declare const MAX_CHANNEL_DEPTH = 7;
export type ChannelTier = keyof typeof TIER_HIERARCHY;
/**
 * 获取所有 tier 值（用于 Schema enum）
 */
export declare function getAllTiers(): string[];
/**
 * 获取某 tier 允许的子 tier 列表
 */
export declare function getChildTiers(parentTier: string): string[];
/**
 * 获取唯一子 tier（链式关系时用，如 national → regional）
 * 如果父 tier 有多个子选项则返回 null
 */
export declare function getOnlyChildTier(parentTier: string): string | null;
/**
 * 判断是否为叶子节点（不可再创建子渠道）
 */
export declare function isLeafTier(tier: string): boolean;
/**
 * 校验 tier 值是否合法
 */
export declare function validateTier(tier: string): boolean;
export interface TierTreeNode {
    tier: string;
    children: TierTreeNode[];
}
/**
 * 构建从 parentTier 开始的完整子树
 */
export declare function getTierTree(parentTier: string): TierTreeNode[];
