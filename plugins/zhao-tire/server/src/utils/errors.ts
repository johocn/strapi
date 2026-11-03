export type TireErrorCode =
  | "VALIDATION_FAILED"
  | "SLOT_FULL"
  | "ORDER_NOT_FOUND"
  | "PHONE_MISMATCH"
  | "DUPLICATE_REQUEST"
  | "STATE_INVALID"
  | "INTERNAL_ERROR";

export const createError = (
  code: TireErrorCode,
  status: number,
  message: string,
  details?: unknown
) => {
  const error: any = new Error(message);
  error.code = code;
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
};

export const sendError = (ctx: any, error: any) => {
  const status = Number(error?.status) || 500;
  if (status >= 500) {
    try {
      strapi.log.error(`[zhao-tire] ${error?.stack || error}`);
    } catch {
      // ignore logging failure
    }
  }
  ctx.status = status;
  ctx.body = {
    code: error?.code || "INTERNAL_ERROR",
    message: error?.message || "服务异常",
    ...(error?.details !== undefined ? { details: error.details } : {}),
  };
};
