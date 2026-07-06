import { Core } from '@strapi/strapi';
import { AppError } from '../utils/errors';
import { ErrorCode } from '../utils/codes';
export interface ErrorHandler {
    /** 创建 AppError 实例 */
    createError(code: ErrorCode, context?: Record<string, unknown>, message?: string): AppError;
    /** 包装未知错误为 AppError */
    wrapError(error: unknown, defaultCode?: ErrorCode): AppError;
    /** 格式化错误为 API 响应体 */
    formatError(error: unknown): {
        code: string;
        message: string;
    };
}
declare const _default: ({ strapi: _strapi }: {
    strapi: Core.Strapi;
}) => ErrorHandler;
export default _default;
