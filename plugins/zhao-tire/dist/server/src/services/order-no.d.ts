import { Core } from '@strapi/strapi';
/** 取 Asia/Shanghai 时区的 YYMMDD 日期戳 */
export declare const dayStamp: (now?: Date) => string;
/** 订单号：XT + YYMMDD + '-' + 4 位当日序号 */
export declare const formatOrderNo: (now: Date, sequence: number) => string;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    dayStamp: (now?: Date) => string;
    formatOrderNo: (now: Date, sequence: number) => string;
    /** 按当日已有单量生成下一个单号；唯一冲突由调用方重试 */
    generate(now?: Date): Promise<string>;
};
export default _default;
export declare const ORDER_NO_PATTERN: RegExp;
