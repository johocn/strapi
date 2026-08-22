import { Core } from '@strapi/strapi';
type ResType = "lecturer" | "venue";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    LECTURER_UID: string;
    VENUE_UID: string;
    /**
     * 校验一组资源是否可用。
     * @param opts { start, end, excludeActivityId?, lecturerId?, venueId? }
     * @returns { ok: true } 或 { ok:false, conflicts: [...] }
     */
    check(opts: {
        start: Date | string;
        end: Date | string;
        excludeActivityId?: number;
        lecturerId?: number;
        venueId?: number;
    }): Promise<{
        ok: boolean;
        conflicts: any[];
    } | {
        ok: boolean;
        conflicts?: undefined;
    }>;
    /**
     * 为冲突资源返回接下来 N 个空闲建议时段（不含缓冲重叠；以目标时长 end-start 为基准）。
     * @returns Array<{ resourceId, resourceName, suggestStart, suggestEnd }>
     */
    suggest(opts: {
        type: ResType;
        resourceId: number;
        start: Date | string;
        end: Date | string;
        n?: number;
        excludeActivityId?: number;
    }): Promise<any[]>;
};
export default _default;
