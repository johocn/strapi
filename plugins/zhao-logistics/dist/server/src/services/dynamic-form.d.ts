import { Core } from '@strapi/strapi';
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
    visibleWhen?: {
        field: string;
        op: "eq" | "ne" | "contains" | "gt" | "lt";
        value: any;
    };
    options?: {
        label: string;
        value: string;
    }[];
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        messageKey?: string;
    };
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
    errors: {
        field: string;
        message: string;
    }[];
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 加载字段规则
     * 按条件匹配 quote-field-rule，合并 fields JSON
     */
    loadFields(siteId: number, context: {
        routeId?: string;
        serviceProvider?: string;
        customerType?: string;
        lang?: string;
    }): Promise<FormField[]>;
    /**
     * 校验表单数据
     */
    validate(siteId: number, formData: Record<string, any>, fields: FormField[]): ValidationResult;
    /**
     * 解析显隐联动（前端用）
     * 根据 formData 的当前值，计算字段的可见性
     */
    resolveVisibility(formData: Record<string, any>, fields: FormField[]): FormField[];
};
export default _default;
