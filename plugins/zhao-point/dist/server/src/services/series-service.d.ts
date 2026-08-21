import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(params: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    delete(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    /**
     * 查询某系列的已发布可报名场次（signup_open / ongoing），按开始时间升序。
     * 系列不存在返回 null。
     */
    listActivities(seriesDocumentId: string): Promise<any[]>;
    /**
     * 复制活动为新草稿：保留基础信息与预解锁课时/文章，重置时间、名额与状态。
     */
    duplicate(activityDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 按系列排期(eachWeek: weekdays + time)批量生成日程草稿。
     * - 无排期或 weekdays 为空：返回 { generated: 0, reason: "no_schedule" }
     * - count 提供时：锚定"今天所在周的周一"往后逐周生成满 count 场即停止
     * - count 为空：滚动补齐到 generateWeeks 周
     * - 跳过过去场次、重复场次(查重 belongsToSeries+startTime 区间)
     */
    generateSchedule(seriesDocumentId: string, { count }?: {
        count?: number;
    }): Promise<{
        generated: number;
        reason: string;
    } | {
        generated: number;
        reason?: undefined;
    }>;
};
export default _default;
