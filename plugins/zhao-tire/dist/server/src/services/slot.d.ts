import { Core } from '@strapi/strapi';
export type SlotName = "morning" | "afternoon";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    remaining(date: string, slot: SlotName): Promise<number>;
    usage(date: string, slot: SlotName): Promise<{
        date: string;
        slot: SlotName;
        limit: number;
        used: number;
        remaining: number;
    }>;
    assertAvailable(date: string, slot: SlotName): Promise<{
        date: string;
        slot: SlotName;
        limit: number;
        used: number;
        remaining: number;
    }>;
};
export default _default;
