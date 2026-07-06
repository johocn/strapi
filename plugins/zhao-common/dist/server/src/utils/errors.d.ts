/**
 * 自定义应用异常
 */
export declare class AppError extends Error {
    /** 错误码，如 "CHANNEL_NOT_FOUND" */
    code: string;
    /** HTTP 状态码（适用于 API 响应） */
    status: number;
    /** 上下文参数（用于消息模板插值） */
    context: Record<string, unknown>;
    constructor(code: string, context?: Record<string, unknown>, status?: number, message?: string);
    /** 序列化为 JSON（用于 API 响应） */
    toJSON(): {
        code: string;
        message: string;
        context: Record<string, unknown>;
    };
}
/**
 * 404 资源不存在异常
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: number | string);
}
/**
 * 403 无权限异常
 */
export declare class ForbiddenError extends AppError {
    constructor(code?: string, context?: Record<string, unknown>, message?: string);
}
/**
 * 401 认证失败异常
 */
export declare class UnauthorizedError extends AppError {
    constructor(code?: string, context?: Record<string, unknown>, message?: string);
}
/**
 * 422 参数校验异常
 */
export declare class ValidationError extends AppError {
    constructor(field: string, reason: string, context?: Record<string, unknown>);
}
