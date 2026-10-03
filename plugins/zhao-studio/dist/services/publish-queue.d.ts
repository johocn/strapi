import type { Core } from '@strapi/strapi';
import { type PublishJobData } from '../utils/queue';
export declare const STAGES: {
    readonly VALIDATE: "validateContent";
    readonly ENSURE_TOKEN: "ensureOAuthToken";
    readonly ADAPT: "adaptContent";
    readonly PUBLISH: "publish";
    readonly CHECK_STATUS: "checkStatus";
    readonly FINALIZE: "finalize";
};
type Stage = typeof STAGES[keyof typeof STAGES];
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    enqueuePublish(data: PublishJobData): Promise<string | null>;
    registerProcessors(): void;
    runStage(stage: Stage, data: PublishJobData, prev: any): Promise<any>;
};
export default _default;
//# sourceMappingURL=publish-queue.d.ts.map