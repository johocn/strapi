import type { Core } from "@strapi/strapi";

/** 中国大陆手机号（11 位，1 开头第二位 3-9） */
export const PHONE_RE = /^1[3-9]\d{9}$/;

/** 字段类型白名单（与前端渲染一致） */
export const FORM_TYPES = ["text", "phone", "textarea", "radio", "select", "multi", "number"] as const;

/** 校验失败携带字段级错误 */
export class FormValidationError extends Error {
  errors: { key: string; label: string; message: string }[];
  constructor(errors: { key: string; label: string; message: string }[]) {
    super("报名信息填写有误");
    this.name = "FormValidationError";
    this.errors = errors;
  }
}

function isEmpty(v: any): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function isPlainArray(v: any): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number");
}

function normalizeOptions(field: any): string[] {
  const opts = Array.isArray(field.options) ? field.options : [];
  return opts.map((o: any) => String(o));
}

/** 校验单个字段值；返回错误消息或 null */
function validateField(field: any, value: any): string | null {
  const label = field.label || field.key || "该字段";
  const options = normalizeOptions(field);

  if (field.required && isEmpty(value)) return `请填写${label}`;
  if (isEmpty(value)) return null; // 非必填且未填 → 跳过

  switch (field.type) {
    case "phone":
      return PHONE_RE.test(String(value)) ? null : `请填写正确的${label}`;
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return `请填写正确的${label}`;
      if (field.min != null && n < Number(field.min)) return `${label}不能小于${field.min}`;
      if (field.max != null && n > Number(field.max)) return `${label}不能大于${field.max}`;
      return null;
    }
    case "radio":
    case "select":
      return options.includes(String(value)) ? null : `请选择正确的${label}`;
    case "multi":
      if (!isPlainArray(value)) return `请选择${label}`;
      return value.every((v: any) => options.includes(String(v))) ? null : `请选择正确的${label}`;
    default: // text / textarea
      return null;
  }
}

/** 按 formConfig 校验 formData；返回校验结果 */
export function validateFormData(formConfig: any, formData: any): { ok: boolean; errors: { key: string; label: string; message: string }[] } {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
  const errors: { key: string; label: string; message: string }[] = [];
  for (const f of fields) {
    if (!f || typeof f !== "object" || !f.key) continue;
    const msg = validateField(f, data[f.key]);
    if (msg) errors.push({ key: f.key, label: f.label || f.key, message: msg });
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

/** 仅收集 formConfig 定义的 key，并规范化 number/multi；忽略未定义字段 */
export function collectFormData(formConfig: any, formData: any): Record<string, any> {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (!f || typeof f !== "object" || !f.key) continue;
    const raw = data[f.key];
    if (isEmpty(raw)) continue;
    if (f.type === "number") {
      const n = Number(raw);
      out[f.key] = Number.isFinite(n) ? n : raw;
    } else if (f.type === "multi") {
      out[f.key] = isPlainArray(raw) ? raw.map((x: any) => String(x)) : raw;
    } else {
      out[f.key] = String(raw);
    }
  }
  return out;
}

/** 供解锁判定：判断某通道(contact/survey)在 formData 中是否已填(至少一个该通道字段非空) */
export function channelFilled(formConfig: any, formData: any, channel: string): boolean {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
  const hit = fields.filter((f: any) => f?.channel === channel && f?.key);
  if (!hit.length) return false; // 该通道未配置字段 → 视为不可解锁
  return hit.some((f: any) => !isEmpty(data[f.key]));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  validateFormData,
  collectFormData,
  channelFilled,
});
