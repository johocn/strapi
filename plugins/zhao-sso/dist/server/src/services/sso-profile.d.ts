import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** sso-user → up_user 反向桥接（按标识匹配；匹配不到返回 null） */
    resolveUpUserForSsoUser(ssoUserId: number): Promise<any>;
    /** 实时聚合六维画像（不落库） */
    calculateProfile(ssoUserId: number): Promise<{
        user: number;
        upUser: any;
        hasData: boolean;
        activity: number;
        reading: number;
        completion: number;
        attendance: number;
        payment: number;
        interests: any[];
    } | {
        activity: number;
        reading: number;
        completion: number;
        attendance: number;
        payment: number;
        interests: string[];
        user: number;
        upUser: any;
        hasData: boolean;
    }>;
    /** 兴趣标签：近30天 课程分类/文章分类/活动类型 频次 top3（跨来源同名合并） */
    collectInterests(userId: number): Promise<string[]>;
    /** 加权打分 + 分层 */
    segmentOf(profile: any): {
        segment: string;
        segmentScore: number;
        segmentReason: string;
    };
    /** 详情：实时聚合 + 打分 + 落库 sso-user-profile */
    getProfile(ssoUserId: number): Promise<{
        segment: string;
        segmentScore: number;
        segmentReason: string;
        user: number;
        upUser: any;
        hasData: boolean;
        activity: number;
        reading: number;
        completion: number;
        attendance: number;
        payment: number;
        interests: any[];
    } | {
        segment: string;
        segmentScore: number;
        segmentReason: string;
        activity: number;
        reading: number;
        completion: number;
        attendance: number;
        payment: number;
        interests: string[];
        user: number;
        upUser: any;
        hasData: boolean;
    }>;
    /** 批量重算：遍历 up_users → sso-user → getProfile */
    recalcAll(limit?: number): Promise<{
        scanned: any;
        calculated: number;
        matchedSso: number;
    }>;
};
export default _default;
