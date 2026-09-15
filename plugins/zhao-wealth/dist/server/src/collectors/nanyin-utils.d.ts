export declare const NANYIN_BASE_URL = "https://www.nanyinwealth.com";
export declare const PUBLIC_KEY_URL = "https://www.nanyinwealth.com/eportal/ui?moduleId=5&portal.url=/portlet/login-handle!publicKey.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2";
export declare const QUERY_NAV_URL = "https://www.nanyinwealth.com/eportal/ui?moduleId=5&portal.url=/portlet/article-data!queryNetValueList.portlet&TopModuelId=e7db4f2628cb40548f6101d71695ada2";
export declare const NAV_PAGE_URL: (productCode: string) => string;
export declare const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
/**
 * 获取服务器 RSA 公钥（归一化为 SPKI PEM 字符串）
 */
export declare function getServerPublicKey(): Promise<string>;
/**
 * 兼容解析 RSA 公钥为 SPKI PEM
 * 1. 直接作为 PEM（SPKI/PKCS1 头尾均可）
 * 2. 纯 base64 → 包 SPKI 头尾
 * 3. 纯 base64 → 包 PKCS1 头尾
 */
export declare function parsePublicKey(raw: string): string;
/**
 * 生成 16 位随机字母数字 AES key（与官网 aesUtil.genKey 一致：
 * [A-Za-z0-9] 随机 16 字符，UTF-8 字节长度恰为 16，满足 AES-128）
 */
export declare function generateAesKey(): string;
/**
 * AES-128-ECB-PKCS7 加密，输出 base64（ECB 无 IV）
 * key 为 16 字符字符串，按 UTF-8 字节作为密钥（与官网 CryptoJS.enc.Utf8.parse 一致）
 */
export declare function aesEncrypt(plainText: string, aesKey: string): string;
/**
 * AES-128-ECB-PKCS7 解密（base64 输入）
 */
export declare function aesDecrypt(cipherBase64: string, aesKey: string): string;
/**
 * RSA 公钥加密（PKCS1 v1.5 padding），输出 base64
 */
export declare function rsaEncrypt(aesKeyUtf8: string, publicKeyPem: string): string;
