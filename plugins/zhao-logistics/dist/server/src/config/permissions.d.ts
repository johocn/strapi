/**
 * zhao-logistics 权限定义
 * 命名规范：zhao-logistics.{ct}.{action}
 * action: read / create / update / delete / publish
 */
export declare const PERMISSIONS: {
    readonly "quote-request": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "询价单";
    };
    readonly "quote-field-rule": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "询价动态字段规则";
    };
    readonly "quote-price-rule": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "报价规则表";
    };
    readonly "quote-price-formula": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "报价公式模板";
    };
    readonly "tracking-shipment": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "货物追踪主表";
    };
    readonly "tracking-node": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "追踪节点";
    };
    readonly "tracking-provider": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "追踪 API 配置";
    };
    readonly "contact-matrix": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "联系渠道矩阵";
    };
    readonly review: {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "客户评价";
    };
    readonly subscription: {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "通知订阅";
    };
    readonly "landing-page": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "营销落地页";
    };
    readonly "conversion-funnel": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "转化漏斗";
    };
    readonly "conversion-event": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "转化事件";
    };
    readonly "intent-order": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "意向订单";
    };
    readonly referral: {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "推荐奖励";
    };
    readonly "customer-profile": {
        readonly actions: readonly ["read", "create", "update", "delete"];
        readonly displayName: "客户档案";
    };
};
/**
 * 系统角色权限映射
 * super-admin: 全部权限（Strapi 自动）
 * admin: 除 tracking-provider.create/update/delete 外的全部（API Key 安全）
 * editor: 内容管理权限（评价/落地页/意向单/推荐等）
 * viewer: 全部 .read
 */
export declare const ROLE_PERMISSIONS: {
    readonly admin: {
        readonly "quote-request": readonly ["read", "create", "update", "delete"];
        readonly "quote-field-rule": readonly ["read", "create", "update", "delete"];
        readonly "quote-price-rule": readonly ["read", "create", "update", "delete"];
        readonly "quote-price-formula": readonly ["read", "create", "update", "delete"];
        readonly "tracking-shipment": readonly ["read", "create", "update", "delete"];
        readonly "tracking-node": readonly ["read", "create", "update", "delete"];
        readonly "tracking-provider": readonly ["read"];
        readonly "contact-matrix": readonly ["read", "create", "update", "delete"];
        readonly review: readonly ["read", "create", "update", "delete"];
        readonly subscription: readonly ["read", "create", "update", "delete"];
        readonly "landing-page": readonly ["read", "create", "update", "delete"];
        readonly "conversion-funnel": readonly ["read", "create", "update", "delete"];
        readonly "conversion-event": readonly ["read", "create", "update", "delete"];
        readonly "intent-order": readonly ["read", "create", "update", "delete"];
        readonly referral: readonly ["read", "create", "update", "delete"];
        readonly "customer-profile": readonly ["read", "create", "update", "delete"];
    };
    readonly editor: {
        readonly "quote-field-rule": readonly ["read", "create", "update", "delete"];
        readonly "quote-price-rule": readonly ["read", "create", "update", "delete"];
        readonly "contact-matrix": readonly ["read", "create", "update", "delete"];
        readonly review: readonly ["read", "create", "update", "delete"];
        readonly "landing-page": readonly ["read", "create", "update", "delete"];
        readonly "intent-order": readonly ["read", "create", "update", "delete"];
        readonly referral: readonly ["read", "create", "update", "delete"];
        readonly subscription: readonly ["read"];
        readonly "conversion-funnel": readonly ["read"];
        readonly "conversion-event": readonly ["read"];
        readonly "customer-profile": readonly ["read"];
    };
    readonly viewer: {
        readonly "quote-request": readonly ["read"];
        readonly "quote-field-rule": readonly ["read"];
        readonly "quote-price-rule": readonly ["read"];
        readonly "quote-price-formula": readonly ["read"];
        readonly "tracking-shipment": readonly ["read"];
        readonly "tracking-node": readonly ["read"];
        readonly "tracking-provider": readonly ["read"];
        readonly "contact-matrix": readonly ["read"];
        readonly review: readonly ["read"];
        readonly subscription: readonly ["read"];
        readonly "landing-page": readonly ["read"];
        readonly "conversion-funnel": readonly ["read"];
        readonly "conversion-event": readonly ["read"];
        readonly "intent-order": readonly ["read"];
        readonly referral: readonly ["read"];
        readonly "customer-profile": readonly ["read"];
    };
};
/**
 * 生成权限标识符
 */
export declare function buildPermissionId(ct: string, action: string): string;
/**
 * 获取所有权限标识符列表
 */
export declare function getAllPermissionIds(): string[];
