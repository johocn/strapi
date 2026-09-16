'use strict';

const mockCalculateQueue = { process: jest.fn() };

jest.mock('../jobs/queue-setup', () => ({
  getCalculateQueue: jest.fn(() => mockCalculateQueue),
  getRecalculateQueue: jest.fn(() => null),
}));

describe('risk-metric-job.calculate-risk-metric', () => {
  const recalculateMissing = jest.fn();
  const calculateAndSaveMetrics = jest.fn();

  function getStrapi() {
    return {
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      service: jest.fn((uid: string) => {
        if (uid === 'plugin::zhao-wealth.nav-calculator') return { recalculateMissing };
        if (uid === 'plugin::zhao-wealth.risk-metric-service') return { calculateAndSaveMetrics };
        throw new Error(`unexpected service: ${uid}`);
      }),
    };
  }

  function getHandler() {
    const { registerRiskMetricJobs } = require('../jobs/risk-metric-job');
    registerRiskMetricJobs(getStrapi());
    const call = mockCalculateQueue.process.mock.calls.find(
      ([name]: [string, any]) => name === 'calculate-risk-metric'
    );
    if (!call) throw new Error('calculate-risk-metric handler 未注册');
    return call[1];
  }

  beforeEach(() => {
    jest.resetModules();
    mockCalculateQueue.process.mockReset();
    recalculateMissing.mockReset().mockResolvedValue(undefined);
    calculateAndSaveMetrics.mockReset().mockResolvedValue(undefined);
  });

  it('先补当日年化快照（nav-calculator.recalculateMissing），再算风险指标', async () => {
    const handler = getHandler();
    await handler({ data: { productId: 7, snapshotDate: '2026-09-16' } });

    expect(recalculateMissing).toHaveBeenCalledWith(7);
    expect(calculateAndSaveMetrics).toHaveBeenCalledWith(7, new Date('2026-09-16'));
    expect(recalculateMissing.mock.invocationCallOrder[0]).toBeLessThan(
      calculateAndSaveMetrics.mock.invocationCallOrder[0]
    );
  });

  it('snapshotDate 缺省时按当前日期计算', async () => {
    const handler = getHandler();
    await handler({ data: { productId: 7 } });

    expect(recalculateMissing).toHaveBeenCalledWith(7);
    const [, date] = calculateAndSaveMetrics.mock.calls[0];
    expect(date).toBeInstanceOf(Date);
  });
});
