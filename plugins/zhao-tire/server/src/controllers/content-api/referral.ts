import { sendError } from "../../utils/errors";

/** 公开预览邀请码是否有效，返回归属昵称/手机号掩码 */
export default {
  async preview(ctx: any) {
    try {
      const code = String(ctx.params?.code || "").trim().toUpperCase();
      if (!code || code.length !== 6) {
        ctx.status = 400;
        ctx.body = { code: "REFERRAL_CODE_INVALID", message: "邀请码格式错误" };
        return;
      }
      const referralService: any = strapi.plugin("zhao-tire").service("referral");
      const rc = await referralService.validate(code);
      const phone = String(rc.phone || "");
      const maskedPhone =
        phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
      ctx.body = {
        code: rc.code,
        nickname: rc.nickname || maskedPhone,
        phoneMasked: maskedPhone,
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
