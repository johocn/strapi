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
   * 页面结构为纯文本展示，不依赖 CSS class，通过文本内容匹配提取字段
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

      // 等待页面内容加载（用 textContent 而非 innerText，因渤银页面动态渲染时 innerText 可能为空）
      await page.waitForFunction(
        () => (document.body.textContent || '').includes('登记编号') || (document.body.textContent || '').includes('销售编号'),
        { timeout: 15000 }
      ).catch(() => {});

      // 额外等待确保动态内容渲染完成
      await page.waitForTimeout(2000);

      // 提取产品信息 - 基于文本内容匹配，不依赖 CSS class
      // 使用 textContent 而非 innerText，因为 innerText 在某些动态渲染场景下返回空
      const productInfo = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';

        // 辅助：从文本中提取"标签：值"格式的值
        const extractByLabel = (labels: string[]): string => {
          for (const label of labels) {
            // 策略1（优先）：匹配 "标签：值"，值在下一个标签模式或换行处结束
            // 处理同一行多个标签的情况，如 "登记编号：Z7008426000574销售编号：CSFB1Y26170A"
            const regex1 = new RegExp(label + '[：:]\\s*([\\s\\S]*?)(?=\\n|[a-zA-Z\\u4e00-\\u9fa5]+[：:]|$)');
            const match1 = bodyText.match(regex1);
            if (match1 && match1[1]) {
              const val = match1[1].trim();
              if (val) return val;
            }
            // 策略2（兜底）：匹配 "标签：值"，值在空白处结束（简单场景）
            const regex2 = new RegExp(label + '[：:]\\s*([^\\s\\n，,]+)');
            const match2 = bodyText.match(regex2);
            if (match2 && match2[1]) {
              return match2[1].trim();
            }
          }
          return '';
        };

        // 提取登记编号：页面显示"登记编号：Z7008426000574"
        const registerCode = extractByLabel(['登记编号', '登记编码']);

        // 提取销售编号
        const saleCode = extractByLabel(['销售编号', '销售编码']);

        // 提取产品名称：页面中最大的标题（h1/h2/h3）或特定结构
        let name = '';
        const headings = document.querySelectorAll('h1, h2, h3, .title, .product-name');
        for (const h of headings) {
          const text = h.textContent?.trim() || '';
          // 排除导航标题等
          if (text && text.length > 4 && !text.includes('当前位置') && !text.includes('理财产品')) {
            name = text;
            break;
          }
        }
        // 如果标题没找到，尝试从文本中找产品名
        if (!name) {
          const nameMatch = bodyText.match(/渤银理财[^\n，,]+/);
          if (nameMatch) {
            name = nameMatch[0].trim();
          }
        }

        // 提取风险等级：页面显示"中低风险"等
        // 注意：必须先检查长词（中低风险），否则"低风险"会匹配到"中低风险"的子串
        let riskText = '';
        const riskLevels = ['中低风险', '中高风险', '低风险', '中风险', '高风险'];
        for (const key of riskLevels) {
          if (bodyText.includes(key)) {
            riskText = key;
            break;
          }
        }

        // 提取业绩比较基准：页面显示"2.50%-3.00%"或"2.50%"
        let benchmark = '';
        const benchMatch = bodyText.match(/(\d+\.?\d*%-?\d*\.?\d*%?)/);
        if (benchMatch) {
          benchmark = benchMatch[1];
        }

        // 提取产品类型：封闭型、定期开放型、现金管理类等
        let productTypeText = '';
        const typeKeywords = ['封闭型', '定期开放型', '现金管理类', '每日开放申赎型', '客户周期开放型', '最短持有期型'];
        for (const kw of typeKeywords) {
          if (bodyText.includes(kw)) {
            productTypeText = kw;
            break;
          }
        }

        // 提取日期
        const issueDate = extractByLabel(['产品募集起始日', '募集起始日', '发行日', '成立日']);
        const raiseEndDate = extractByLabel(['产品募集结束日', '募集结束日']);
        const maturityDate = extractByLabel(['产品到期日', '到期日']);
        const establishDate = extractByLabel(['发行成立日', '成立日']);

        // 提取销售商名称
        const issuer = extractByLabel(['销售商名称', '发行机构', '管理机构']);

        return {
          name,
          registerCode,
          saleCode,
          riskText,
          benchmark,
          productTypeText,
          issueDate,
          raiseEndDate,
          maturityDate,
          establishDate,
          issuer,
        };
      });

      // 如果详情页无数据，尝试列表页搜索
      if (!productInfo.name && !productInfo.registerCode) {
        return await this.collectFromListPage(productCode);
      }

      return {
        productCode,
        productName: productInfo.name,
        registerCode: productInfo.registerCode,
        riskLevel: this.parseRiskLevel(productInfo.riskText),
        riskLevelRaw: productInfo.riskText,
        termType: this.parseTermType(productInfo.productTypeText),
        termTypeRaw: productInfo.productTypeText,
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: productInfo.issueDate,
        maturityDate: productInfo.maturityDate,
        benchmark: productInfo.benchmark,
        company: '渤银理财',
        issuer: productInfo.issuer,
        establishDate: productInfo.establishDate,
        raiseEndDate: productInfo.raiseEndDate,
      };
    } catch (error) {
      throw new Error(`渤银官网采集失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 从列表页搜索产品
   * 列表页也包含登记编码、销售编码等关键信息
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

      // 等待列表加载（用 textContent 而非 innerText）
      await page.waitForFunction(
        () => (document.body.textContent || '').includes('登记编码') || (document.body.textContent || '').includes('销售编码'),
        { timeout: 15000 }
      ).catch(() => {});

      await page.waitForTimeout(2000);

      // 在列表页文本中查找匹配产品
      const found = await page.evaluate((code) => {
        const bodyText = document.body.textContent || '';

        // 查找销售编码
        if (bodyText.includes(code)) {
          // 提取该产品附近的关键信息
          const idx = bodyText.indexOf(code);
          const context = bodyText.substring(Math.max(0, idx - 500), idx + 500);

          // 提取登记编码
          const regMatch = context.match(/登记编码[：:]\s*([A-Z0-9]+)/);
          const registerCode = regMatch ? regMatch[1] : '';

          // 提取产品名称（在销售编码之前通常有产品名称）
          const nameMatch = context.match(/渤银理财[^\n，,]+/);
          const name = nameMatch ? nameMatch[0].trim() : '';

          // 提取风险等级（先检查长词，避免子串误匹配）
          let riskText = '';
          for (const key of ['中低风险', '中高风险', '低风险', '中风险', '高风险']) {
            if (context.includes(key)) {
              riskText = key;
              break;
            }
          }

          // 提取业绩比较基准
          const benchMatch = context.match(/(\d+\.?\d*%-?\d*\.?\d*%?)/);
          const benchmark = benchMatch ? benchMatch[1] : '';

          // 提取日期
          const dateMatch = context.match(/(\d{4}-\d{2}-\d{2})/g);
          const issueDate = dateMatch && dateMatch[0] ? dateMatch[0] : '';
          const maturityDate = dateMatch && dateMatch[2] ? dateMatch[2] : '';

          return { name, registerCode, riskText, benchmark, issueDate, maturityDate, raw: context };
        }
        return null;
      }, productCode);

      if (!found) {
        return null;
      }

      return {
        productCode,
        productName: found.name,
        registerCode: found.registerCode,
        riskLevel: this.parseRiskLevel(found.riskText),
        riskLevelRaw: found.riskText,
        termType: 'medium',
        termTypeRaw: '',
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: found.issueDate,
        maturityDate: found.maturityDate,
        benchmark: found.benchmark,
        company: '渤银理财',
        _listMatch: found.raw,
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
    // 按关键词长度降序检查，避免"低风险"匹配到"中低风险"的子串
    const sortedKeys = Object.keys(RISK_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return RISK_MAP[key];
    }
    return 'R2';
  }

  private parseTermType(text: string): string {
    for (const [key, value] of Object.entries(TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    // 根据产品类型推断
    if (text.includes('封闭')) return 'long';
    if (text.includes('现金管理') || text.includes('每日开放')) return 'short';
    return 'medium';
  }
}
