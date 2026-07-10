/**
 * 内置回退权限策略（独立安装模式，无 zhao-auth 时使用）
 * 超管放行；非超管拒绝（403）
 */
declare const fallbackHasPermission: (policyContext: any, _config: any, _ctx: any) => boolean;
export default fallbackHasPermission;
