'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

const CHINAWEALTH_URL = 'https://www.chinawealth.com.cn';

// 理财网风险等级映射
const CW_RISK_MAP: Record<string, string> = {
  '一级(低)': 'R1',
  '二级(中低)': 'R2',
  '三级(中)': 'R3',
  '四级(中高)': 'R4',
  '五级(高)': 'R5',
};

// 理财网期限类型映射
const CW_TERM_MAP: Record<string, string> = {
  '3-6个月(含)': 'short',
  '6-12个月(含)': 'medium',
  '1-3年(含)': 'long',
  '3年以上': 'long',
  'T+0': 'short',
  'T+1': 'short',
};

// 理财网投资性质映射
const CW_TYPE_MAP: Record<string, string> = {
  '固定收益类': 'bank-wealth',
  '权益类': 'stock-fund',
  '混合类': 'mixed-fund',
  '商品及金融衍生品类': 'mixed-fund',
};

export default class ChinawealthCollector extends BaseCollector {
  /**
   * 通过登记编码查询中国理财网
   */
  async collectByRegisterCode(registerCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      // 1. 访问中国理财网首页
      await page.goto(`${CHINAWEALTH_URL}/zzlc/jrcpxx/jrcp.shtml`, {
        waitUntil: 'domcontentloaded',
      });

      // 2. 等待页面加载
      await page.waitForTimeout(2000);

      // 3. 找到搜索输入框并输入登记编码
      // 中国理财网使用 Element UI (el-input__inner)
      const inputSelector = 'input.el-input__inner, input[placeholder*="登记编码"], input[placeholder*="产品名称"]';
      await page.waitForSelector(inputSelector, { timeout: 10000 });

      // 清空输入框并逐字输入（触发 Vue 响应式）
      const input = await page.$(inputSelector);
      if (input) {
        await input.click({ clickCount: 3 });
        await input.fill('');
        await input.type(registerCode, { delay: 50 });
      }

      // 4. 点击搜索按钮
      const searchBtn = await page.$('button.el-button--primary, .search-btn, button:has-text("查询")');
      if (searchBtn) {
        await searchBtn.click();
      }

      // 5. 等待结果加载
      await page.waitForTimeout(3000);

      // 6. 从结果列表中提取第一条数据
      const result = await page.evaluate(() => {
        const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr, .result-item, .product-list-item');
        if (rows.length === 0) return null;

        // 取第一行
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('td, .cell');
        const texts = Array.from(cells as NodeListOf<Element>).map(cell => cell.textContent?.trim() || '');

        return {
          rawTexts: texts,
          rowCount: rows.length,
        };
      });

      if (!result || result.rowCount === 0) {
        return null;
      }

      // 7. 点击第一条结果查看详情
      const firstRow = await page.$('.el-table__body-wrapper tbody tr:first-child, .result-item:first-child');
      if (firstRow) {
        await firstRow.click();
        await page.waitForTimeout(2000);
      }

      // 8. 从详情页提取结构化数据
      const detail = await page.evaluate(() => {
        const getText = (label: string) => {
          // 尝试多种结构查找标签对应的值
          const allCells = document.querySelectorAll('td, .el-descriptions__cell, .info-item');
          for (const cell of allCells) {
            const text = cell.textContent?.trim() || '';
            if (text.startsWith(label)) {
              return text.replace(label, '').replace('：', '').replace(':', '').trim();
            }
          }
          return '';
        };

        return {
          productName: getText('产品名称') || getText('产品全称'),
          registerCode: getText('登记编码') || getText('产品编码'),
          riskLevel: getText('风险等级'),
          termType: getText('产品期限') || getText('投资期限'),
          investmentType: getText('投资性质') || getText('投资类型'),
          productStatus: getText('产品状态'),
          operationMode: getText('运作模式') || getText('运作方式'),
          companyName: getText('发行机构') || getText('管理机构'),
        };
      });

      return {
        productName: detail.productName,
        registerCode: detail.registerCode || registerCode,
        riskLevel: this.parseRiskLevel(detail.riskLevel),
        riskLevelRaw: detail.riskLevel,
        termType: this.parseTermType(detail.termType),
        termTypeRaw: detail.termType,
        productType: this.parseProductType(detail.investmentType),
        productTypeRaw: detail.investmentType,
        companyName: detail.companyName,
        productStatus: detail.productStatus,
        operationMode: detail.operationMode,
      };
    } catch (error) {
      throw new Error(`中国理财网查询失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集产品信息（兼容 BaseCollector 接口）
   */
  async collectProductInfo(productCode: string): Promise<any> {
    return this.collectByRegisterCode(productCode);
  }

  /**
   * 采集净值数据（占位）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    return [];
  }

  private parseRiskLevel(text: string): string {
    for (const [key, value] of Object.entries(CW_RISK_MAP)) {
      if (text.includes(key)) return value;
    }
    // 尝试直接匹配 R1-R5
    const match = text.match(/R(\d)/);
    if (match) return `R${match[1]}`;
    return 'R2';
  }

  private parseTermType(text: string): string {
    for (const [key, value] of Object.entries(CW_TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'medium';
  }

  private parseProductType(text: string): string {
    for (const [key, value] of Object.entries(CW_TYPE_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'bank-wealth';
  }
}
