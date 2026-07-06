import { z } from 'zod';
export declare const channelIdParam: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const tierTreeParam: z.ZodObject<{
    parentTier: z.ZodString;
}, z.core.$strip>;
export declare const channelCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    channelTier: z.ZodOptional<z.ZodString>;
    parentChannel: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        disabled: "disabled";
    }>>;
}, z.core.$strip>;
export declare const channelUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        disabled: "disabled";
    }>>;
    channelTier: z.ZodOptional<z.ZodString>;
    parentChannel: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const channelRootCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const registerSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    channelTier: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const validateCodeSchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export declare const memberInviteSchema: z.ZodObject<{
    channelId: z.ZodNumber;
    inviterId: z.ZodNumber;
    email: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        admin: "admin";
        owner: "owner";
        member: "member";
    }>>;
}, z.core.$strip>;
export declare const memberCreateSchema: z.ZodObject<{
    channel: z.ZodNumber;
    user: z.ZodNumber;
    role: z.ZodOptional<z.ZodEnum<{
        admin: "admin";
        owner: "owner";
        member: "member";
    }>>;
}, z.core.$strip>;
export declare const memberUpdateSchema: z.ZodObject<{
    role: z.ZodEnum<{
        admin: "admin";
        owner: "owner";
        member: "member";
    }>;
}, z.core.$strip>;
export declare const permissionCheckSchema: z.ZodObject<{
    userId: z.ZodNumber;
    channelId: z.ZodNumber;
}, z.core.$strip>;
export declare const batchGrantSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"user">;
    targetId: z.ZodNumber;
    channelIds: z.ZodArray<z.ZodNumber>;
    grantedBy: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"role">;
    targetId: z.ZodString;
    channelIds: z.ZodArray<z.ZodNumber>;
    grantedBy: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>]>;
export declare const useInviteSchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export declare const userIdQuerySchema: z.ZodObject<{
    userId: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare function validate<T>(schema: z.ZodSchema<T>, data: unknown): T;
export declare function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, ctx: any): T | null;
