import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    send(opts: {
        action: string;
        ssoId?: string | number | null;
        targetId?: string | number | null;
        extra?: Record<string, unknown>;
    }): Promise<void>;
};
export default _default;
