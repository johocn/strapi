'use strict';

import { successResponse, paginatedResponse, errorResponse } from '../utils';

export default ({ strapi }) => ({
  // ===== 公司管理 =====
  async companiesList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const companies = await strapi.db.query('plugin::zhao-wealth.wealth-company').findMany({
        limit,
        offset,
        orderBy: { createdAt: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-company').count();

      ctx.body = paginatedResponse(companies, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async companyDetail(ctx) {
    try {
      const { id } = ctx.params;
      const company = await strapi.db.query('plugin::zhao-wealth.wealth-company').findOne({
        where: { id: Number(id) },
      });

      if (!company) {
        ctx.body = errorResponse(404, '公司不存在');
        return;
      }

      ctx.body = successResponse(company);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async companyCreate(ctx) {
    try {
      const data = ctx.request.body;
      const company = await strapi.db.query('plugin::zhao-wealth.wealth-company').create({ data });

      ctx.body = successResponse(company, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  async companyUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const company = await strapi.db.query('plugin::zhao-wealth.wealth-company').update({
        where: { id: Number(id) },
        data,
      });

      ctx.body = successResponse(company, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  async companyDelete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.db.query('plugin::zhao-wealth.wealth-company').delete({
        where: { id: Number(id) },
      });

      ctx.body = successResponse(null, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司删除失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  // ===== 产品管理 =====
  async productsList(ctx) {
    try {
      const { page = 1, pageSize = 100, productType, riskLevel } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const filters: any = {};
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;

      const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
        where: filters,
        limit,
        offset,
        orderBy: { createdAt: 'desc' },
        populate: ['company'],
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-product').count({ where: filters });

      ctx.body = paginatedResponse(products, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async productDetail(ctx) {
    try {
      const { id } = ctx.params;
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { id: Number(id) },
        populate: ['company'],
      });

      if (!product) {
        ctx.body = errorResponse(404, '产品不存在');
        return;
      }

      // 获取最新净值
      const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: Number(id) },
        orderBy: { navDate: 'desc' },
      });

      ctx.body = successResponse({ ...product, latestNav });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async productCreate(ctx) {
    try {
      const data = ctx.request.body;
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').create({ data });

      // 自动创建采集配置
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').create({
        data: {
          product: product.id,
          collectMethod: 'web-crawler',
          collectStatus: 'pending',
        },
      });

      ctx.body = successResponse(product, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  async productUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').update({
        where: { id: Number(id) },
        data,
      });

      ctx.body = successResponse(product, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  async productDelete(ctx) {
    try {
      const { id } = ctx.params;

      // 删除关联数据
      await strapi.db.query('plugin::zhao-wealth.wealth-nav').deleteMany({ where: { product: Number(id) } });
      await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').deleteMany({ where: { product: Number(id) } });
      await strapi.db.query('plugin::zhao-wealth.wealth-yearly-return').deleteMany({ where: { product: Number(id) } });
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').delete({ where: { product: Number(id) } });
      await strapi.db.query('plugin::zhao-wealth.wealth-product').delete({ where: { id: Number(id) } });

      ctx.body = successResponse(null, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品删除失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  // ===== 采集配置 =====
  async collectConfigsList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const configs = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').findMany({
        limit,
        offset,
        populate: ['product'],
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count();

      ctx.body = paginatedResponse(configs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集配置列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async collectConfigUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const config = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').update({
        where: { id: Number(id) },
        data,
      });

      ctx.body = successResponse(config, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集配置更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  // ===== 净值管理 =====
  async navDataList(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 100, startDate, endDate } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const filters: any = { product: Number(id) };
      if (startDate && endDate) {
        filters.navDate = { $gte: startDate, $lte: endDate };
      }

      const navs = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findMany({
        where: filters,
        limit,
        offset,
        orderBy: { navDate: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-nav').count({ where: filters });

      ctx.body = paginatedResponse(navs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async navDataCreate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      // 检查是否已存在
      const existing = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: Number(id), navDate: data.navDate },
      });

      if (existing) {
        ctx.body = errorResponse(400, '该日期净值已存在');
        return;
      }

      const nav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').create({
        data: { ...data, product: Number(id) },
      });

      ctx.body = successResponse(nav, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  async navDataUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const nav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').update({
        where: { id: Number(id) },
        data,
      });

      ctx.body = successResponse(nav, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  // ===== 推荐配置 =====
  async recommendConfigsList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const configs = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').findMany({
        limit,
        offset,
        populate: ['product'],
        orderBy: { recommendOrder: 'asc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').count();

      ctx.body = paginatedResponse(configs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async recommendConfigCreate(ctx) {
    try {
      const data = ctx.request.body;

      // 检查是否已存在
      const existing = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').findOne({
        where: { product: data.product },
      });

      if (existing) {
        ctx.body = errorResponse(400, '该产品已有推荐配置');
        return;
      }

      const config = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').create({ data });

      ctx.body = successResponse(config, '创建成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置创建失败: ${error.message}`);
      ctx.body = errorResponse(500, '创建失败');
    }
  },

  async recommendConfigUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const config = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').update({
        where: { id: Number(id) },
        data,
      });

      ctx.body = successResponse(config, '更新成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置更新失败: ${error.message}`);
      ctx.body = errorResponse(500, '更新失败');
    }
  },

  async recommendConfigDelete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').delete({
        where: { id: Number(id) },
      });

      ctx.body = successResponse(null, '删除成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置删除失败: ${error.message}`);
      ctx.body = errorResponse(500, '删除失败');
    }
  },

  // ===== 客户自选 =====
  async customerProductsList(ctx) {
    try {
      const { page = 1, pageSize = 100, channelId } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset = (page - 1) * limit;

      const filters: any = {};
      if (channelId) filters.channel = Number(channelId);

      const customerProducts = await strapi.db.query('plugin::zhao-wealth.wealth-customer-product').findMany({
        where: filters,
        limit,
        offset,
        populate: ['user', 'product', 'channel'],
        orderBy: { followTime: 'desc' },
      });

      const total = await strapi.db.query('plugin::zhao-wealth.wealth-customer-product').count({ where: filters });

      ctx.body = paginatedResponse(customerProducts, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 客户自选列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  // ===== 统计 =====
  async stats(ctx) {
    try {
      const productCount = await strapi.db.query('plugin::zhao-wealth.wealth-product').count();
      const companyCount = await strapi.db.query('plugin::zhao-wealth.wealth-company').count();
      const collectPending = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'pending' } });
      const collectSuccess = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'success' } });
      const collectFailed = await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').count({ where: { collectStatus: 'failed' } });

      ctx.body = successResponse({
        productCount,
        companyCount,
        collectPending,
        collectSuccess,
        collectFailed,
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 统计查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  // ===== 仪表盘聚合（新）=====
  async statsOverview(ctx) {
    try {
      const result = await strapi.plugin('zhao-wealth').service('stats').getOverview();
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 概览统计失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  async statsAnomalies(ctx) {
    try {
      const { limit = 10 } = ctx.query;
      const result = await strapi.plugin('zhao-wealth').service('stats').getAnomalies(Number(limit));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 异常列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, '查询失败');
    }
  },

  // ===== 采集与校验 =====
  async collect(ctx) {
    try {
      const { source, query } = ctx.request.body;

      if (!source || !query) {
        ctx.body = errorResponse(400, '缺少 source 或 query 参数');
        return;
      }

      const { getCollector, getChinawealthCollector } = require('../collectors/collector-factory');

      // 1. 从数据源采集
      const collector = getCollector(source);
      if (!collector) {
        ctx.body = errorResponse(400, `不支持的数据源: ${source}`);
        return;
      }

      const sourceData = await collector.collectProductInfo(query);
      if (!sourceData) {
        ctx.body = errorResponse(404, '未找到匹配产品');
        return;
      }

      // 2. 用登记编码查询中国理财网校验
      let officialData = null;
      let verification: any = { status: 'no_register_code', matchScore: 0, differences: [] };

      if (sourceData.registerCode) {
        try {
          const cwCollector = getChinawealthCollector();
          officialData = await cwCollector.collectByRegisterCode(sourceData.registerCode);

          if (officialData) {
            verification = this.compareData(sourceData, officialData);
          } else {
            verification = { status: 'not_found_on_official', matchScore: 0, differences: [] };
          }
        } catch (error) {
          strapi.log.warn(`[zhao-wealth] 中国理财网校验失败: ${error.message}`);
          verification = { status: 'verification_failed', matchScore: 0, differences: [], error: error.message };
        }
      }

      ctx.body = successResponse({
        sourceData,
        officialData,
        verification,
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集失败: ${error.message}`);
      ctx.body = errorResponse(500, `采集失败: ${error.message}`);
    }
  },

  async collectConfirm(ctx) {
    try {
      const data = ctx.request.body;

      // 检查产品代码是否已存在
      const existing = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
        where: { productCode: data.productCode },
      });

      if (existing) {
        ctx.body = errorResponse(400, `产品代码 ${data.productCode} 已存在`);
        return;
      }

      // 创建产品
      const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').create({
        data: {
          productCode: data.productCode,
          productName: data.productName,
          productType: data.productType,
          registerCode: data.registerCode || null,
          riskLevel: data.riskLevel || 'R2',
          termType: data.termType || null,
          issueDate: data.issueDate || null,
          maturityDate: data.maturityDate || null,
          benchmark: data.benchmark || null,
          remark: data.remark || null,
          company: data.company || null,
          recommendEnabled: data.recommendEnabled ?? false,
          status: data.status ?? true,
        },
      });

      // 自动创建采集配置
      await strapi.db.query('plugin::zhao-wealth.wealth-collect-config').create({
        data: {
          product: product.id,
          collectMethod: 'web-crawler',
          collectStatus: 'pending',
        },
      });

      ctx.body = successResponse(product, '采集入库成功');
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集入库失败: ${error.message}`);
      ctx.body = errorResponse(500, `入库失败: ${error.message}`);
    }
  },

  /**
   * 对比双源数据，返回差异列表
   */
  compareData(sourceData: any, officialData: any) {
    const differences: Array<{
      field: string;
      sourceValue: string;
      officialValue: string;
      severity: 'info' | 'warning' | 'error';
      description: string;
    }> = [];

    // 产品名称：包含关系
    if (sourceData.productName && officialData.productName) {
      if (!officialData.productName.includes(sourceData.productName) && !sourceData.productName.includes(officialData.productName)) {
        differences.push({
          field: 'productName',
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: 'warning',
          description: '产品名称差异较大，请确认是否为同一产品',
        });
      } else if (sourceData.productName !== officialData.productName) {
        differences.push({
          field: 'productName',
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: 'info',
          description: '官网简称 vs 理财网全称',
        });
      }
    }

    // 登记编码：精确匹配
    if (sourceData.registerCode && officialData.registerCode && sourceData.registerCode !== officialData.registerCode) {
      differences.push({
        field: 'registerCode',
        sourceValue: sourceData.registerCode,
        officialValue: officialData.registerCode,
        severity: 'error',
        description: '登记编码不匹配，请确认是否为同一产品',
      });
    }

    // 风险等级
    if (sourceData.riskLevel && officialData.riskLevel && sourceData.riskLevel !== officialData.riskLevel) {
      differences.push({
        field: 'riskLevel',
        sourceValue: sourceData.riskLevelRaw || sourceData.riskLevel,
        officialValue: officialData.riskLevelRaw || officialData.riskLevel,
        severity: 'warning',
        description: '风险等级不一致',
      });
    }

    // 期限类型
    if (sourceData.termType && officialData.termType && sourceData.termType !== officialData.termType) {
      differences.push({
        field: 'termType',
        sourceValue: sourceData.termTypeRaw || sourceData.termType,
        officialValue: officialData.termTypeRaw || officialData.termType,
        severity: 'info',
        description: '期限类型表述不同',
      });
    }

    // 产品类型
    if (sourceData.productType && officialData.productType && sourceData.productType !== officialData.productType) {
      differences.push({
        field: 'productType',
        sourceValue: sourceData.productTypeRaw || sourceData.productType,
        officialValue: officialData.productTypeRaw || officialData.productType,
        severity: 'warning',
        description: '投资性质不一致',
      });
    }

    const matchScore = differences.length === 0 ? 1.0 : differences.some(d => d.severity === 'error') ? 0.3 : 0.8;
    const status = matchScore === 1.0 ? 'full_match' : matchScore >= 0.8 ? 'partial_match' : 'mismatch';

    return { status, matchScore, differences };
  },
});