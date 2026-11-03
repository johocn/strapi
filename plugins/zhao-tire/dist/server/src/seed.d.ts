import { Core } from '@strapi/strapi';
declare const seed: ({ strapi }: {
    strapi: Core.Strapi;
}) => Promise<void>;
export default seed;
