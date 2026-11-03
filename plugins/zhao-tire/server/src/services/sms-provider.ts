import type { Core } from "@strapi/strapi";
import { createHmac, randomUUID } from "crypto";

const ALIYUN_ENDPOINT = "https://dysmsapi.aliyuncs.com/";

export type SmsPayload = { phone: string; content: string };

export type SmsResult = {
  provider: "queue" | "aliyun";
  queued?: boolean;
  sent?: boolean;
  error?: string;
};

const percentEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");

const readAliyunEnv = () => ({
  accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || "",
  signName: process.env.ALIYUN_SMS_SIGN_NAME || "",
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || "",
});

const getProviderName = (strapi: Core.Strapi): string => {
  let provider = "";
  try {
    const pluginConfig: any = strapi.config.get("plugin::zhao-tire") || {};
    provider = String(pluginConfig.smsProvider || "");
  } catch {
    // 插件配置未加载时回退环境变量
  }
  return (provider || process.env.SMS_PROVIDER || "queue").toLowerCase();
};

/**
 * 阿里云短信（RPC 风格签名，无需引入 SDK）
 * TODO: 阿里云控制台模板需定义一个名为 content 的变量，
 * 发送时 TemplateParam 传入 { content: <渲染后的文案> }。
 */
const sendByAliyun = async (
  strapi: Core.Strapi,
  { phone, content }: SmsPayload
): Promise<SmsResult> => {
  const { accessKeyId, accessKeySecret, signName, templateCode } =
    readAliyunEnv();

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    strapi.log.warn(
      "[zhao-tire] ALIYUN_SMS_* 环境变量不完整，降级为待发队列"
    );
    return { provider: "queue", queued: true };
  }

  const fetchFn = (globalThis as any).fetch;
  if (typeof fetchFn !== "function") {
    strapi.log.warn("[zhao-tire] 当前 Node 运行时不支持 fetch，降级为待发队列");
    return { provider: "queue", queued: true };
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ content }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };

  const canonicalQuery = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(
    canonicalQuery
  )}`;
  const signature = createHmac("sha1", `${accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
  const body = `${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const response = await fetchFn(ALIYUN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload: any = await response.json();
    if (payload?.Code !== "OK") {
      throw new Error(
        `阿里云短信发送失败：${payload?.Code || response.status} ${
          payload?.Message || ""
        }`
      );
    }
    return { provider: "aliyun", sent: true };
  } catch (error: any) {
    strapi.log.warn(`[zhao-tire] 阿里云短信发送失败，保留待发队列：${error}`);
    return {
      provider: "aliyun",
      queued: true,
      error: String(error?.message || error),
    };
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async send(payload: SmsPayload): Promise<SmsResult> {
    if (!payload || !payload.phone) {
      return { provider: "queue", queued: true, error: "缺少手机号" };
    }
    const provider = getProviderName(strapi);
    if (provider === "aliyun") {
      return sendByAliyun(strapi, payload);
    }
    return { provider: "queue", queued: true };
  },

  providerName(): string {
    return getProviderName(strapi);
  },
});
