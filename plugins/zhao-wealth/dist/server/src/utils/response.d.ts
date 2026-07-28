interface ApiResponse<T> {
    code: number;
    msg: string;
    data: T | null;
}
/**
 * 成功响应
 */
export declare function successResponse<T>(data: T, msg?: string): ApiResponse<T>;
/**
 * 错误响应
 */
export declare function errorResponse(code: number, msg: string): ApiResponse<null>;
/**
 * 分页响应
 * 字段名 records 与前端 ProTable/useApi 约定一致
 */
export declare function paginatedResponse<T>(data: T[], page: number, pageSize: number, total: number): ApiResponse<{
    records: T[];
    page: number;
    pageSize: number;
    total: number;
}>;
export {};
