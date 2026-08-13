'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';
import { httpClient } from '../utils/http-client';

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

        // 提取业绩比较基准：取"业绩比较基准"标签后的原始值
        // 有值就填，没有就空着
        let benchmark = '';
        const benchRaw = extractByLabel(['业绩比较基准', '业绩基准']);
        if (benchRaw) {
          benchmark = benchRaw;
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

        // 发行机构固定为渤银理财，不从页面提取（避免不确定的值）
        const issuer = '渤银理财';

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
        saleCode: productCode,
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
        saleCode: productCode,
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
   * 采集净值数据 — 直接调用 cbhbwm.com.cn 后端 API
   * API: POST /eportalapply/portlet/bwmweb/queryProJz
   * 无需 Playwright，纯 HTTP 请求，速度快、稳定性高
   *
   * 字段映射：value1=日期(YYYYMMDD) value2=单位净值 value3=累计净值
   */
  async collectNavData(productCode: string, options?: { registerCode?: string }): Promise<any[]> {
    const saleCode = productCode;
    const checkInon = options?.registerCode || '';
    const url = `${BASE_URL}/eportalapply/portlet/bwmweb/queryProJz`;

    const params = new URLSearchParams({
      pageNo: '1',
      pageSize: '1000',
      collMod: '0',
      gwProdMod: '3',
      beginDate: '',
      endDate: '',
      saleCode,
      checkInon,
      prodCode: saleCode,
      prodFlag: '3',
      xsshareName: 'A',
    });

    try {
      const resp = await httpClient.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Request-By': 'ajax-request-tag',
          'Referer': `${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${saleCode}`,
        },
      });

      // axios 自动解析 JSON，resp.data 已是对象
      const raw = resp.data;
      // data 字段是双重编码的 JSON 字符串
      const parsed = typeof raw.data === 'string' ? JSON.parse(raw.data) : raw.data;
      const records = parsed.data || [];

      const navData = records.map((r: any) => {
        const d = String(r.value1 || '');
        // YYYYMMDD → YYYY-MM-DD
        const navDate = d.length === 8
          ? `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`
          : d;
        return {
          navDate,
          unitNav: r.value2 ? String(r.value2) : null,
          accNav: r.value3 ? String(r.value3) : (r.value2 ? String(r.value2) : null),
          dataSource: 'crawler',
        };
      });

      // 按日期降序排序
      navData.sort((a: any, b: any) => b.navDate.localeCompare(a.navDate));

      console.log(`[cbhb] 净值API采集完成: saleCode=${saleCode}, 共${navData.length}条`);
      return navData;
    } catch (error) {
      throw new Error(`渤银净值API采集失败: ${error.message}`);
    }
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
