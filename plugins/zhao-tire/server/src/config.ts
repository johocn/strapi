import { env } from "@strapi/utils";

export default {
  default: {
    timezone: env("TIRE_TIMEZONE", "Asia/Shanghai"),
    smsProvider: env("SMS_PROVIDER", "queue"),
  },
};
