/**
 * 渠道层级配置 — 单一事实来源
 *
 * 结构：
 *   root (depth=0)
 *   ├── core/senior/global/authorized/official/partner/agent (depth=1, 平级)
 *   └── national → regional → city → county → local → store (depth=2~7, 链式)
 */

// 层级映射表：每个 tier 定义其允许的直接子 tier
export const TIER_HIERARCHY: Record<string, string[]> = {
  root:       ["core", "senior", "global", "authorized", "official", "partner", "agent"],
  core:       ["national"],
  senior:     ["national"],
  global:     ["national"],
  authorized: ["national"],
  official:   ["national"],
  partner:    ["national"],
  agent:      ["national"],
  national:   ["regional"],
  regional:   ["city"],
  city:       ["county"],
  county:     ["local"],
  local:      ["store"],
  store:      [], // 叶子节点
};

export const ROOT_TIER = "root";
export const LEAF_TIER = "store";
export const MAX_CHANNEL_DEPTH = 7;

export type ChannelTier = keyof typeof TIER_HIERARCHY;

/**
 * 获取所有 tier 值（用于 Schema enum）
 */
export function getAllTiers(): string[] {
  return Object.keys(TIER_HIERARCHY);
}

/**
 * 获取某 tier 允许的子 tier 列表
 */
export function getChildTiers(parentTier: string): string[] {
  return TIER_HIERARCHY[parentTier] || [];
}

/**
 * 获取唯一子 tier（链式关系时用，如 national → regional）
 * 如果父 tier 有多个子选项则返回 null
 */
export function getOnlyChildTier(parentTier: string): string | null {
  const children = getChildTiers(parentTier);
  return children.length === 1 ? children[0] : null;
}

/**
 * 判断是否为叶子节点（不可再创建子渠道）
 */
export function isLeafTier(tier: string): boolean {
  return getChildTiers(tier).length === 0;
}

/**
 * 校验 tier 值是否合法
 */
export function validateTier(tier: string): boolean {
  return tier in TIER_HIERARCHY;
}

// ── 树形结构 ──

export interface TierTreeNode {
  tier: string;
  children: TierTreeNode[];
}

/**
 * 构建从 parentTier 开始的完整子树
 */
export function getTierTree(parentTier: string): TierTreeNode[] {
  return getChildTiers(parentTier).map((child) => ({
    tier: child,
    children: getTierTree(child),
  }));
}
