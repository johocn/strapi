import { sendError } from "../../utils/errors";

export default {
  async find(ctx: any) {
    try {
      const user = ctx.state?.user || {};
      const roleCodes = (user.roles || [])
        .map((role: any) => String(role?.code || ""))
        .filter(Boolean);
      ctx.body = {
        data: {
          id: Number(user.id) || 0,
          roleCodes,
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
