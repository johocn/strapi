import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    shouldRunNow: (platformCode: string, syncCron: string) => Promise<boolean>;
    run(): Promise<{
        processed: number;
    }>;
};
export default _default;
