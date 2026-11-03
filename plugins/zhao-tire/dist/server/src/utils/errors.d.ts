export type TireErrorCode = "VALIDATION_FAILED" | "SLOT_FULL" | "ORDER_NOT_FOUND" | "PHONE_MISMATCH" | "DUPLICATE_REQUEST" | "STATE_INVALID" | "INTERNAL_ERROR";
export declare const createError: (code: TireErrorCode, status: number, message: string, details?: unknown) => any;
export declare const sendError: (ctx: any, error: any) => void;
