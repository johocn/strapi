'use strict';

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T | null;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, msg: string = 'success'): ApiResponse<T> {
  return {
    code: 200,
    msg,
    data,
  };
}

/**
 * 错误响应
 */
export function errorResponse(code: number, msg: string): ApiResponse<null> {
  return {
    code,
    msg,
    data: null,
  };
}

/**
 * 分页响应
 * 字段名 records 与前端 ProTable/useApi 约定一致
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): ApiResponse<{ records: T[]; page: number; pageSize: number; total: number }> {
  return successResponse({
    records: data,
    page,
    pageSize,
    total,
  });
}