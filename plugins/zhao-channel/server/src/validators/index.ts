import { z } from "zod";

const positiveInt = z.number().int().positive();

export const channelIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const tierTreeParam = z.object({
  parentTier: z.string().min(1),
});

export const channelCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  channelTier: z.string().optional(),
  parentChannel: positiveInt.optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const channelUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  channelTier: z.string().optional(),
  parentChannel: positiveInt.optional(),
});

export const channelRootCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const registerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  email: z.string().email().optional(),
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(6).max(128).optional(),
  channelTier: z.string().optional(),
});

export const validateCodeSchema = z.object({
  code: z.string().min(1),
});

export const memberInviteSchema = z.object({
  channelId: positiveInt,
  inviterId: positiveInt,
  email: z.string().email(),
  role: z.enum(["member", "admin", "owner"]).optional(),
});

export const memberCreateSchema = z.object({
  channel: positiveInt,
  user: positiveInt,
  role: z.enum(["member", "admin", "owner"]).optional(),
});

export const memberUpdateSchema = z.object({
  role: z.enum(["member", "admin", "owner"]),
});

export const permissionCheckSchema = z.object({
  userId: positiveInt,
  channelId: positiveInt,
});

export const batchGrantSchema = z.union([
  z.object({
    type: z.literal("user"),
    targetId: positiveInt,
    channelIds: z.array(positiveInt).min(1),
    grantedBy: positiveInt.optional(),
  }),
  z.object({
    type: z.literal("role"),
    targetId: z.string().min(1),
    channelIds: z.array(positiveInt).min(1),
    grantedBy: positiveInt.optional(),
  }),
]);

export const useInviteSchema = z.object({
  code: z.string().min(1),
});

export const userIdQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, ctx: any): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = { error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") };
    return null;
  }
  return result.data as T;
}
