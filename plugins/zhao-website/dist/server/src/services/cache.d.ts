import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    get(key: string, ttl: number, generator: () => Promise<string>): Promise<string>;
    invalidate(key?: string): void;
};
export default _default;
