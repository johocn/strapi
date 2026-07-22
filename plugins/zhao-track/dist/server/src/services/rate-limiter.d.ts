import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    checkAndRecord(deviceFingerprint: string, couponId: string): Promise<{
        allowed: boolean;
    }>;
    _resetMemory(): void;
};
export default _default;
