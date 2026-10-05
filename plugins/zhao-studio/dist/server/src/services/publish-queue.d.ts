import { Core } from '../../../../../node_modules/@strapi/strapi';
import { PublishJobData, ContentType } from '../utils/queue';
export declare const STAGES: {
    readonly VALIDATE: "validateContent";
    readonly ENSURE_TOKEN: "ensureOAuthToken";
    readonly ADAPT: "adaptContent";
    readonly PUBLISH: "publish";
    readonly CHECK_STATUS: "checkStatus";
    readonly FINALIZE: "finalize";
};
type Stage = typeof STAGES[keyof typeof STAGES];
/** 从 publish-record 三列推断 contentType */
export declare function inferContentTypeFromRecord(record: any): ContentType;
/** 构建幂等查询过滤条件：按 contentType 选对应的关系列 */
export declare function buildIdempotentFilter(contentType: ContentType, contentDocumentId: string, accountDocumentId: string): {
    [x: string]: {
        documentId: string;
        $in?: undefined;
        $gte?: undefined;
    } | {
        $in: string[];
        documentId?: undefined;
        $gte?: undefined;
    } | {
        $gte: string;
        documentId?: undefined;
        $in?: undefined;
    };
    account: {
        documentId: string;
    };
    status: {
        $in: string[];
    };
    createdAt: {
        $gte: string;
    };
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    enqueuePublish(data: PublishJobData): Promise<string | null>;
    registerProcessors(): void;
    closeWorker(): Promise<void>;
    runStage(stage: Stage, data: PublishJobData, prev: any): Promise<any>;
};
export default _default;
//# sourceMappingURL=publish-queue.d.ts.map