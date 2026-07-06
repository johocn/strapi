import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    dashboard(ctx: any): Promise<void>;
    listUsers(ctx: any): Promise<void>;
    getUser(ctx: any): Promise<void>;
    updateUser(ctx: any): Promise<void>;
    listApps(ctx: any): Promise<void>;
    createApp(ctx: any): Promise<void>;
    updateApp(ctx: any): Promise<void>;
    listChannels(ctx: any): Promise<void>;
    createChannel(ctx: any): Promise<void>;
    updateChannel(ctx: any): Promise<void>;
    listLoginLogs(ctx: any): Promise<void>;
    channelReport(ctx: any): Promise<void>;
};
export default _default;
