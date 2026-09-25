/**
 * 活动名单导出的纯逻辑（不依赖 strapi，便于单测）。
 * 入参为已归一化的报名 / 到场数据，输出 UTF-8 BOM + CRLF 的 CSV 文本。
 */
/** UTF-8 BOM：Excel 打开中文表头不乱码 */
export declare const CSV_BOM = "\uFEFF";
/** 固定列数量（动态表单列从该下标之后开始） */
export declare const FIXED_COLUMN_COUNT: number;
/** 单元格值格式化：数组用「、」连接；null/undefined/空串 → "" */
export declare function formatCell(value: unknown): string;
/** 单格 CSV 编码：统一双引号包裹，内部引号翻倍 */
export declare function csvCell(value: unknown): string;
/**
 * 按 UTC+8 格式化时间为 "YYYY-MM-DD HH:mm"。
 * 固定偏移而非依赖服务器时区，避免线上 UTC 环境整列偏 8 小时；非法/空值返回 ""。
 */
export declare function formatDateTimeCst(value: unknown): string;
export type ExportFormField = {
    key: string;
    label: string;
};
export type ExportSignup = {
    id: number | string;
    status?: string | null;
    pointsCharged?: number | string | null;
    signupAt?: unknown;
    formData?: Record<string, unknown> | null;
    user?: {
        id?: number | string | null;
        nickname?: string | null;
        username?: string | null;
    } | null;
};
export type ExportAttendance = {
    method?: string | null;
    checkinAt?: unknown;
};
/**
 * 到场状态推导（本特性核心规则）：已取消 > 已到场 > 未到场。
 * 「未到场」= 报名仍在册（含候补）但无到场记录，即运营口径的爽约集合。
 */
export declare function attendanceStatus(signup: ExportSignup, attendance?: ExportAttendance | null): string;
/**
 * 组装名单 CSV 文本（含 BOM 与 CRLF）。
 * 按 signups 入参顺序输出（调用方保证已按报名时间升序），一行一人。
 */
export declare function buildSignupCsv(input: {
    formFields?: ExportFormField[] | null;
    signups?: ExportSignup[] | null;
    attendanceBySignupId?: Record<string, ExportAttendance> | null;
}): string;
