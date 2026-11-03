import { Core } from '@strapi/strapi';
import { SmsTemplateType } from '../constants/sms-templates';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 渲染通知并落 tire-sms-log；同订单同类型当日去重。
     * 发送失败只记录 warn，不影响主流程。
     */
    enqueue(type: SmsTemplateType, order: any, extra?: any): Promise<any>;
    list(query?: any): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    update(id: number, payload?: any, operatorId?: number): Promise<any>;
};
export default _default;
