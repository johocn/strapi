'use strict';

/**
 * 南银理财采集器测试
 * 不写死真实加密 payload：测试内用真实 crypto 工具构造/解密加密响应与请求体
 */

jest.mock('../utils/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../playwright-manager', () => ({
  createPage: jest.fn(),
  closePage: jest.fn(),
}));

jest.mock('../collectors/nanyin-utils', () => {
  const actual = jest.requireActual('../collectors/nanyin-utils');
  const crypto = require('crypto');
  // 固定测试公钥（SPKI PEM）与固定 16 字节 AES key，便于解密请求体断言翻页
  const mockKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const mockPublicKeyPem = mockKeyPair.publicKey.export({ format: 'pem', type: 'spki' }).toString();
  return {
    ...actual,
    getServerPublicKey: jest.fn().mockResolvedValue(mockPublicKeyPem),
    generateAesKey: jest.fn().mockReturnValue(Buffer.from('0123456789abcdef', 'utf8')),
  };
});

import { httpClient } from '../utils/http-client';
import { createPage } from '../playwright-manager';
import { aesEncrypt, aesDecrypt } from '../collectors/nanyin-utils';
import NanyinCollector from '../collectors/nanyin-collector';

const KEY = Buffer.from('0123456789abcdef', 'utf8');
const collector = new NanyinCollector();

// 构造加密净值响应：{ data: { data: AES密文(aaData JSON) } }
const makeNavResponse = (aaData: any[], totalCount: number, currentPage: number) => ({
  data: {
    data: aesEncrypt(JSON.stringify({ aaData, totalCount, currentPage }), KEY),
  },
});

describe('nanyin-collector.collectNavData', () => {
  beforeEach(() => {
    (httpClient.post as jest.Mock).mockReset();
    (httpClient.get as jest.Mock).mockReset();
    (createPage as jest.Mock).mockReset();
  });

  it('成功：解密响应并映射为标准净值字段（accNav 缺省回退 unitNav）', async () => {
    (httpClient.post as jest.Mock).mockResolvedValueOnce(
      makeNavResponse(
        [
          { date: '2026-06-30', netValue: '1.016713', cumulativeNetValue: '1.016713' },
          { date: '2026/06/29', netValue: '1.016200' },
        ],
        2,
        1
      )
    );

    const result = await collector.collectNavData('z70026');

    // 按日期降序
    expect(result).toEqual([
      { navDate: '2026-06-30', unitNav: '1.016713', accNav: '1.016713', dataSource: 'crawler' },
      { navDate: '2026-06-29', unitNav: '1.016200', accNav: '1.016200', dataSource: 'crawler' },
    ]);

    // 请求体为双层加密：data 可解密出 productCode/currentPage，aesKey/timeStamp 已加密
    const [url, body, config] = (httpClient.post as jest.Mock).mock.calls[0];
    expect(url).toContain('queryNetValueList.portlet');
    const payload = JSON.parse(aesDecrypt(body.data, KEY));
    expect(payload).toEqual({ productCode: 'Z70026', startDate: '', endDate: '', currentPage: 1 });
    expect(body.aesKey).toBeTruthy();
    expect(body.timeStamp).toBeTruthy();
    expect(config.headers.Referer).toContain('/nanyinwealth/lccp/cpjz/index.html?id=Z70026');
    expect(config.headers.Origin).toBe('https://www.nanyinwealth.com');
    expect(config.headers['User-Agent']).toBeTruthy();
  });

  it('翻页：totalCount > 单页条数时请求第 2 页并合并结果', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-06-${String(30 - i).padStart(2, '0')}`,
      netValue: (1.01 + i / 100).toFixed(6),
    }));
    const page2 = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-06-${String(20 - i).padStart(2, '0')}`,
      netValue: (1.005 - i / 100).toFixed(6),
    }));

    (httpClient.post as jest.Mock).mockImplementation(async (url: string, body: any) => {
      const payload = JSON.parse(aesDecrypt(body.data, KEY));
      if (payload.currentPage === 1) return makeNavResponse(page1, 25, 1);
      return makeNavResponse(page2, 25, 2);
    });

    const result = await collector.collectNavData('Z70026');

    expect(httpClient.post).toHaveBeenCalledTimes(2);
    const pages = (httpClient.post as jest.Mock).mock.calls.map((c: any) =>
      JSON.parse(aesDecrypt(c[1].data, KEY)).currentPage
    );
    expect(pages).toEqual([1, 2]);
    expect(result.length).toBe(25);
    // 合并后按日期降序且全部唯一
    const dates = result.map((r: any) => r.navDate);
    expect(new Set(dates).size).toBe(25);
    expect(dates[0]).toBe('2026-06-30');
    expect(dates[24]).toBe('2026-06-06');
  });

  it('失败：httpClient 502 且 Playwright 兜底不可用 → 抛「改用中国理财网源」', async () => {
    (httpClient.post as jest.Mock).mockRejectedValue(new Error('HTTP 502 Bad Gateway — /eportal/ui?moduleId=5'));
    (createPage as jest.Mock).mockResolvedValue(null); // Playwright 兜底也失败

    await expect(collector.collectNavData('Z70026')).rejects.toThrow(
      '改用中国理财网源（登记编码 Z7003225000398）'
    );
    expect(createPage).toHaveBeenCalled(); // 确认走了 Playwright 兜底分支
  });

  it('失败：网络错误（非 4xx/5xx）不触发 Playwright 兜底，直接抛兜底错误', async () => {
    (httpClient.post as jest.Mock).mockRejectedValue(new Error('请求超时 (15000ms) — /eportal/ui'));

    await expect(collector.collectNavData('Z70026')).rejects.toThrow(
      '南银理财净值采集失败: 请求超时 (15000ms) — /eportal/ui 改用中国理财网源（登记编码 Z7003225000398）'
    );
    expect(createPage).not.toHaveBeenCalled();
  });

  it('失败：接口返回空数据 → 抛「改用中国理财网源」', async () => {
    (httpClient.post as jest.Mock).mockResolvedValueOnce(makeNavResponse([], 0, 1));

    await expect(collector.collectNavData('Z70026')).rejects.toThrow('改用中国理财网源（登记编码 Z7003225000398）');
  });
});
