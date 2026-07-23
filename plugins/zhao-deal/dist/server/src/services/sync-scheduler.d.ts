import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    shouldRunNow(platformCode: string, syncCron: string): Promise<boolean>;
    getLastRun(platformCode: string): Promise<Date | null>;
    /**
     * 扫描所有 syncEnabled + syncMode in ['scheduled','both'] 的平台，
     * 对到期的平台触发优惠券 + 产品同步（候选机制，结果进入 pending 等待人工审核）
     */
    run(): Promise<{
        processed: number;
    }>;
};
export default _default;
