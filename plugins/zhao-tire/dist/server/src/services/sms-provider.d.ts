import { Core } from '@strapi/strapi';
export type SmsPayload = {
    phone: string;
    content: string;
};
export type SmsResult = {
    provider: "queue" | "aliyun";
    queued?: boolean;
    sent?: boolean;
    error?: string;
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    send(payload: SmsPayload): Promise<SmsResult>;
    providerName(): string;
};
export default _default;
