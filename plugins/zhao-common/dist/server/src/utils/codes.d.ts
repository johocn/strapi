/**
 * 错误码枚举
 * 格式: <DOMAIN>_<具体错误>
 */
export declare const ErrorCodes: {
    readonly UNKNOWN_ERROR: "COMMON_001";
    readonly VALIDATION_ERROR: "COMMON_002";
    readonly NOT_FOUND: "COMMON_003";
    readonly FORBIDDEN: "COMMON_004";
    readonly UNAUTHORIZED: "COMMON_005";
    readonly CONFIG_ERROR: "COMMON_006";
    readonly INTERNAL_ERROR: "COMMON_007";
    readonly CHANNEL_NOT_FOUND: "CHANNEL_001";
    readonly CHANNEL_DEPTH_EXCEEDED: "CHANNEL_002";
    readonly CHANNEL_DISABLED: "CHANNEL_003";
    readonly INVITE_CODE_INVALID: "CHANNEL_004";
    readonly MEMBER_NOT_FOUND: "CHANNEL_005";
    readonly CHANNEL_DUPLICATE: "CHANNEL_006";
    readonly USER_NOT_LINKED: "CHANNEL_007";
    readonly TOKEN_MISSING: "AUTH_001";
    readonly TOKEN_INVALID: "AUTH_002";
    readonly ROLE_INSUFFICIENT: "AUTH_003";
    readonly SCOPE_FORBIDDEN: "AUTH_004";
    readonly RESOURCE_OWNER_MISMATCH: "AUTH_005";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
