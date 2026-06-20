import type { Core } from "@strapi/strapi";
import { AppError } from "../utils/errors";
import { ErrorCodes, ErrorCode } from "../utils/codes";

export interface ErrorHandler {
  /** 创建 AppError 实例 */
  createError(
    code: ErrorCode,
    context?: Record<string, unknown>,
    message?: string
  ): AppError;
  /** 包装未知错误为 AppError */
  wrapError(error: unknown, defaultCode?: ErrorCode): AppError;
  /** 格式化错误为 API 响应体 */
  formatError(error: unknown): { code: string; message: string };
}

export default ({ strapi: _strapi }: { strapi: Core.Strapi }): ErrorHandler => ({
  createError(
    code: ErrorCode,
    context: Record<string, unknown> = {},
    message?: string
  ): AppError {
    return new AppError(code, context, 400, message);
  },

  wrapError(error: unknown, defaultCode: ErrorCode = ErrorCodes.UNKNOWN_ERROR): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError(defaultCode, { originalMessage: error.message }, 500, error.message);
    }
    return new AppError(defaultCode, {}, 500, "Unknown error");
  },

  formatError(error: unknown): { code: string; message: string } {
    if (error instanceof AppError) {
      return { code: error.code, message: error.message };
    }
    if (error instanceof Error) {
      return { code: ErrorCodes.UNKNOWN_ERROR, message: error.message };
    }
    return { code: ErrorCodes.UNKNOWN_ERROR, message: "Unknown error" };
  },
});