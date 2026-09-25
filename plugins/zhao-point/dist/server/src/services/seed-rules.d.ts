/**
 * 种子规则收集（纯逻辑）：从插件默认配置的 increaseRules/decreaseRules 与
 * DB 已有 action 列表求差集。补种语义是「只增不改」——同名 action 已存在即跳过，
 * 生产人工调整过的规则不会被覆盖。
 */
export type RuleDef = {
    points?: number;
    limitPerDay?: number;
    limitPerUser?: number;
    limitPerDayPerUser?: number;
    isOneTime?: boolean;
    description?: string;
    taskGroup?: string;
    extraConfig?: Record<string, unknown>;
};
export type MissingRule = {
    action: string;
    category: "increase" | "decrease";
    rule: RuleDef;
};
export declare const collectMissingRules: (increaseRules: Record<string, RuleDef> | undefined, decreaseRules: Record<string, RuleDef> | undefined, existingActions: string[]) => MissingRule[];
