/**
 * 自定义应用异常
 */
export class AppError extends Error {
  /** 错误码，如 "CHANNEL_NOT_FOUND" */
  public code: string;
  /** HTTP 状态码（适用于 API 响应） */
  public status: number;
  /** 上下文参数（用于消息模板插值） */
  public context: Record<string, unknown>;

  constructor(
    code: string,
    context: Record<string, unknown> = {},
    status: number = 400,
    message?: string
  ) {
    super(message || code);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.context = context;
  }

  /** 序列化为 JSON（用于 API 响应） */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

/**
 * 404 资源不存在异常
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      { resource, id },
      404,
      `${resource} not found`
    );
  }
}

/**
 * 403 无权限异常
 */
export class ForbiddenError extends AppError {
  constructor(
    code: string = "FORBIDDEN",
    context: Record<string, unknown> = {},
    message?: string
  ) {
    super(code, context, 403, message || "Forbidden");
  }
}

/**
 * 401 认证失败异常
 */
export class UnauthorizedError extends AppError {
  constructor(
    code: string = "UNAUTHORIZED",
    context: Record<string, unknown> = {},
    message?: string
  ) {
    super(code, context, 401, message || "Unauthorized");
  }
}

/**
 * 422 参数校验异常
 */
export class ValidationError extends AppError {
  constructor(
    field: string,
    reason: string,
    context: Record<string, unknown> = {}
  ) {
    super("VALIDATION_ERROR", { field, reason, ...context }, 422, reason);
  }
}