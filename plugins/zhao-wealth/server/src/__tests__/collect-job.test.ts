'use strict';

function d(day: number): Date {
  return new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('collect-job.processNavData', () => {
  let mockStrapi: any;
  let navQuery: any;
  let snapshotQuery: any;
  let metricQuery: any;

  beforeEach(() => {
    navQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
    snapshotQuery = { delete: jest.fn() };
    metricQuery = { delete: jest.fn() };
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
          if (uid === 'plugin::zhao-wealth.wealth-annual-snapshot') return snapshotQuery;
          if (uid === 'plugin::zhao-wealth.wealth-risk-metric') return metricQuery;
          throw new Error(`unexpected uid: ${uid}`);
        }),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  function getProcessNavData() {
    return require('../jobs/collect-job').processNavData;
  }

  it('新日期 → create 插入，insertCount 累加', async () => {
    navQuery.findOne.mockResolvedValue(null);
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.01, accNav: 1.01, dataSource: 'crawler' },
      { navDate: d(2), unitNav: 1.02, accNav: 1.02, dataSource: 'crawler' },
    ]);

    expect(navQuery.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ insertCount: 2, updateCount: 0, updatedDates: [] });
  });

  it('同日期同净值 → 跳过，不 create 不 update', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: '1.01', accNav: '1.01', dataSource: 'crawler' },
    ]);

    expect(navQuery.create).not.toHaveBeenCalled();
    expect(navQuery.update).not.toHaveBeenCalled();
    expect(result).toEqual({ insertCount: 0, updateCount: 0, updatedDates: [] });
  });

  it('同日期不同净值 → update 覆盖净值字段，updateCount 累加并记录日期', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01, dataSource: 'old' });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03, accNav: 1.03, dataSource: 'crawler' },
    ]);

    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { unitNav: 1.03, accNav: 1.03, dataSource: 'crawler' },
    });
    expect(navQuery.create).not.toHaveBeenCalled();
    expect(result).toEqual({ insertCount: 0, updateCount: 1, updatedDates: [d(1)] });
  });

  it('更新时 accNav/dataSource 缺省则保留原值', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.01, accNav: 1.01, dataSource: 'old' });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03 },
    ]);

    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { unitNav: 1.03, accNav: 1.01, dataSource: 'old' },
    });
    expect(result.updateCount).toBe(1);
  });

  it('返回的 updatedDates 可直接用于删除同日快照与指标', async () => {
    navQuery.findOne.mockResolvedValueOnce({ id: 10, unitNav: 1.01, accNav: 1.01 })
      .mockResolvedValueOnce({ id: 11, unitNav: 1.02, accNav: 1.02 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.03 },
      { navDate: d(2), unitNav: 1.05 },
    ]);

    for (const dateStr of result.updatedDates) {
      await snapshotQuery.delete({ where: { product: 1, snapshotDate: dateStr } });
      await metricQuery.delete({ where: { product: 1, snapshotDate: dateStr } });
    }
    expect(snapshotQuery.delete).toHaveBeenCalledTimes(2);
    expect(metricQuery.delete).toHaveBeenCalledTimes(2);
  });
});
