import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    registerSchedulers(): Promise<void>;
    closeWorker(): Promise<void>;
    scanAndTriggerSchedules(): Promise<void>;
    refreshExpiringTokens(): Promise<void>;
};
export default _default;
//# sourceMappingURL=scheduler.d.ts.map