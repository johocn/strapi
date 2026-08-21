import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 按月聚合活动：
     * 1. 先对"有排期且 active"的系列做滚动惰性补齐（复用 series-service.generateSchedule，幂等，只填到 generateWeeks）；
     * 2. 按 startTime 落在该月（本地时区）过滤活动；
     * 3. includeAllStatus=true 返回全部状态（管理端），=false 仅 signup_open/ongoing（C端）；
     * 4. 按本地 YYYY-MM-DD 分组，返回 { days: [{ date, activities }] }；空月返回 days: []。
     */
    getCalendarMonth({ month, includeAllStatus }?: {
        month?: string;
        includeAllStatus?: boolean;
    }): Promise<{
        days: {
            date: string;
            activities: any[];
        }[];
    }>;
};
export default _default;
