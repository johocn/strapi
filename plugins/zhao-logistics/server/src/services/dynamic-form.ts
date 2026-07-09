import type { Core } from "@strapi/strapi";

const FIELD_RULE_UID = "plugin::zhao-logistics.quote-field-rule";

/**
 * 表单字段定义
 */
export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "textarea" | "date" | "file";
  group: string;
  required: boolean;
  visible: boolean;
  visibleWhen?: { field: string; op: "eq" | "ne" | "contains" | "gt" | "lt"; value: any };
  options?: { label: string; value: string }[];
  validation?: { pattern?: string; min?: number; max?: number; messageKey?: string };
  unit?: string;
  placeholder?: string;
  permission?: string;
  order: number;
}

/**
 * 校验结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 加载字段规则
   * 按条件匹配 quote-field-rule，合并 fields JSON
   */
  async loadFields(
    siteId: number,
    context: { routeId?: string; serviceProvider?: string; customerType?: string; lang?: string }
  ): Promise<FormField[]> {
    const where: any = { site: siteId, isActive: true, deletedAt: null };

    if (context.routeId) {
      where.$or = [{ routeId: null }, { routeId: context.routeId }];
    }
    if (context.serviceProvider) {
      // serviceProvider 为 null 表示通用规则
    }

    const rules = await strapi.db.query(FIELD_RULE_UID).findMany({
      where,
      orderBy: { priority: "desc" },
    });

    // 按 customerType 过滤
    const filtered = rules.filter((r: any) => {
      if (!r.customerType) return true;
      if (!context.customerType) return true;
      return r.customerType === context.customerType;
    });

    // 合并 fields JSON（按 priority 降序，高优先级覆盖低优先级）
    const fieldMap = new Map<string, FormField>();
    for (const rule of filtered) {
      if (!rule.fields || !Array.isArray(rule.fields)) continue;
      for (const field of rule.fields) {
        if (fieldMap.has(field.key)) {
          // 合并覆盖
          fieldMap.set(field.key, { ...fieldMap.get(field.key), ...field });
        } else {
          fieldMap.set(field.key, field);
        }
      }
    }

    // 按 order 排序
    return Array.from(fieldMap.values()).sort((a, b) => a.order - b.order);
  },

  /**
   * 校验表单数据
   */
  validate(siteId: number, formData: Record<string, any>, fields: FormField[]): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    for (const field of fields) {
      if (!field.visible) continue;

      const value = formData[field.key];

      // 必填校验
      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({
          field: field.key,
          message: field.validation?.messageKey || `${field.label}为必填项`,
        });
        continue;
      }

      if (value === undefined || value === null || value === "") continue;

      // pattern 校验
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push({
            field: field.key,
            message: field.validation.messageKey || `${field.label}格式不正确`,
          });
          continue;
        }
      }

      // min/max 校验
      if (field.type === "number") {
        const numValue = Number(value);
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.key,
            message: `${field.label}不能小于 ${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.key,
            message: `${field.label}不能大于 ${field.validation.max}`,
          });
        }
      }

      // select 校验
      if (field.type === "select" && field.options) {
        const validValues = field.options.map((o) => o.value);
        if (!validValues.includes(String(value))) {
          errors.push({
            field: field.key,
            message: `${field.label}的值无效`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * 解析显隐联动（前端用）
   * 根据 formData 的当前值，计算字段的可见性
   */
  resolveVisibility(formData: Record<string, any>, fields: FormField[]): FormField[] {
    return fields.map((field) => {
      if (!field.visibleWhen) return field;

      const targetValue = formData[field.visibleWhen.field];
      const expected = field.visibleWhen.value;
      let visible = false;

      switch (field.visibleWhen.op) {
        case "eq":
          visible = String(targetValue) === String(expected);
          break;
        case "ne":
          visible = String(targetValue) !== String(expected);
          break;
        case "contains":
          visible = String(targetValue || "").includes(String(expected));
          break;
        case "gt":
          visible = Number(targetValue) > Number(expected);
          break;
        case "lt":
          visible = Number(targetValue) < Number(expected);
          break;
      }

      return { ...field, visible };
    });
  },
});
