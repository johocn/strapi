/**
 * 活动名单导出的纯逻辑（不依赖 strapi，便于单测）。
 * 入参为已归一化的报名 / 到场数据，输出 UTF-8 BOM + CRLF 的 CSV 文本。
 */

/** UTF-8 BOM：Excel 打开中文表头不乱码 */
export const CSV_BOM = "\uFEFF";

/** 报名状态 → 中文 */
const SIGNUP_STATUS_TEXT: Record<string, string> = {
  active: "已报名",
  waiting: "候补中",
  cancelled: "已取消",
};

/** 核销方式 → 中文 */
const METHOD_TEXT: Record<string, string> = {
  self: "自助核销",
  worker_scan: "工作人员扫码",
  manual: "手动核销",
};

const FIXED_HEADERS = [
  "序号", "用户ID", "昵称", "报名状态", "到场状态", "核销方式", "报名时间", "到场时间", "扣除积分",
];

/** 固定列数量（动态表单列从该下标之后开始） */
export const FIXED_COLUMN_COUNT = FIXED_HEADERS.length;

/** 单元格值格式化：数组用「、」连接；null/undefined/空串 → "" */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((v) => formatCell(v)).filter((s) => s !== "").join("、");
  }
  return String(value);
}

/** 单格 CSV 编码：统一双引号包裹，内部引号翻倍 */
export function csvCell(value: unknown): string {
  return `"${formatCell(value).replace(/"/g, '""')}"`;
}

/**
 * 按 UTC+8 格式化时间为 "YYYY-MM-DD HH:mm"。
 * 固定偏移而非依赖服务器时区，避免线上 UTC 环境整列偏 8 小时；非法/空值返回 ""。
 */
export function formatDateTimeCst(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return "";
  const t = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

export type ExportFormField = { key: string; label: string };

export type ExportSignup = {
  id: number | string;
  status?: string | null;
  pointsCharged?: number | string | null;
  signupAt?: unknown;
  formData?: Record<string, unknown> | null;
  preQuestionnaireData?: Record<string, unknown> | null;
  user?: { id?: number | string | null; nickname?: string | null; username?: string | null } | null;
};

export type ExportAttendance = { method?: string | null; checkinAt?: unknown };

/**
 * 到场状态推导（本特性核心规则）：已取消 > 已到场 > 未到场。
 * 「未到场」= 报名仍在册（含候补）但无到场记录，即运营口径的爽约集合。
 */
export function attendanceStatus(signup: ExportSignup, attendance?: ExportAttendance | null): string {
  if (signup?.status === "cancelled") return "已取消";
  return attendance ? "已到场" : "未到场";
}

/** 答卷值序列化：对象/数组 JSON.stringify，空值 → ""，其余 String()（结果一律再过 csvCell 转义） */
function questionnaireCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * 组装名单 CSV 文本（含 BOM 与 CRLF）。
 * 按 signups 入参顺序输出（调用方保证已按报名时间升序），一行一人。
 * 列结构 = 9 固定列 + formConfig 动态列 + 问卷动态列（全部报名 preQuestionnaireData
 * 各 key 的并集，按 key 首次出现顺序稳定排序；列名优先取问卷配置题目标题，否则用 key；无答卷不出列）。
 */
export function buildSignupCsv(input: {
  formFields?: ExportFormField[] | null;
  questionnaireFields?: ExportFormField[] | null;
  signups?: ExportSignup[] | null;
  attendanceBySignupId?: Record<string, ExportAttendance> | null;
}): string {
  const fields = (Array.isArray(input.formFields) ? input.formFields : []).filter((f) => f && f.key);
  const signups = Array.isArray(input.signups) ? input.signups : [];
  const attMap = input.attendanceBySignupId || {};

  // 问卷 key → 题目标题映射（活动 preQuestionnaire.fields 配置），缺配置的 key 回退用 key 本身
  const qLabelByKey = new Map<string, string>();
  for (const f of Array.isArray(input.questionnaireFields) ? input.questionnaireFields : []) {
    if (f && f.key && !qLabelByKey.has(String(f.key))) qLabelByKey.set(String(f.key), String(f.label || f.key));
  }
  // 问卷列 key 并集，按首次出现顺序稳定排序
  const qKeys: string[] = [];
  for (const s of signups) {
    const d = s.preQuestionnaireData;
    if (!d || typeof d !== "object" || Array.isArray(d)) continue;
    for (const k of Object.keys(d)) if (!qKeys.includes(k)) qKeys.push(k);
  }

  const headers = [
    ...FIXED_HEADERS,
    ...fields.map((f) => f.label || f.key),
    ...qKeys.map((k) => qLabelByKey.get(k) || k),
  ];
  const lines = [headers.map(csvCell).join(",")];

  signups.forEach((s, i) => {
    const att = attMap[String(s.id)];
    const userId = s.user?.id ?? "";
    const nick = s.user?.nickname || s.user?.username || (userId !== "" ? `用户#${userId}` : "");
    const row: unknown[] = [
      i + 1,
      userId,
      nick,
      SIGNUP_STATUS_TEXT[String(s.status)] ?? formatCell(s.status),
      attendanceStatus(s, att),
      att ? METHOD_TEXT[String(att.method)] ?? formatCell(att.method) : "",
      formatDateTimeCst(s.signupAt),
      formatDateTimeCst(att?.checkinAt),
      s.pointsCharged ?? 0,
    ];
    for (const f of fields) row.push(formatCell(s.formData?.[f.key]));
    const qData = s.preQuestionnaireData && typeof s.preQuestionnaireData === "object" && !Array.isArray(s.preQuestionnaireData) ? s.preQuestionnaireData : {};
    for (const k of qKeys) row.push(questionnaireCellText(qData[k]));
    lines.push(row.map(csvCell).join(","));
  });

  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}