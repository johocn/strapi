'use strict';

import crypto from 'crypto';
import { aesEncrypt, aesDecrypt, rsaEncrypt, parsePublicKey } from '../collectors/nanyin-utils';

// 固定 16 字符 AES key（与官网 aesUtil.genKey 生成的 key 格式一致）
const KEY = '0123456789abcdef';

describe('nanyin-utils AES-128-ECB', () => {
  it('固定 key 加密后解密还原', () => {
    const cipher = aesEncrypt('hello', KEY);
    expect(cipher).not.toBe('hello');
    expect(aesDecrypt(cipher, KEY)).toBe('hello');
  });

  it('固定向量断言（Node crypto 预计算: plaintext="hello", key="0123456789abcdef"）', () => {
    // 期望密文由 node crypto 预计算得到: Z0x+8454yr2c7JwSWCOmOQ==
    expect(aesEncrypt('hello', KEY)).toBe('Z0x+8454yr2c7JwSWCOmOQ==');
  });

  it('中英文长文本加解密还原', () => {
    const text = '南银理财增瑞财富牛净值数据 Z70026 2026Q2'.repeat(8);
    expect(aesDecrypt(aesEncrypt(text, KEY), KEY)).toBe(text);
  });
});

/**
 * 验证 RSA-PKCS1 v1.5 加密结果（仅测试用）
 * 本机 Node(v22.16.0/OpenSSL3.0.16) 定制构建禁用了 privateDecrypt 的 PKCS1 填充，
 * 故用 RSA_NO_PADDING 解出原始块后手工剥离 PKCS1 v1.5 填充（00 02 PS 00 M）
 */
const decryptPkcs1v15 = (privateKey: crypto.KeyObject, cipherBase64: string): string => {
  const raw = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_NO_PADDING },
    Buffer.from(cipherBase64, 'base64')
  );
  const msgStart = raw.indexOf(0, 2); // PS 全非零，第一个 0x00 即分隔符
  if (msgStart < 0) throw new Error('PKCS1 v1.5 填充格式非法');
  return raw.slice(msgStart + 1).toString('utf8');
};

describe('nanyin-utils RSA', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spkiPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
  const pkcs1Pem = publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();

  it('SPKI PEM 公钥加密后私钥可还原', () => {
    const aesKey = '0123456789abcdef'; // 16 字符 AES key
    expect(decryptPkcs1v15(privateKey, rsaEncrypt(aesKey, spkiPem))).toBe(aesKey);
  });

  it('PKCS1 PEM 公钥加密后私钥可还原', () => {
    const aesKey = 'abcdef0123456789';
    expect(decryptPkcs1v15(privateKey, rsaEncrypt(aesKey, pkcs1Pem))).toBe(aesKey);
  });
});

describe('nanyin-utils parsePublicKey', () => {
  const gen = () => crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  const roundTrip = (pem: string, privateKey: crypto.KeyObject, keyText: string) => {
    expect(decryptPkcs1v15(privateKey, rsaEncrypt(keyText, pem))).toBe(keyText);
  };

  it('完整 SPKI PEM 解析成功', () => {
    const { publicKey, privateKey } = gen();
    const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    roundTrip(parsePublicKey(pem), privateKey, 'spki-pem-key');
  });

  it('完整 PKCS1 PEM 解析成功', () => {
    const { publicKey, privateKey } = gen();
    const pem = publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    roundTrip(parsePublicKey(pem), privateKey, 'pkcs1-pem-key');
  });

  it('纯 base64（SPKI 无头尾）解析成功', () => {
    const { publicKey, privateKey } = gen();
    const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    roundTrip(parsePublicKey(b64), privateKey, 'raw-spki-base64');
  });

  it('纯 base64（PKCS1 无头尾）解析成功（走 PKCS1 包裹回退）', () => {
    const { publicKey, privateKey } = gen();
    const pem = publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    roundTrip(parsePublicKey(b64), privateKey, 'raw-pkcs1-base64');
  });

  it('非法公钥抛错', () => {
    expect(() => parsePublicKey('not-a-key')).toThrow('无法解析 RSA 公钥');
  });
});
