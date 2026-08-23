import { Core } from '@strapi/strapi';
/** 中国大陆手机号（11 位，1 开头第二位 3-9） */
export declare const PHONE_RE: RegExp;
/** 字段类型白名单（与前端渲染一致） */
export declare const FORM_TYPES: readonly ["text", "phone", "textarea", "radio", "select", "multi", "number"];
/** 校验失败携带字段级错误 */
export declare class FormValidationError extends Error {
    errors: {
        key: string;
        label: string;
        message: string;
    }[];
    constructor(errors: {
        key: string;
        label: string;
        message: string;
    }[]);
}
/** 按 formConfig 校验 formData；返回校验结果 */
export declare function validateFormData(formConfig: any, formData: any): {
    ok: boolean;
    errors: {
        key: string;
        label: string;
        message: string;
    }[];
};
/** 仅收集 formConfig 定义的 key，并规范化 number/multi；忽略未定义字段 */
export declare function collectFormData(formConfig: any, formData: any): Record<string, any>;
/** 供解锁判定：判断某通道(contact/survey)在 formData 中是否已填(至少一个该通道字段非空) */
export declare function channelFilled(formConfig: any, formData: any, channel: string): boolean;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    validateFormData: typeof validateFormData;
    collectFormData: typeof collectFormData;
    channelFilled: typeof channelFilled;
};
export default _default;
