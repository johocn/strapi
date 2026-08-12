'use strict';

import axios from 'axios';
import * as cheerio from 'cheerio';
import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

// 中国理财网信息披露平台 — 产品查询 URL
const CW_QUERY_URL = 'https://xinxipilu.chinawealth.com.cn/queryMenu/prodType';

// 理财网风险等级映射
const CW_RISK_MAP: Record<string, string> = {
  '一级(低)': 'R1',
  '二级(中低)': 'R2',
  '三级(中)': 'R3',
  '四级(中高)': 'R4',
  '五级(高)': 'R5',
  'R1': 'R1', 'R2': 'R2', 'R3': 'R3', 'R4': 'R4', 'R5': 'R5',
};

// 理财网期限类型映射
const CW_TERM_MAP: Record<string, string> = {
  '1-3个月(含)': 'short',
  '3-6个月(含)': 'short',
  '6-12个月(含)': 'medium',
  '1-3年(含)': 'long',
  '3年以上': 'long',
  'T+0': 'short',
  'T+1': 'short',
  '每日': 'short',
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
   *
   * 主策略：HTTP GET + Cheerio 解析 HTML 表格
   * 兜底策略：Playwright 打开同一 URL，从 DOM 提取
   *
   * URL: /queryMenu/prodType?cpmc=&fxjg=&cpdjbm={registerCode}
   */
  async collectByRegisterCode(registerCode: string): Promise<any> {
    console.log(`[chinawealth] 开始查询登记编码: ${registerCode}`);

    const url = `${CW_QUERY_URL}?cpmc=&fxjg=&cpdjbm=${encodeURIComponent(registerCode)}`;
    console.log(`[chinawealth] 查询 URL: ${url}`);

    // 主策略：HTTP GET + Cheerio
    try {
      const product = await this.collectViaHttp(url, registerCode);
      if (product) {
        console.log(`[chinawealth] HTTP 采集成功: ${product.productName}`);
        return product;
      }
      console.log('[chinawealth] HTTP 采集未获取到数据，尝试 Playwright 兜底');
    } catch (error) {
      console.warn(`[chinawealth] HTTP 采集失败: ${error.message}，尝试 Playwright 兜底`);
    }

    // 兜底策略：Playwright
    try {
      const product = await this.collectViaPlaywright(url, registerCode);
      if (product) {
        console.log(`[chinawealth] Playwright 采集成功: ${product.productName}`);
        return product;
      }
    } catch (error) {
      console.error(`[chinawealth] Playwright 采集也失败: ${error.message}`);
    }

    console.log('[chinawealth] 所有策略均未获取到产品数据');
    return null;
  }

  /**
   * 主策略：HTTP GET + Cheerio 解析 HTML 表格
   */
  private async collectViaHttp(url: string, registerCode: string): Promise<any | null> {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });

    const html = response.data;
    if (!html || typeof html !== 'string') {
      console.log('[chinawealth] HTTP 返回非 HTML 内容');
      return null;
    }

    console.log(`[chinawealth] HTML 长度: ${html.length}`);
    return this.parseHtmlTable(html, registerCode);
  }

  /**
   * 用 Cheerio 解析 HTML 表格
   * 中国理财网返回服务端渲染的 HTML，包含一个 11 列的产品表格
   * 表头：序号 | 产品名称 | 登记编码 | 发行机构 | 产品状态 | 投资性质 | 运作模式 | 风险等级 | 期限类型 | 份额代码 | 份额净值 | 净值日期
   *
   * 策略：先解析表头建立列名→索引映射，再按列名提取数据（不依赖固定列位置）
   */
  private parseHtmlTable(html: string, registerCode: string): any | null {
    const $ = cheerio.load(html);

    // 找到数据表格（中国理财网用 table 或 Element UI table）
    // 策略1: 标准 HTML table
    let headerCells: string[] = [];
    let dataRow: cheerio.Cheerio<any> | null = null;

    // 尝试找 <table> 中的表头
    $('table thead tr th, table tr:first-child td').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headerCells.push(text);
    });

    // 如果没找到表头，尝试 Element UI table
    if (headerCells.length === 0) {
      $('.el-table__header th .cell, .el-table__header-wrapper th').each((_, el) => {
        const text = $(el).text().trim();
        if (text) headerCells.push(text);
      });
    }

    // 在数据行中查找包含登记编码的行
    const allSelectors = [
      'table tbody tr',
      'table tr',
      '.el-table__row',
      '.el-table__body-wrapper tr',
    ];

    for (const selector of allSelectors) {
      const rows = $(selector);
      if (rows.length === 0) continue;

      rows.each((_, row) => {
        const rowText = $(row).text();
        if (rowText.includes(registerCode)) {
          dataRow = $(row);
          return false; // break each
        }
      });

      if (dataRow) break;

      // 如果没找到包含登记编码的行，但只有一条数据行，也使用它
      if (!dataRow && rows.length === 1) {
        // 跳过表头行
        const firstText = $(rows[0]).text().trim();
        if (!firstText.includes('序号') && !firstText.includes('产品名称')) {
          dataRow = $(rows[0]);
        }
      }
    }

    if (!dataRow) {
      console.log('[chinawealth] HTML 中未找到包含登记编码的数据行');
      return null;
    }

    // 提取所有单元格文本
    const cells: string[] = [];
    dataRow.find('td, .cell').each((_, cell) => {
      cells.push($(cell).text().trim());
    });

    if (cells.length === 0) {
      console.log('[chinawealth] 数据行中未找到单元格');
      return null;
    }

    console.log(`[chinawealth] 表头: ${headerCells.join(' | ')}`);
    console.log(`[chinawealth] 数据: ${cells.join(' | ')}`);

    // 如果有表头，按列名匹配；否则按固定位置
    if (headerCells.length >= cells.length && headerCells.length > 0) {
      return this.parseByHeader(headerCells, cells, registerCode);
    }

    // 固定位置兜底（标准布局: 序号|产品名称|登记编码|发行机构|产品状态|投资性质|运作模式|风险等级|期限类型|份额代码|份额净值|净值日期）
    return this.parseByPosition(cells, registerCode);
  }

  /**
   * 按表头名称匹配列（推荐，抗列顺序变化）
   */
  private parseByHeader(headers: string[], cells: string[], fallbackCode: string): any {
    // 建立列名→索引映射
    const colMap: Record<string, number> = {};
    headers.forEach((header, idx) => {
      const h = header.trim();
      // 匹配各种可能的表头名称
      if (h.includes('产品名称') || h === '产品名称') colMap.productName = idx;
      else if (h.includes('登记编码') || h.includes('登记代码')) colMap.registerCode = idx;
      else if (h.includes('发行机构') || h.includes('发行人')) colMap.companyName = idx;
      else if (h.includes('产品状态')) colMap.productStatus = idx;
      else if (h.includes('投资性质') || h.includes('投资类型')) colMap.investNature = idx;
      else if (h.includes('运作模式') || h.includes('运作类型')) colMap.operationMode = idx;
      else if (h.includes('风险等级') || h.includes('风险')) colMap.riskLevel = idx;
      else if (h.includes('期限类型') || h.includes('期限')) colMap.termType = idx;
    });

    const get = (key: string): string => {
      const idx = colMap[key];
      return idx != null ? (cells[idx] || '').trim() : '';
    };

    const productName = get('productName');
    if (!productName) {
      console.log('[chinawealth] 按表头匹配未找到产品名称');
      return null;
    }

    const riskLevelRaw = get('riskLevel');
    const termTypeRaw = get('termType');
    const investNature = get('investNature');
    const operationMode = get('operationMode');
    const productStatus = get('productStatus');
    const companyName = get('companyName');
    const regCode = get('registerCode') || fallbackCode;

    return {
      productName,
      registerCode: regCode,
      riskLevel: this.parseRiskLevel(riskLevelRaw),
      riskLevelRaw,
      termType: this.parseTermType(termTypeRaw),
      termTypeRaw,
      productType: this.parseProductType(investNature),
      productTypeRaw: investNature,
      companyName,
      productStatus,
      operationMode,
      unitNav: null,
      navDate: null,
    };
  }

  /**
   * 按固定列位置解析（表头解析失败时兜底）
   * 标准布局: 序号|产品名称|登记编码|发行机构|产品状态|投资性质|运作模式|风险等级|期限类型|份额代码|份额净值|净值日期
   */
  private parseByPosition(cells: string[], fallbackCode: string): any {
    // 尝试跳过序号列（如果第一列是数字）
    let offset = 0;
    if (cells.length > 0 && /^\d+$/.test(cells[0])) {
      offset = 1; // 第一列是序号
    }

    const productName = cells[offset] || '';
    if (!productName) return null;

    const regCode = cells[offset + 1] || fallbackCode;
    const companyName = cells[offset + 2] || '';
    const productStatus = cells[offset + 3] || '';
    const investNature = cells[offset + 4] || '';
    const operationMode = cells[offset + 5] || '';
    const riskLevelRaw = cells[offset + 6] || '';
    const termTypeRaw = cells[offset + 7] || '';

    return {
      productName: productName.trim(),
      registerCode: regCode.trim(),
      riskLevel: this.parseRiskLevel(riskLevelRaw),
      riskLevelRaw: riskLevelRaw.trim(),
      termType: this.parseTermType(termTypeRaw),
      termTypeRaw: termTypeRaw.trim(),
      productType: this.parseProductType(investNature),
      productTypeRaw: investNature.trim(),
      companyName: companyName.trim(),
      productStatus: productStatus.trim(),
      operationMode: operationMode.trim(),
      unitNav: null,
      navDate: null,
    };
  }

  /**
   * 兜底策略：Playwright 打开同一 URL，从 DOM 提取
   */
  private async collectViaPlaywright(url: string, registerCode: string): Promise<any | null> {
    const page = await createPage();
    if (!page) {
      console.log('[chinawealth] Playwright Browser 不可用');
      return null;
    }

    try {
      console.log(`[chinawealth] Playwright 打开: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // 从 DOM 提取表格
      const html = await page.content();
      return this.parseHtmlTable(html, registerCode);
    } catch (error) {
      console.error(`[chinawealth] Playwright 采集失败: ${error.message}`);
      return null;
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
   * 采集净值数据（占位，后续按产品类型实现）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    return [];
  }

  private parseRiskLevel(text: string): string {
    if (!text) return 'R2';
    const sortedKeys = Object.keys(CW_RISK_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return CW_RISK_MAP[key];
    }
    const match = text.match(/R(\d)/);
    if (match) return `R${match[1]}`;
    return 'R2';
  }

  private parseTermType(text: string): string {
    if (!text) return 'medium';
    const sortedKeys = Object.keys(CW_TERM_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return CW_TERM_MAP[key];
    }
    return 'medium';
  }

  private parseProductType(text: string): string {
    if (!text) return 'bank-wealth';
    const sortedKeys = Object.keys(CW_TYPE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return CW_TYPE_MAP[key];
    }
    return 'bank-wealth';
  }
}
