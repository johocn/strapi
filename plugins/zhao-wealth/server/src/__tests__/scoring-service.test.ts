'use strict';

describe('scoring-service 权重与标尺', () => {
  const pluginConfig = require('../config').default;

  it('config 含 money-wealth 权重（drawdown=0）与按类型波动率标尺', () => {
    expect(pluginConfig.scoreWeights['money-wealth']).toEqual({
      returns: 0.80, volatility: 0.20, drawdown: 0.00, peerRank: 0.00,
    });
    expect(pluginConfig.scoreScales.volatilityScaleByType['bank-wealth']).toBe(0.03);
    expect(pluginConfig.scoreScales.volatilityScaleByType['money-wealth']).toBe(0.02);
  });
});
