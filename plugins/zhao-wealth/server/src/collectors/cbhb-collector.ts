'use strict';

import axios from 'axios';
import * as cheerio from 'cheerio';
import BaseCollector from './base-collector';

const BASE_URL = 'https://www.cbhbwm.com.cn';

export default class CbhbCollector extends BaseCollector {
  /**
   * 采集渤银理财产品列表
   */
  async collectProductList(): Promise<string[]> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/qbcp/index.html`);
      const $ = cheerio.load(response.data);

      const productCodes: string[] = [];

      $('.product-item').each((_, el) => {
        const link = $(el).find('a').attr('href');
        if (link) {
          const match = link.match(/saleCode=([A-Z0-9]+)/);
          if (match) {
            productCodes.push(match[1]);
          }
        }
      });

      return productCodes;
    } catch (error) {
      console.error(`[CbhbCollector] 产品列表采集失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 采集单个产品详情
   */
  async collectProductInfo(productCode: string): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`);
      const $ = cheerio.load(response.data);

      const productInfo = {
        productCode,
        productName: $('.product-title').text().trim(),
        registerCode: $('.register-code').text().replace('登记编号：', '').trim(),
        riskLevel: this.parseRiskLevel($('.risk-type').text().trim()),
        productType: 'bank-wealth',
        company: '渤银理财',
      };

      return productInfo;
    } catch (error) {
      console.error(`[CbhbCollector] 产品${productCode}详情采集失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 采集净值数据
   */
  async collectNavData(productCode: string): Promise<any[]> {
    try {
      const response = await axios.get(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`);
      const $ = cheerio.load(response.data);

      const navData: any[] = [];

      $('.nav-table tbody tr').each((_, el) => {
        const date = $(el).find('td:nth-child(1)').text().trim();
        const unitNav = parseFloat($(el).find('td:nth-child(2)').text().trim());
        const accNav = parseFloat($(el).find('td:nth-child(3)').text().trim());

        if (date && unitNav) {
          navData.push({
            navDate: date,
            unitNav,
            accNav,
            dataSource: 'crawler',
          });
        }
      });

      return navData;
    } catch (error) {
      console.error(`[CbhbCollector] 产品${productCode}净值采集失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 解析风险等级
   */
  parseRiskLevel(text: string): string {
    if (text.includes('低风险') || text.includes('R1')) return 'R1';
    if (text.includes('中低风险') || text.includes('R2')) return 'R2';
    if (text.includes('中风险') || text.includes('R3')) return 'R3';
    if (text.includes('中高风险') || text.includes('R4')) return 'R4';
    if (text.includes('高风险') || text.includes('R5')) return 'R5';
    return 'R2';
  }
}