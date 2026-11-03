import { Core } from '@strapi/strapi';
declare const runExpiryReminder: ({ strapi }: {
    strapi: Core.Strapi;
}) => Promise<number>;
export default runExpiryReminder;
