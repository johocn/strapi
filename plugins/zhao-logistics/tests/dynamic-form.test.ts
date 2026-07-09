import type { FormField, ValidationResult } from "../server/src/services/dynamic-form";

describe("dynamic-form", () => {
  const mockFields: FormField[] = [
    {
      key: "customerName",
      label: "客户姓名",
      type: "text",
      group: "basic",
      required: true,
      visible: true,
      order: 1,
    },
    {
      key: "weight",
      label: "货物重量",
      type: "number",
      group: "cargo",
      required: true,
      visible: true,
      validation: { min: 0.1, max: 1000 },
      unit: "kg",
      order: 2,
    },
    {
      key: "fbaWarehouse",
      label: "FBA仓库编号",
      type: "text",
      group: "destination",
      required: false,
      visible: false,
      visibleWhen: { field: "customerType", op: "eq", value: "fba_seller" },
      order: 3,
    },
  ];

  describe("validate", () => {
    // 模拟 validate 方法（不依赖 Strapi）
    function validate(formData: Record<string, any>, fields: FormField[]): ValidationResult {
      const errors: { field: string; message: string }[] = [];
      for (const field of fields) {
        if (!field.visible) continue;
        const value = formData[field.key];
        if (field.required && (value === undefined || value === null || value === "")) {
          errors.push({ field: field.key, message: `${field.label}为必填项` });
          continue;
        }
        if (value === undefined || value === null || value === "") continue;
        if (field.type === "number") {
          const numValue = Number(value);
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            errors.push({ field: field.key, message: `${field.label}不能小于 ${field.validation.min}` });
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            errors.push({ field: field.key, message: `${field.label}不能大于 ${field.validation.max}` });
          }
        }
      }
      return { valid: errors.length === 0, errors };
    }

    it("应通过有效数据", () => {
      const result = validate({ customerName: "张三", weight: 50 }, mockFields);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应检测必填字段缺失", () => {
      const result = validate({ weight: 50 }, mockFields);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: "customerName", message: "客户姓名为必填项" });
    });

    it("应检测数值超出范围", () => {
      const result = validate({ customerName: "张三", weight: 2000 }, mockFields);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("weight");
    });
  });

  describe("resolveVisibility", () => {
    function resolveVisibility(formData: Record<string, any>, fields: FormField[]): FormField[] {
      return fields.map((field) => {
        if (!field.visibleWhen) return field;
        const targetValue = formData[field.visibleWhen.field];
        const visible = String(targetValue) === String(field.visibleWhen.value);
        return { ...field, visible };
      });
    }

    it("应在 customerType=fba_seller 时显示 FBA 仓库字段", () => {
      const result = resolveVisibility({ customerType: "fba_seller" }, mockFields);
      const fbaField = result.find((f) => f.key === "fbaWarehouse");
      expect(fbaField?.visible).toBe(true);
    });

    it("应在 customerType=individual 时隐藏 FBA 仓库字段", () => {
      const result = resolveVisibility({ customerType: "individual" }, mockFields);
      const fbaField = result.find((f) => f.key === "fbaWarehouse");
      expect(fbaField?.visible).toBe(false);
    });
  });
});
