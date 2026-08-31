declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 按手动 SOP 待办的 audience 条件解析目标 up_user 名单（供 zhao-sso 的 dispatchManualTodo 委托调用）。
     * audience: { activityDocumentId, filter: "registered"|"noshow"|"recap"|"repurchase" }
     * 返回 up_user.id 数组（number[]）。
     */
    resolveAudience(audience: any): Promise<any>;
};
export default _default;
