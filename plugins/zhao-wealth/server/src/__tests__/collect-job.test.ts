'use strict';

function d(day: number): Date {
  return new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00Z`);
}

describe('collect-job.processNavData', () => {
  let mockStrapi: any;
  let navQuery: any;
  let snapshotQuery: any;
  let metricQuery: any;
  let incomeQuery: any;

  beforeEach(() => {
    navQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
    snapshotQuery = { delete: jest.fn() };
    metricQuery = { delete: jest.fn() };
    incomeQuery = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
          if (uid === 'plugin::zhao-wealth.wealth-annual-snapshot') return snapshotQuery;
          if (uid === 'plugin::zhao-wealth.wealth-risk-metric') return metricQuery;
          if (uid === 'plugin::zhao-wealth.wealth-money-income') return incomeQuery;
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

  it('新日期且带收益字段 → 净值 create + 收益 create', async () => {
    navQuery.findOne.mockResolvedValue(null);
    incomeQuery.findOne.mockResolvedValue(null);
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.0, accNav: 1.0, tenThousandIncome: '0.4876', sevenDayAnnualized: '0.0188', dataSource: 'crawler' },
    ]);

    expect(navQuery.create).toHaveBeenCalledTimes(1);
    expect(incomeQuery.create).toHaveBeenCalledTimes(1);
    expect(incomeQuery.create).toHaveBeenCalledWith({
      data: {
        product: 1,
        incomeDate: d(1),
        tenThousandIncome: 0.4876,
        sevenDayAnnual: 0.0188,
        dataSource: 'crawler',
      },
    });
    expect(result).toEqual({ insertCount: 1, updateCount: 0, updatedDates: [] });
  });

  it('同日期同净值但收益变化 → 净值跳过 + 收益 update', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.0, accNav: 1.0 });
    incomeQuery.findOne.mockResolvedValue({ id: 20 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.0, accNav: 1.0, tenThousandIncome: '0.5123', sevenDayAnnualized: '0.0199', dataSource: 'crawler' },
    ]);

    expect(navQuery.update).not.toHaveBeenCalled();
    expect(incomeQuery.create).not.toHaveBeenCalled();
    expect(incomeQuery.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: {
        incomeDate: d(1),
        tenThousandIncome: 0.5123,
        sevenDayAnnual: 0.0199,
        dataSource: 'crawler',
      },
    });
    expect(result).toEqual({ insertCount: 0, updateCount: 0, updatedDates: [] });
  });

  it('同日期不同净值且带收益 → 净值 update + 收益 update', async () => {
    navQuery.findOne.mockResolvedValue({ id: 10, unitNav: 1.0, accNav: 1.0 });
    incomeQuery.findOne.mockResolvedValue({ id: 20 });
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.02, accNav: 1.02, tenThousandIncome: '0.5123', sevenDayAnnualized: '0.0199', dataSource: 'crawler' },
    ]);

    expect(navQuery.update).toHaveBeenCalledTimes(1);
    expect(incomeQuery.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ insertCount: 0, updateCount: 1, updatedDates: [d(1)] });
  });

  it('无收益字段 → 不写 income 表', async () => {
    navQuery.findOne.mockResolvedValue(null);
    const processNavData = getProcessNavData();

    const result = await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.01, accNav: 1.01, dataSource: 'crawler' },
    ]);

    expect(incomeQuery.findOne).not.toHaveBeenCalled();
    expect(incomeQuery.create).not.toHaveBeenCalled();
    expect(incomeQuery.update).not.toHaveBeenCalled();
    expect(result).toEqual({ insertCount: 1, updateCount: 0, updatedDates: [] });
  });

  it('仅有一个收益字段 → 仍写 income，另一字段为 null', async () => {
    navQuery.findOne.mockResolvedValue(null);
    incomeQuery.findOne.mockResolvedValue(null);
    const processNavData = getProcessNavData();

    await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.0, tenThousandIncome: '0.4876', dataSource: 'crawler' },
    ]);

    expect(incomeQuery.create).toHaveBeenCalledWith({
      data: {
        product: 1,
        incomeDate: d(1),
        tenThousandIncome: 0.4876,
        sevenDayAnnual: null,
        dataSource: 'crawler',
      },
    });
  });

  it('annualYield：create 透传，update 覆盖，缺省保留原值', async () => {
    const processNavData = getProcessNavData();

    // create 路径：annualYield 随净值入库
    navQuery.findOne.mockResolvedValueOnce(null);
    await processNavData(mockStrapi, 1, [
      { navDate: d(1), unitNav: 1.01, accNav: 1.01, annualYield: 1.72, dataSource: 'crawler' },
    ]);
    expect(navQuery.create).toHaveBeenCalledWith({
      data: { product: 1, navDate: d(1), unitNav: 1.01, accNav: 1.01, annualYield: 1.72, dataSource: 'crawler' },
    });

    // update 路径：净值变化时 annualYield 一并覆盖
    navQuery.findOne.mockResolvedValueOnce({ id: 10, unitNav: 1.00, accNav: 1.00, dataSource: 'old' });
    await processNavData(mockStrapi, 1, [
      { navDate: d(2), unitNav: 1.02, accNav: 1.02, annualYield: 3.2, dataSource: 'crawler' },
    ]);
    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { unitNav: 1.02, accNav: 1.02, annualYield: 3.2, dataSource: 'crawler' },
    });

    // update 路径：annualYield 缺省保留原值
    navQuery.findOne.mockResolvedValueOnce({ id: 11, unitNav: 1.00, accNav: 1.00, annualYield: 1.5, dataSource: 'old' });
    await processNavData(mockStrapi, 1, [
      { navDate: d(3), unitNav: 1.02 },
    ]);
    expect(navQuery.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { unitNav: 1.02, accNav: 1.00, annualYield: 1.5, dataSource: 'old' },
    });
  });
});

describe('collect-job.collect-single 队列触发', () => {
  let handler: any;
  let calculateQueue: any;
  let configQuery: any;
  let navQuery: any;
  let mockStrapi: any;

  beforeEach(() => {
    jest.resetModules();
    calculateQueue = { add: jest.fn() };
    const collectQueue = {
      process: jest.fn((name: string, fn: any) => {
        if (name === 'collect-single') handler = fn;
      }),
    };
    jest.doMock('../jobs/queue-setup', () => ({
      getCollectQueue: jest.fn(() => collectQueue),
      getCalculateQueue: jest.fn(() => calculateQueue),
    }));
    jest.doMock('../collectors', () => ({
      getCollector: jest.fn(() => ({
        collectNavData: jest.fn().mockResolvedValue([]),
      })),
    }));
    jest.doMock('../utils', () => ({
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    }));

    configQuery = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        collectStatus: 'idle',
        failCount: 0,
        product: { id: 5, productCode: 'P001', saleCode: 'S001', company: { shortName: 'test' } },
      }),
      update: jest.fn(),
    };
    navQuery = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn() };
    mockStrapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'plugin::zhao-wealth.wealth-collect-config') return configQuery;
          if (uid === 'plugin::zhao-wealth.wealth-nav') return navQuery;
          throw new Error(`unexpected uid: ${uid}`);
        }),
      },
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
  });

  it('采集成功后只触发 recalculate-risk-metric-product，不再触发 recalculate-product', async () => {
    require('../jobs/collect-job').registerCollectJobs(mockStrapi);
    await handler({ data: { productId: 5 } });

    expect(calculateQueue.add).toHaveBeenCalledTimes(1);
    expect(calculateQueue.add).toHaveBeenCalledWith('recalculate-risk-metric-product', { productId: 5 });
  });
});
