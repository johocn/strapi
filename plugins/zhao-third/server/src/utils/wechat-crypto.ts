import crypto from "crypto";

/**
 * 微信加密数据解密工具
 * 遵循微信官方加密数据解密算法
 * @see https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html
 */

export interface WechatDecryptedData {
  openId?: string;
  unionId?: string;
  nickName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  purePhoneNumber?: string;
  countryCode?: string;
  gender?: number;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  watermark?: {
    timestamp: number;
    appid: string;
  };
}

/**
 * 解密微信加密数据
 * 算法：
 * 1. 对 session_key 做 SHA256 得到 AES key（但微信实际用的是 Base64 解码 session_key 作为 key）
 * 2. Base64 解码 encryptedData 和 iv
 * 3. AES-128-CBC 解密，PKCS#7 去填充
 * 4. 验证 watermark 中的 appid
 */
export function decryptWechatData(
  sessionKey: string,
  encryptedData: string,
  iv: string,
  appId?: string,
): WechatDecryptedData {
  // Base64 解码
  const sessionKeyBuf = Buffer.from(sessionKey, "base64");
  const encryptedDataBuf = Buffer.from(encryptedData, "base64");
  const ivBuf = Buffer.from(iv, "base64");

  // AES-128-CBC 解密
  const decipher = crypto.createDecipheriv("aes-128-cbc", sessionKeyBuf, ivBuf);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([
    decipher.update(encryptedDataBuf),
    decipher.final(),
  ]);

  const decoded = JSON.parse(decrypted.toString("utf8"));

  // 验证 watermark
  if (appId && decoded.watermark?.appid !== appId) {
    throw new Error("水印验证失败：appid 不匹配");
  }

  return decoded;
}
