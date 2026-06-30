'use strict';

export default {
  'wealth-company': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_companies',
      info: {
        singularName: 'wealth-company',
        pluralName: 'wealth-companies',
        displayName: '理财公司',
        description: '银行理财公司信息管理'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        name: { type: 'string', required: true },
        shortName: { type: 'string' },
        companyType: { type: 'enumeration', enum: ['bank', 'bank-subsidiary'], default: 'bank-subsidiary' },
        website: { type: 'string' },
        products: { type: 'relation', relation: 'oneToMany', target: 'plugin::zhao-wealth.wealth-product', mappedBy: 'company' },
        status: { type: 'boolean', default: true },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-product': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_products',
      info: {
        singularName: 'wealth-product',
        pluralName: 'wealth-products',
        displayName: '理财产品',
        description: '理财/基金产品信息'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        productCode: { type: 'string', unique: true, required: true },
        productName: { type: 'string', required: true },
        productType: { type: 'enumeration', enum: ['bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund'], required: true },
        registerCode: { type: 'string', unique: true },
        riskLevel: { type: 'enumeration', enum: ['R1', 'R2', 'R3', 'R4', 'R5'], default: 'R2' },
        termType: { type: 'enumeration', enum: ['short', 'medium', 'long'] },
        issueDate: { type: 'date' },
        maturityDate: { type: 'date' },
        company: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-company', inversedBy: 'products' },
        navs: { type: 'relation', relation: 'oneToMany', target: 'plugin::zhao-wealth.wealth-nav', mappedBy: 'product' },
        moneyIncomes: { type: 'relation', relation: 'oneToMany', target: 'plugin::zhao-wealth.wealth-money-income', mappedBy: 'product' },
        annualSnapshots: { type: 'relation', relation: 'oneToMany', target: 'plugin::zhao-wealth.wealth-annual-snapshot', mappedBy: 'product' },
        yearlyReturns: { type: 'relation', relation: 'oneToMany', target: 'plugin::zhao-wealth.wealth-yearly-return', mappedBy: 'product' },
        recommendWeight: { type: 'integer', default: 0 },
        recommendTags: { type: 'json' },
        status: { type: 'boolean', default: true },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-collect-config': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_collect_configs',
      info: {
        singularName: 'wealth-collect-config',
        pluralName: 'wealth-collect-configs',
        displayName: '采集配置',
        description: '产品数据采集配置'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'oneToOne', target: 'plugin::zhao-wealth.wealth-product' },
        collectMethod: { type: 'enumeration', enum: ['web-crawler', 'zip-pdf', 'manual', 'api'], default: 'web-crawler' },
        collectUrl: { type: 'string' },
        collectRules: { type: 'json' },
        collectStatus: { type: 'enumeration', enum: ['pending', 'success', 'failed'], default: 'pending' },
        lastCollectTime: { type: 'datetime' },
        failCount: { type: 'integer', default: 0 },
        failReason: { type: 'text' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-nav': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_navs',
      info: {
        singularName: 'wealth-nav',
        pluralName: 'wealth-navs',
        displayName: '净值数据',
        description: '理财/基金净值数据（不含货币基金）'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-product', inversedBy: 'navs' },
        navDate: { type: 'date', required: true },
        unitNav: { type: 'decimal', precision: 10, scale: 4 },
        accNav: { type: 'decimal', precision: 10, scale: 4 },
        dataSource: { type: 'enumeration', enum: ['crawler', 'manual'], default: 'crawler' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-money-income': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_money_incomes',
      info: {
        singularName: 'wealth-money-income',
        pluralName: 'wealth-money-incomes',
        displayName: '货币基金收益',
        description: '货币基金万份收益数据'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-product', inversedBy: 'moneyIncomes' },
        incomeDate: { type: 'date', required: true },
        tenThousandIncome: { type: 'decimal', precision: 10, scale: 6 },
        sevenDayAnnual: { type: 'decimal', precision: 10, scale: 4 },
        dataSource: { type: 'enumeration', enum: ['crawler', 'manual'], default: 'crawler' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-annual-snapshot': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_annual_snapshots',
      info: {
        singularName: 'wealth-annual-snapshot',
        pluralName: 'wealth-annual-snapshots',
        displayName: '年化快照',
        description: '各周期年化收益快照'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-product', inversedBy: 'annualSnapshots' },
        snapshotDate: { type: 'date', required: true },
        annual1d: { type: 'decimal', precision: 10, scale: 6 },
        annual3d: { type: 'decimal', precision: 10, scale: 6 },
        annual7d: { type: 'decimal', precision: 10, scale: 6 },
        annual2w: { type: 'decimal', precision: 10, scale: 6 },
        annual1m: { type: 'decimal', precision: 10, scale: 6 },
        annual3m: { type: 'decimal', precision: 10, scale: 6 },
        annual6m: { type: 'decimal', precision: 10, scale: 6 },
        annual1y: { type: 'decimal', precision: 10, scale: 6 },
        isEstimate: { type: 'boolean', default: false },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-yearly-return': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_yearly_returns',
      info: {
        singularName: 'wealth-yearly-return',
        pluralName: 'wealth-yearly-returns',
        displayName: '年度收益',
        description: '历年年度收益统计'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-product', inversedBy: 'yearlyReturns' },
        year: { type: 'integer', required: true },
        annualReturn: { type: 'decimal', precision: 10, scale: 6 },
        baseDays: { type: 'integer' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-customer-product': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_customer_products',
      info: {
        singularName: 'wealth-customer-product',
        pluralName: 'wealth-customer-products',
        displayName: '客户自选产品',
        description: '客户关注的产品列表'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        user: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
        product: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-wealth.wealth-product' },
        channel: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-channel.channel' },
        followTime: { type: 'datetime' },
        sortOrder: { type: 'integer', default: 0 },
        remark: { type: 'string' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  },
  'wealth-recommend-config': {
    schema: {
      kind: 'collectionType',
      collectionName: 'wealth_recommend_configs',
      info: {
        singularName: 'wealth-recommend-config',
        pluralName: 'wealth-recommend-configs',
        displayName: '推荐配置',
        description: '手动推荐产品配置'
      },
      options: {
        draftAndPublish: false
      },
      attributes: {
        product: { type: 'relation', relation: 'oneToOne', target: 'plugin::zhao-wealth.wealth-product' },
        channel: { type: 'relation', relation: 'manyToOne', target: 'plugin::zhao-channel.channel' },
        recommendOrder: { type: 'integer', default: 0 },
        recommendReason: { type: 'text' },
        status: { type: 'boolean', default: true },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' }
      }
    }
  }
};