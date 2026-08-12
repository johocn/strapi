'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

// 中国理财网信息披露平台
const CHINAWEALTH_URL = 'https://xinxipilu.chinawealth.com.cn';

// 理财网风险等级映射
const CW_RISK_MAP: Record<string, string> = {
  '一级(低)': 'R1',
  '二级(中低)': 'R2',
  '三级(中)': 'R3',
  '四级(中高)': 'R4',
  '五级(高)': 'R5',
  'R1': 'R1',
  'R2': 'R2',
  'R3': 'R3',
  'R4': 'R4',
  'R5': 'R5',
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
   * 策略：
   * 1. 用 Playwright 打开页面 → 等待 JS 渲染
   * 2. 拦截所有 XHR/fetch 响应
   * 3. 智能定位登记编码输入框（通过 placeholder/label/索引多种方式）
   * 4. 填入登记编码 → 点击查询
   * 5. 从拦截到的 API 响应中提取产品数据
   * 6. Fallback: 从页面 DOM/文本内容提取
   */
  async collectByRegisterCode(registerCode: string): Promise<any> {
    console.log(`[chinawealth] 开始查询登记编码: ${registerCode}`);

    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }

    // 收集所有 API 响应
    const apiResponses: any[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      // 拦截所有 JSON API 响应（排除静态资源）
      if (url.includes('/product/') || url.includes('/getProduct') || url.includes('/list') || url.includes('/query') || url.includes('/search')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const json = await response.json();
            apiResponses.push({ url, json });
            console.log(`[chinawealth] 拦截到 API 响应: ${url}`);
          }
        } catch {
          // 忽略解析错误
        }
      }
    });

    try {
      // 1. 访问中国理财网信息披露平台
      console.log(`[chinawealth] 访问页面: ${CHINAWEALTH_URL}`);
      await page.goto(CHINAWEALTH_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 2. 等待页面 JS 渲染完成
      await page.waitForSelector('input', { timeout: 15000 }).catch(() => {
        console.log('[chinawealth] 未找到 input 元素，页面可能未渲染');
      });
      await page.waitForTimeout(3000);

      // 3. 智能定位登记编码输入框并填入值
      const inputFound = await page.evaluate((code: string) => {
        const inputs = Array.from(document.querySelectorAll('input'));
        console.log(`[chinawealth] 页面上共找到 ${inputs.length} 个 input 元素`);

        // 策略1: 通过 placeholder 匹配
        const placeholderKeywords = ['登记编码', '登记代码', '产品编码', '产品登记'];
        for (const input of inputs) {
          const placeholder = input.placeholder || '';
          for (const kw of placeholderKeywords) {
            if (placeholder.includes(kw)) {
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              )?.set;
              nativeSetter?.call(input, code);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return `placeholder:${placeholder}`;
            }
          }
        }

        // 策略2: 通过附近的 label 文本匹配
        for (const input of inputs) {
          // 检查 input 的父元素中的文本
          let el: Element | null = input.parentElement;
          for (let i = 0; i < 3 && el; i++) {
            const text = el.textContent || '';
            if (text.includes('登记编码') || text.includes('登记代码')) {
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              )?.set;
              nativeSetter?.call(input, code);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return `label:${text.trim().substring(0, 30)}`;
            }
            el = el.parentElement;
          }
        }

        // 策略3: 如果有多个 input，尝试倒数第一个（通常是登记编码）
        if (inputs.length >= 2) {
          const input = inputs[inputs.length - 1];
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set;
          nativeSetter?.call(input, code);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return `index:last(${inputs.length - 1})`;
        }

        // 策略4: 只有一个 input 时直接使用
        if (inputs.length === 1) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set;
          nativeSetter?.call(inputs[0], code);
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          return `index:0`;
        }

        return null;
      }, registerCode);

      console.log(`[chinawealth] 输入框定位结果: ${inputFound || '未找到'}`);

      // 4. 点击查询按钮
      const btnClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        // 优先找"查询"按钮
        for (const btn of btns) {
          const text = btn.textContent?.trim() || '';
          if (text === '查询' || text === '搜索' || text === 'Search') {
            btn.click();
            return text;
          }
        }
        // 找包含"查"的按钮
        for (const btn of btns) {
          const text = btn.textContent?.trim() || '';
          if (text.includes('查') || text.includes('搜')) {
            btn.click();
            return text;
          }
        }
        return null;
      });

      console.log(`[chinawealth] 点击按钮: ${btnClicked || '未找到'}`);

      // 5. 等待 API 响应
      await page.waitForTimeout(5000);

      // 6. 从拦截到的 API 响应中提取产品数据
      if (apiResponses.length > 0) {
        console.log(`[chinawealth] 共拦截到 ${apiResponses.length} 个 API 响应`);
        for (const resp of apiResponses) {
          const product = this.extractProductFromApiResponse(resp.json, registerCode);
          if (product) {
            console.log(`[chinawealth] 从 API 响应提取到产品数据: ${product.productName}`);
            return product;
          }
        }
        console.log('[chinawealth] API 响应中未找到匹配的产品数据');
      } else {
        console.log('[chinawealth] 未拦截到任何 API 响应');
      }

      // 7. Fallback: 从页面 DOM 提取表格数据
      console.log('[chinawealth] 尝试从页面 DOM 提取数据...');
      const domProduct = await this.extractFromDom(page, registerCode);
      if (domProduct) {
        console.log(`[chinawealth] 从 DOM 提取到产品数据: ${domProduct.productName}`);
        return domProduct;
      }

      // 8. Fallback: 从页面文本内容提取
      console.log('[chinawealth] 尝试从页面文本提取数据...');
      const text = await page.evaluate(() => document.body.textContent || '');
      const textProduct = this.parseFromText(text, registerCode);
      if (textProduct) {
        console.log(`[chinawealth] 从文本提取到产品数据: ${textProduct.productName}`);
        return textProduct;
      }

      console.log('[chinawealth] 所有策略均未提取到产品数据');
      return null;
    } catch (error) {
      console.error(`[chinawealth] 查询失败: ${error.message}`);
      throw new Error(`中国理财网查询失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }

  /**
   * 从 API 响应中提取产品数据
   * 兼容多种响应格式
   */
  private extractProductFromApiResponse(json: any, registerCode: string): any | null {
    if (!json) return null;

    // 尝试多种数据路径
    const lists: any[][] = [];
    
    // 路径1: { code: 200, data: { list: [...] } }
    if (json?.data?.list) lists.push(json.data.list);
    // 路径2: { data: [...] }
    if (Array.isArray(json?.data)) lists.push(json.data);
    // 路径3: { list: [...] }
    if (Array.isArray(json?.list)) lists.push(json.list);
    // 路径4: { rows: [...] }
    if (Array.isArray(json?.rows)) lists.push(json.rows);
    // 路径5: { records: [...] }
    if (Array.isArray(json?.records)) lists.push(json.records);
    // 路径6: 直接是数组
    if (Array.isArray(json)) lists.push(json);

    for (const list of lists) {
      for (const item of list) {
        // 检查是否匹配登记编码
        const itemCode = this.getFieldValue(item, ['prodRegCode', 'PROD_REG_CODE', 'registerCode', 'regCode', '登记编码']);
        if (itemCode && itemCode.includes(registerCode)) {
          return this.parseApiProduct(item, registerCode);
        }
        // 如果只有一条数据，直接使用
        if (list.length === 1) {
          return this.parseApiProduct(item, registerCode);
        }
      }
    }

    return null;
  }

  /**
   * 从页面 DOM 中提取表格数据
   * 中国理财网使用 Element UI Table，数据在 .el-table__row 中
   */
  private async extractFromDom(page: any, registerCode: string): Promise<any | null> {
    return await page.evaluate((code: string) => {
      // 策略1: 从 Element UI 表格提取
      const rows = document.querySelectorAll('.el-table__row, .el-table__body-wrapper tr');
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes(code)) {
          // 提取所有单元格
          const cells = row.querySelectorAll('td, .cell');
          const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
          return { cells: cellTexts, rawText: text };
        }
      }

      // 策略2: 从所有包含登记编码的元素中提取
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text.includes(code) && text.length < 1000) {
          // 检查是否是产品信息行
          const hasProductInfo = text.includes('风险') || text.includes('收益') || text.includes('理财');
          if (hasProductInfo) {
            return { rawText: text };
          }
        }
      }

      return null;
    }, registerCode).then((result: any) => {
      if (!result) return null;

      // 如果有 cells 数组，按表格列顺序解析
      if (result.cells && result.cells.length > 0) {
        return this.parseTableCells(result.cells, registerCode);
      }

      // 否则从文本解析
      return this.parseFromText(result.rawText, registerCode);
    }).catch(() => null);
  }

  /**
   * 从表格单元格数组解析产品数据
   * 中国理财网表格列顺序通常为：
   * 产品名称 | 登记编码 | 发行机构 | 产品状态 | 投资性质 | 运作模式 | 风险等级 | 期限类型
   */
  private parseTableCells(cells: string[], fallbackCode: string): any {
    // 根据列数尝试不同映射
    let productName = '';
    let companyName = '';
    let prodStatus = '';
    let investNature = '';
    let operateMode = '';
    let riskLevel = '';
    let termType = '';

    if (cells.length >= 7) {
      // 标准布局: 产品名称 | 登记编码 | 发行机构 | 产品状态 | 投资性质 | 运作模式 | 风险等级 | 期限类型
      productName = cells[0];
      companyName = cells[2];
      prodStatus = cells[3];
      investNature = cells[4];
      operateMode = cells[5];
      riskLevel = cells[6];
      termType = cells[7] || '';
    } else if (cells.length >= 4) {
      // 简化布局
      productName = cells[0];
      companyName = cells[2] || '';
      prodStatus = cells[3] || '';
    }

    if (!productName) return null;

    return {
      productName: productName.trim(),
      registerCode: fallbackCode,
      riskLevel: this.parseRiskLevel(riskLevel),
      riskLevelRaw: riskLevel,
      termType: this.parseTermType(termType),
      termTypeRaw: termType,
      productType: this.parseProductType(investNature),
      productTypeRaw: investNature,
      companyName: companyName.trim(),
      productStatus: prodStatus.trim(),
      operationMode: operateMode.trim(),
      unitNav: null,
      navDate: null,
    };
  }

  /**
   * 从 API 返回的产品对象中解析结构化数据
   */
  private parseApiProduct(item: any, fallbackCode: string): any {
    const productName = this.getFieldValue(item, ['productName', 'PROD_NAME', 'name', 'prodName']);
    const prodRegCode = this.getFieldValue(item, ['prodRegCode', 'PROD_REG_CODE', 'registerCode', 'regCode']);
    const companyName = this.getFieldValue(item, ['companyName', 'COMPANY_NAME', 'issuer', 'managerName', 'PROD_MANAGER_NAME']);
    const prodStatus = this.getFieldValue(item, ['prodStatus', 'PROD_STATUS', 'status', 'productStatus']);
    const prodInvestNature = this.getFieldValue(item, ['prodInvestNature', 'PROD_INVEST_NATURE', 'investNature', 'investmentType']);
    const prodOperateMode = this.getFieldValue(item, ['prodOperateMode', 'PROD_OPERATE_MODE', 'operateMode', 'operationMode']);
    const prodRiskLevel = this.getFieldValue(item, ['prodRiskLevel', 'PROD_RISK_LEVEL', 'riskLevel', 'riskLevelName']);
    const prodTermCode = this.getFieldValue(item, ['prodTermCode', 'PROD_TERM_CODE', 'termCode', 'termType']);
    const unitNav = this.getFieldValue(item, ['unitNav', 'UNIT_NAV', 'nav', 'latestNav']);
    const navDate = this.getFieldValue(item, ['navDate', 'NAV_DATE', 'latestNavDate']);

    return {
      productName: productName || '',
      registerCode: prodRegCode || fallbackCode,
      riskLevel: this.parseRiskLevel(prodRiskLevel),
      riskLevelRaw: prodRiskLevel,
      termType: this.parseTermType(prodTermCode),
      termTypeRaw: prodTermCode,
      productType: this.parseProductType(prodInvestNature),
      productTypeRaw: prodInvestNature,
      companyName: companyName || '',
      productStatus: prodStatus || '',
      operationMode: prodOperateMode || '',
      unitNav: unitNav || null,
      navDate: navDate || null,
    };
  }

  /**
   * 从对象中按多个候选 key 获取值
   */
  private getFieldValue(obj: any, keys: string[]): string {
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim()) {
        return String(obj[k]).trim();
      }
    }
    return '';
  }

  /**
   * 从页面文本内容提取产品信息（Fallback）
   */
  private parseFromText(text: string, fallbackCode: string): any | null {
    if (!text || !text.includes(fallbackCode)) return null;

    // 找到登记编码在文本中的位置，取前后上下文
    const idx = text.indexOf(fallbackCode);
    const context = text.substring(Math.max(0, idx - 500), idx + 500);

    // 提取产品名称（通常在登记编码之前）
    const nameMatch = context.match(/([^\s\n]{4,})\s*\n?\s*[A-Z]\d+/);
    const productName = nameMatch ? nameMatch[1].trim() : '';

    // 提取发行机构
    const companyMatch = context.match(new RegExp(fallbackCode + '\\s*\\n?\\s*([^\\s\\n]+(?:银行|理财|公司)[^\\s\\n]*)'));
    const companyName = companyMatch ? companyMatch[1].trim() : '';

    // 提取风险等级
    let riskText = '';
    const riskLevels = ['一级(低)', '二级(中低)', '三级(中)', '四级(中高)', '五级(高)', 'R1', 'R2', 'R3', 'R4', 'R5'];
    for (const r of riskLevels) {
      if (context.includes(r)) { riskText = r; break; }
    }

    // 提取投资性质
    let investType = '';
    for (const t of ['固定收益类', '权益类', '混合类', '商品及金融衍生品类']) {
      if (context.includes(t)) { investType = t; break; }
    }

    // 提取运作模式
    let operateMode = '';
    for (const m of ['封闭式净值型', '开放式净值型', '封闭式非净值型', '开放式非净值型']) {
      if (context.includes(m)) { operateMode = m; break; }
    }

    // 提取期限类型
    let termText = '';
    const termPatterns = ['1-3个月(含)', '3-6个月(含)', '6-12个月(含)', '1-3年(含)', '3年以上', 'T+0', 'T+1'];
    for (const t of termPatterns) {
      if (context.includes(t)) { termText = t; break; }
    }

    // 提取产品状态
    let status = '';
    for (const s of ['待售', '存续', '到期', '清算']) {
      if (context.includes(s)) { status = s; break; }
    }

    if (!productName && !companyName) return null;

    return {
      productName,
      registerCode: fallbackCode,
      riskLevel: this.parseRiskLevel(riskText),
      riskLevelRaw: riskText,
      termType: this.parseTermType(termText),
      termTypeRaw: termText,
      productType: this.parseProductType(investType),
      productTypeRaw: investType,
      companyName,
      productStatus: status,
      operationMode: operateMode,
      unitNav: null,
      navDate: null,
    };
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
    // 按长度降序检查，避免子串误匹配
    const sortedKeys = Object.keys(CW_RISK_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return CW_RISK_MAP[key];
    }
    // 尝试直接匹配 R1-R5
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
