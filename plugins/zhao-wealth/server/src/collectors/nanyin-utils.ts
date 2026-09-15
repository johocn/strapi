'use strict';

import crypto from 'crypto';
import { httpClient } from '../utils/http-client';

// ===== URL 常量 =====
export const NANYIN_BASE_URL = 'https://www.nanyinwealth.com';

// 公钥接口：返回 RSA 公钥（格式不定，兼容解析见 parsePublicKey）
export const PUBLIC_KEY_URL = `${NANYIN_BASE_URL}/eportal/ui?moduleId=5&portal.url=/portlet/login-handle!publicKey.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2`;

// 净值查询接口：RSA/AES 双层加密，请求体与响应 data.data 均加密
export const QUERY_NAV_URL = `${NANYIN_BASE_URL}/eportal/ui?moduleId=5&portal.url=/portlet/article-data!queryNetValueList.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2`;

// 净值页 URL（Referer / Playwright 会话页）
export const NAV_PAGE_URL = (productCode: string): string =>
  `${NANYIN_BASE_URL}/nanyinwealth/lccp/cpjz/index.html?id=${productCode}`;

// ===== 请求头常量 =====
export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

/**
 * 获取服务器 RSA 公钥（归一化为 SPKI PEM 字符串）
 */
export async function getServerPublicKey(): Promise<string> {
  const resp = await httpClient.get(PUBLIC_KEY_URL, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Origin': NANYIN_BASE_URL,
      'Referer': `${NANYIN_BASE_URL}/nanyinwealth/lccp/cpjz/index.html`,
    },
  });
  return parsePublicKey(extractRawKey(resp.data));
}

/**
 * 从接口响应中提取公钥原始字符串（兼容纯字符串 / 对象包装）
 */
function extractRawKey(data: any): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    for (const key of ['data', 'key', 'publicKey', 'public_key', 'result', 'content']) {
      if (typeof data[key] === 'string' && data[key].trim()) return data[key];
    }
  }
  return JSON.stringify(data);
}

/**
 * 兼容解析 RSA 公钥为 SPKI PEM
 * 1. 直接作为 PEM（SPKI/PKCS1 头尾均可）
 * 2. 纯 base64 → 包 SPKI 头尾
 * 3. 纯 base64 → 包 PKCS1 头尾
 */
export function parsePublicKey(raw: string): string {
  const trimmed = (raw || '').trim().replace(/^["']|["']$/g, '');
  if (!trimmed) throw new Error('公钥为空');

  // 1. 完整 PEM（含 BEGIN 头尾）
  if (trimmed.includes('BEGIN')) {
    try {
      return crypto.createPublicKey(trimmed).export({ format: 'pem', type: 'spki' }).toString();
    } catch { /* 落到 base64 分支重试 */ }
  }

  // 2. 纯 base64：包 SPKI 头尾（RSA 2048 密钥约 392 字节，无需换行）
  const b64 = trimmed.replace(/\s+/g, '');
  try {
    const pem = `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
    return crypto.createPublicKey(pem).export({ format: 'pem', type: 'spki' }).toString();
  } catch { /* 尝试 PKCS1 */ }

  // 3. 纯 base64：包 PKCS1 头尾
  try {
    const pem = `-----BEGIN RSA PUBLIC KEY-----\n${b64}\n-----END RSA PUBLIC KEY-----`;
    return crypto.createPublicKey(pem).export({ format: 'pem', type: 'spki' }).toString();
  } catch { /* 全部失败 */ }

  throw new Error('无法解析 RSA 公钥（已尝试 PEM/SPKI/PKCS1）');
}

/**
 * 生成 16 位随机字母数字 AES key（与官网 aesUtil.genKey 一致：
 * [A-Za-z0-9] 随机 16 字符，UTF-8 字节长度恰为 16，满足 AES-128）
 */
export function generateAesKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * AES-128-ECB-PKCS7 加密，输出 base64（ECB 无 IV）
 * key 为 16 字符字符串，按 UTF-8 字节作为密钥（与官网 CryptoJS.enc.Utf8.parse 一致）
 */
export function aesEncrypt(plainText: string, aesKey: string): string {
  const key = Buffer.from(aesKey, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]).toString('base64');
}

/**
 * AES-128-ECB-PKCS7 解密（base64 输入）
 */
export function aesDecrypt(cipherBase64: string, aesKey: string): string {
  const key = Buffer.from(aesKey, 'utf8');
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  return Buffer.concat([
    decipher.update(Buffer.from(cipherBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * RSA 公钥加密（PKCS1 v1.5 padding），输出 base64
 */
export function rsaEncrypt(aesKeyUtf8: string, publicKeyPem: string): string {
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(aesKeyUtf8, 'utf8')
  ).toString('base64');
}
