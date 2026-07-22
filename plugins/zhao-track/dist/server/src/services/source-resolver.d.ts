import { Core } from '@strapi/strapi';
export interface IdentifyOpts {
    sourceTagId?: string;
    utm?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
    };
    deviceFingerprint?: string;
    fullUrl?: string;
    referer?: string;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    identify(opts: IdentifyOpts): Promise<{
        tag: import('@strapi/types/dist/modules/documents').AnyDocument;
        isNew: boolean;
    }>;
};
export default _default;
