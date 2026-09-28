import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** roundKey 格式校验：不符合 ^\d{4}-W\d{2}$ 抛 400 */
    assertRoundKey(roundKey: any): string;
    /**
     * 归一化并校验 votes：非法项整体 400（附明确文案）；同 productId 重复提交保留首项。
     * 返回 [{ productId, productName, variantIds, collectionLabel }]
     */
    normalizeVotes(votes: any): Array<{
        productId: string;
        productName: string | null;
        variantIds: string[] | null;
        collectionLabel: string | null;
    }>;
    /** 回显用户「本渠道 + 本周期」已勾选与自由输入，供 C 端进页面预勾选 */
    getMyVote({ channel, roundKey, userId }: {
        channel: string;
        roundKey: string;
        userId: number;
    }): Promise<{
        channel: string;
        roundKey: string;
        votes: {
            productId: any;
            productName: any;
            variantIds: any;
            collectionLabel: any;
        }[];
        freeInput: any;
    }>;
    /**
     * 快照式覆盖提交：事务内 upsert 列表内商品、删除本渠道+本周期+本用户不在列表中的旧票；
     * freeInput 为空删除需求行，非空 upsert。返回提交后的回显。
     */
    submit({ channel, roundKey, userId, source, votes, freeInput }: {
        channel: string;
        roundKey: string;
        userId: number;
        source?: string | null;
        votes: any;
        freeInput?: any;
    }): Promise<{
        channel: string;
        roundKey: string;
        votes: {
            productId: any;
            productName: any;
            variantIds: any;
            collectionLabel: any;
        }[];
        freeInput: any;
    }>;
    /**
     * 榜单聚合（纯查询不落库）。
     * channelIds 为 scope 收窄后的渠道 string 列表（null 表示不按 scope 收窄）；channel 显式指定时优先。
     */
    getBoard({ channel, roundKey, source, channelIds }: {
        channel?: string;
        roundKey: string;
        source?: string;
        channelIds?: string[] | null;
    }): Promise<{
        summary: {
            participants: number;
            votes: number;
            products: number;
        };
        rows: {
            productId: string;
            productName: string;
            collectionLabel: string;
            voterCount: number;
            ratio: number;
            variantBreakdown: {
                variantId: string;
                count: number;
            }[];
            rank: number;
        }[];
        demands: {
            userLabel: string;
            text: any;
            createdAt: any;
        }[];
    }>;
};
export default _default;
