import type { Core } from "@strapi/strapi";
import crypto from "crypto";

const CODE_UID = "plugin::zhao-sso.sso-sms-code";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
    /**
     * 发送验证码
     * - SMS_PROVIDER=mock(默认):固定 1234,仅写入 DB
     * - SMS_PROVIDER=aliyun/tencent:预留接口,未对接真实 SDK
     */
    async sendCode(mobile: string, scene: string = "login", ip?: string) {
      if (!/^1[3-9]\d{9}$/.test(mobile)) {
        throwErr("SSO_SMS_001", 400, "手机号格式不正确");
      }

      const provider = process.env.SMS_PROVIDER || "mock";
      const ttlMinutes = 5;
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      // 生成 6 位验证码(mock 模式固定 1234)
      const code = provider === "mock" ? "1234" : crypto.randomInt(100000, 999999).toString();

      // 写入 DB
      await strapi.db.query(CODE_UID).create({
        data: { mobile, code, scene, expires_at: expiresAt, used: false, ip: ip || null, provider },
      });

      // 预留 SMS 发送接口(mock 模式跳过)
      if (provider !== "mock") {
        strapi.log.warn(`[zhao-sso] SMS provider=${provider} 未对接真实 SDK,验证码 ${code} 仅写入 DB`);
        // TODO: 对接阿里云/腾讯云 SMS SDK
        // await this.sendViaAliyun(mobile, code, scene);
      } else {
        strapi.log.info(`[zhao-sso] Mock SMS code sent to ${mobile}: ${code}`);
      }

      return { sent: true, provider, ttlMinutes };
    },

    /**
     * 校验验证码(校验成功后标记 used=true)
     */
    async verifyCode(mobile: string, code: string, scene: string = "login"): Promise<boolean> {
      const record = await strapi.db.query(CODE_UID).findOne({
        where: { mobile, code, scene, used: false },
        orderBy: { id: "DESC" },
      });

      if (!record) throwErr("SSO_SMS_002", 400, "验证码错误");
      if (new Date(record.expires_at) < new Date()) throwErr("SSO_SMS_003", 400, "验证码已过期");

      await strapi.db.query(CODE_UID).update({
        where: { id: record.id },
        data: { used: true },
      });

      return true;
    },

    /**
     * 预留:阿里云 SMS 发送接口
     */
    async sendViaAliyun(_mobile: string, _code: string, _scene: string) {
      throwErr("SSO_SMS_004", 501, "阿里云 SMS 未实现");
    },

    /**
     * 预留:腾讯云 SMS 发送接口
     */
    async sendViaTencent(_mobile: string, _code: string, _scene: string) {
      throwErr("SSO_SMS_005", 501, "腾讯云 SMS 未实现");
    },
  };
};
