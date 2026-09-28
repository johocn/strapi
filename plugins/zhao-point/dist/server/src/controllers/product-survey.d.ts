import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    myVote(ctx: any): Promise<void>;
    submitVote(ctx: any): Promise<void>;
    board(ctx: any): Promise<void>;
};
export default _default;
