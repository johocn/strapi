'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

const BASE_URL = 'https://www.cbhbwm.com.cn';

// 风险等级映射
const RISK_MAP: Record<string, string> = {
  '低风险': 'R1',
  '中低风险': 'R2',
  '中风险': 'R3',
  '中高风险': 'R4',
  '高风险': 'R5',
};

// 期限类型映射
const TERM_MAP: Record<string, string> = {
  '3-6个月': 'short',
  '6-12个月': 'medium',
  '1-3年': 'long',
  '3年以上': 'long',
};

export default class CbhbCollector extends BaseCollector {
  /**
   * 通过销售编码采集渤银理财产品详情
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      // 访问详情页
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`, {
        waitUntil: 'domcontentloaded',
      });

      // 等待产品信息加载
      await page.waitForSelector('.product-detail, .detail-info, .pro-detail', { timeout: 10000 }).catch(() => {});

      // 提取产品信息 - 渤银官网详情页结构
      const productInfo = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el ? el.textContent?.trim() || '' : '';
        };

        // 尝试多种选择器适配官网结构
        const name = getText('.product-title, .pro-name, .detail-title, h2');
        const registerCode = getText('.register-code, .reg-code, .pro-code').replace('登记编号：', '').replace('登记编号:', '');
        const riskText = getText('.risk-type, .risk-level, .pro-risk');
        const termText = getText('.term-type, .pro-term, .invest-period');
        const issueDate = getText('.issue-date, .start-date, .raise-start');
        const maturityDate = getText('.maturity-date, .end-date, .raise-end');
        const benchmark = getText('.benchmark, .pro-benchmark, .performance-benchmark, .yield-benchmark');

        return { name, registerCode, riskText, termText, issueDate, maturityDate, benchmark };
      });

      // 如果详情页无数据，尝试列表页搜索
      if (!productInfo.name) {
        return await this.collectFromListPage(productCode);
      }

      return {
        productCode,
        productName: productInfo.name,
        registerCode: productInfo.registerCode,
        riskLevel: this.parseRiskLevel(productInfo.riskText),
        riskLevelRaw: productInfo.riskText,
        termType: this.parseTermType(productInfo.termText),
        termTypeRaw: productInfo.termText,
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: productInfo.issueDate,
        maturityDate: productInfo.maturityDate,
        benchmark: productInfo.benchmark,
        company: '渤银理财',
      };
    } catch (error) {
      throw new Error(`渤银官网采集失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 从列表页搜索产品
   */
  private async collectFromListPage(productCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    try {
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/qbcp/index.html`, {
        waitUntil: 'domcontentloaded',
      });

      // 等待列表加载
      await page.waitForSelector('.product-item, .pro-item, .list-item', { timeout: 10000 }).catch(() => {});

      // 在列表中查找匹配产品
      const found = await page.evaluate((code) => {
        const items = document.querySelectorAll('.product-item, .pro-item, .list-item, tr');
        for (const item of items) {
          const text = item.textContent || '';
          if (text.includes(code)) {
            return text.trim();
          }
        }
        return '';
      }, productCode);

      if (!found) {
        return null;
      }

      // 返回基本信息，详情需通过详情页补充
      return {
        productCode,
        productName: '',
        registerCode: '',
        riskLevel: 'R2',
        riskLevelRaw: '',
        termType: 'medium',
        termTypeRaw: '',
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: '',
        maturityDate: '',
        benchmark: '',
        company: '渤银理财',
        _listMatch: found,
      };
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值数据（占位，当前不实现）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    return [];
  }

  private parseRiskLevel(text: string): string {
    for (const [key, value] of Object.entries(RISK_MAP)) {
      if (text.includes(key)) return value;
    }
    return 'R2';
  }

  private parseTermType(text: string): string {
    for (const [key, value] of Object.entries(TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    // 根据到期日计算
    return 'medium';
  }
}
