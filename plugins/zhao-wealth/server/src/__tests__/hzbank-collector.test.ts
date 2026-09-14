'use strict';

/**
 * 杭银采集器产品类型映射测试
 * 覆盖：leixing=活钱管理 → money-wealth（优先于 touzileixin）；
 *      无活钱管理时按 touzileixin 映射（固定收益类 → bank-wealth 回归）
 */

jest.mock('../utils/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { httpClient } from '../utils/http-client';
import HzbankCollector from '../collectors/hzbank-collector';

const MOCK_DETAIL = {
  contenttitle: '幸福99金钱包测试款',
  dengjino: 'Z7002226000246',
  rizengzhang: '低风险',
  touzileixin: '固定收益类',
  leixing: '活钱管理',
  yunzuomoshi: '开放式',
  licaiqixian: '每日开放',
  chengliriqi: '2026-08-27',
  jieshuriqi: '2099-12-31',
  danweijingzhi: '1.0',
  leijijingzhi: '1.0',
};

describe('hzbank-collector.collectProductInfo', () => {
  const collector = new HzbankCollector();

  beforeEach(() => {
    (httpClient.get as jest.Mock).mockReset();
  });

  it('leixing=活钱管理 → productType=money-wealth（即使 touzileixin=固定收益类）', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({ data: MOCK_DETAIL });
    const result = await collector.collectProductInfo('JQB2673J');
    expect(result.productType).toBe('money-wealth');
  });

  it('无活钱管理字段时按 touzileixin 映射（回归：固定收益类 → bank-wealth）', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({
      data: { ...MOCK_DETAIL, leixing: '固定收益' },
    });
    const result = await collector.collectProductInfo('JQB2668J');
    expect(result.productType).toBe('bank-wealth');
  });
});
