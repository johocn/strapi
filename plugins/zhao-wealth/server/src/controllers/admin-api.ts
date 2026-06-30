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
});