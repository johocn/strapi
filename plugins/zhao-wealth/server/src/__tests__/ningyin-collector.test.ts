'use strict';

/**
 * 宁银理财采集器测试
 * mock playwright-manager 的 createPage/closePage，用假 page 控制 goto/evaluate
 */

jest.mock('../playwright-manager', () => ({
  createPage: jest.fn(),
  closePage: jest.fn(),
}));

jest.mock('../collectors/chinawealth-collector');

import { createPage } from '../playwright-manager';
import ChinawealthCollector from '../collectors/chinawealth-collector';
import NingyinCollector from '../collectors/ningyin-collector';

const collector = new NingyinCollector();

// 官网 funddaytable 原始行
const row = (cdate: number, netvalue: string, totalnetvalue: string, incomeratio?: string) => ({
  cdate,
  netvalue,
  totalnetvalue,
  ...(incomeratio != null ? { incomeratio } : {}),
});

describe('ningyin-collector.collectNavData', () => {
  let mockGoto: jest.Mock;
  let mockEvaluate: jest.Mock;
  let mockCwCollectNav: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoto = jest.fn().mockResolvedValue(undefined);
    mockEvaluate = jest.fn();
    (createPage as jest.Mock).mockResolvedValue({ goto: mockGoto, evaluate: mockEvaluate });
    mockCwCollectNav = jest.fn();
    (ChinawealthCollector as unknown as jest.Mock).mockImplementation(() => ({
      collectNavData: mockCwCollectNav,
    }));
  });

  it('成功：funddaytable 映射为标准净值字段（含 annualYield），按日期降序', async () => {
    mockEvaluate.mockResolvedValue([
      row(1789315200000, '1.01092900', '1.01092900', '1.72'),
      row(1788969600000, '1.01073200', '1.01073200', '1.73'),
    ]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(mockGoto).toHaveBeenCalledWith(
      'https://www.wmbnb.com/product/productdetails/index.html?projectcode=ZGN2660096E',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    expect(result).toEqual([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', annualYield: '1.72', dataSource: 'crawler' },
      { navDate: '2026-09-10', unitNav: '1.01073200', accNav: '1.01073200', annualYield: '1.73', dataSource: 'crawler' },
    ]);
  });

  it('翻页：首页非空、次页为空时停止（evaluate 恰好调用 2 次）', async () => {
    mockEvaluate
      .mockResolvedValueOnce([row(1789315200000, '1.01092900', '1.01092900', '1.72')])
      .mockResolvedValueOnce([]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(mockEvaluate).toHaveBeenCalledTimes(2);
    expect(result.length).toBe(1);
  });

  it('过滤：无日期或净值全空的记录被剔除', async () => {
    mockEvaluate.mockResolvedValue([
      row(1789315200000, '1.01092900', '1.01092900', '1.72'),
      { netvalue: '1.2' },          // 无 cdate → 过滤
      { cdate: 1788969600000 },     // 净值全空 → 过滤
    ]);

    const result = await collector.collectNavData('ZGN2660096E');

    expect(result.length).toBe(1);
    expect(result[0].navDate).toBe('2026-09-14');
  });

  it('兜底：主源异常（evaluate 抛错）→ 调用中国理财网采集器', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));
    mockCwCollectNav.mockResolvedValue([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', dataSource: 'crawler' },
    ]);

    const result = await collector.collectNavData('ZGN2660096E', { registerCode: 'Z7002126000109' });

    expect(mockCwCollectNav).toHaveBeenCalledWith('ZGN2660096E', { registerCode: 'Z7002126000109' });
    expect(result).toEqual([
      { navDate: '2026-09-14', unitNav: '1.01092900', accNav: '1.01092900', dataSource: 'crawler' },
    ]);
  });

  it('兜底为空：中国理财网也未取到净值 → 抛错', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));
    mockCwCollectNav.mockResolvedValue([]);

    await expect(
      collector.collectNavData('ZGN2660096E', { registerCode: 'Z7002126000109' })
    ).rejects.toThrow('宁银理财净值采集失败: HTTP 403 改用中国理财网源（登记编码 Z7002126000109）也未获取到净值');
  });

  it('无登记编码：主源失败时抛「无法走中国理财网兜底」', async () => {
    mockEvaluate.mockRejectedValue(new Error('HTTP 403'));

    await expect(collector.collectNavData('ZGN2660096E')).rejects.toThrow(
      '宁银理财净值采集失败: HTTP 403（无登记编码，无法走中国理财网兜底）'
    );
    expect(mockCwCollectNav).not.toHaveBeenCalled();
  });
});

describe('ningyin-collector.collectProductInfo', () => {
  let mockGoto: jest.Mock;
  let mockEvaluate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoto = jest.fn().mockResolvedValue(undefined);
    mockEvaluate = jest.fn();
    (createPage as jest.Mock).mockResolvedValue({ goto: mockGoto, evaluate: mockEvaluate });
  });

  it('成功：list.json 映射产品信息', async () => {
    mockEvaluate.mockResolvedValue({
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E',
      registerCode: 'Z7002126000109',
      riskLevel: '中低风险',
      riskLevelRaw: '中低风险',
      productType: 'bank-wealth',
      company: '宁银理财',
      issueDate: '2026-05-20',
    });

    const info = await collector.collectProductInfo('ZGN2660096E');

    expect(mockGoto).toHaveBeenCalledWith(
      'https://www.wmbnb.com/product/productdetails/index.html?projectcode=ZGN2660096E',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    expect(info).toEqual({
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E',
      registerCode: 'Z7002126000109',
      riskLevel: '中低风险',
      riskLevelRaw: '中低风险',
      productType: 'bank-wealth',
      company: '宁银理财',
      issueDate: '2026-05-20',
    });
  });

  it('失败：evaluate 返回 null → 返回 null', async () => {
    mockEvaluate.mockResolvedValue(null);

    expect(await collector.collectProductInfo('ZGN2660096E')).toBeNull();
  });
});
