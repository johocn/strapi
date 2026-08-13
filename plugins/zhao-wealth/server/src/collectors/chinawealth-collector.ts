'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

// 中国理财网信息披露平台 — 产品详情页 URL
const CW_DETAIL_URL = 'https://xinxipilu.chinawealth.com.cn/queryMenu/prodType/prodTypeDetail';

// 理财网风险等级映射
const CW_RISK_MAP: Record<string, string> = {
  '一级(低)': 'R1',
  '二级(中低)': 'R2',
  '三级(中)': 'R3',
  '四级(中高)': 'R4',
  '五级(高)': 'R5',
  'R1': 'R1', 'R2': 'R2', 'R3': 'R3', 'R4': 'R4', 'R5': 'R5',
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
   * 通过登记编码查询中国理财网产品详情页
   *
   * URL: /queryMenu/prodType/prodTypeDetail?prodRegCode={registerCode}
   * 页面为 Vue SPA（Element Plus），需 Playwright 渲染后从 DOM 提取
   */
  async collectByRegisterCode(registerCode: string): Promise<any> {
    console.log(`[chinawealth] 开始查询登记编码: ${registerCode}`);

    const url = `${CW_DETAIL_URL}?prodRegCode=${encodeURIComponent(registerCode)}`;
    console.log(`[chinawealth] 详情页 URL: ${url}`);

    try {
      const product = await this.collectViaPlaywright(url, registerCode);
      if (product) {
        console.log(`[chinawealth] 采集成功: ${product.productName}`);
        console.log(`[chinawealth] 字段详情: registerCode=${product.registerCode}, companyName=${product.companyName}, risk=${product.riskLevel}, type=${product.productType}, opMode=${product.operationMode}, issueDate=${product.issueDate}`);
        return product;
      }
    } catch (error) {
      console.error(`[chinawealth] Playwright 采集失败: ${error.message}`);
    }

    console.log('[chinawealth] 未能获取到产品数据');
    return null;
  }

  /**
   * Playwright 策略：打开详情页，精确 DOM 定位提取字段
   *
   * .basic-info 中每个字段结构：
   *   <div class="el-col el-col-10">标签</div>
   *   <div class="el-col el-col-14">值</div>
   * 通过精确匹配标签文本，取下一个兄弟元素的文本作为值
   */
  private async collectViaPlaywright(url: string, registerCode: string): Promise<any | null> {
    const page = await createPage();
    if (!page) {
      console.log('[chinawealth] Playwright Browser 不可用');
      return null;
    }

    try {
      console.log(`[chinawealth] Playwright 打开: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000); // 等待 Vue SPA 渲染完成

      const product = await page.evaluate((regCode) => {
        /**
         * 从 .basic-info 精确提取字段
         * 找到标签文本完全匹配的 .el-col，取其下一个兄弟 .el-col 的文本
         */
        const getFieldFromBasicInfo = (labelText: string): string => {
          const allCols = document.querySelectorAll('.basic-info .el-col');
          for (let i = 0; i < allCols.length; i++) {
            const text = (allCols[i].textContent || '').trim();
            if (text === labelText && i + 1 < allCols.length) {
              const valueEl = allCols[i + 1];
              const val = (valueEl.textContent || '').trim();
              if (val && !val.includes('暂无数据')) {
                return val;
              }
            }
          }
          return '';
        };

        /**
         * 从顶部摘要区提取（格式：标签：值）
         * 搜索 .prodType-detail 下 .el-card__body 区域的文本
         */
        const bodyText = document.body.textContent || '';
        const extractByColon = (labels: string[]): string => {
          for (const label of labels) {
            // 匹配 "标签：值" 到下一个换行或下一个"中文/英文标签："为止
            const regex1 = new RegExp(label + '[：:]\\s*([\\s\\S]*?)(?=\\n|[a-zA-Z\\u4e00-\\u9fa5]+[：:]|$)');
            const match1 = bodyText.match(regex1);
            if (match1 && match1[1]) {
              const val = match1[1].trim();
              if (val && !val.includes('暂无数据')) return val;
            }
            // 简单兜底：匹配到下一个空格或逗号
            const regex2 = new RegExp(label + '[：:]\\s*([^\\s\\n，,]+)');
            const match2 = bodyText.match(regex2);
            if (match2 && match2[1]) {
              const val = match2[1].trim();
              if (val && !val.includes('暂无数据')) return val;
            }
          }
          return '';
        };

        // === 从 .basic-info 提取核心字段（精确 DOM 定位） ===
        const productName = getFieldFromBasicInfo('产品名称');
        const productCode = getFieldFromBasicInfo('产品代码');
        const companyName = getFieldFromBasicInfo('发行机构');
        const operationMode = getFieldFromBasicInfo('运作模式');
        const riskLevelRaw = getFieldFromBasicInfo('风险等级');
        const productTypeRaw = getFieldFromBasicInfo('投资性质');

        // === 从顶部摘要区提取（冒号格式） ===
        const extractedRegCode = extractByColon(['登记编码']) || regCode;
        const issueDate = extractByColon(['起始日期']);
        const maturityDate = extractByColon(['结束日期']);

        if (!productName) {
          console.log('[chinawealth] .basic-info 未找到产品名称');
          return null;
        }

        return {
          productName,
          registerCode: extractedRegCode,
          companyName,
          operationMode,
          riskLevelRaw,
          productTypeRaw,
          productCode,
          issueDate,
          maturityDate,
        };
      }, registerCode);

      if (!product) return null;

      // 后处理：映射枚举值
      product.riskLevel = this.parseRiskLevel(product.riskLevelRaw);
      product.productType = this.parseProductType(product.productTypeRaw);

      // 日期格式转换：2026/08/20 → 2026-08-20
      if (product.issueDate) {
        product.issueDate = product.issueDate.replace(/\//g, '-');
      }
      if (product.maturityDate) {
        product.maturityDate = product.maturityDate.replace(/\//g, '-');
      }

      return product;
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
   * 采集净值数据
   * 通过登记编码访问中国理财网产品详情页，拦截 AJAX 请求或解析页面表格获取净值
   */
  async collectNavData(registerCode: string): Promise<any[]> {
    console.log(`[chinawealth] 开始采集净值: registerCode=${registerCode}`);

    const page = await createPage();
    if (!page) {
      console.log('[chinawealth] Playwright Browser 不可用');
      return [];
    }

    const capturedApiData: any[] = [];

    try {
      // 拦截 API 响应
      page.on('response', async (response) => {
        const url = response.url().toLowerCase();
        if (url.includes('nav') || url.includes('netvalue') || url.includes('jz') ||
            url.includes('net') || url.includes('value') || url.includes('detail')) {
          try {
            const ct = response.headers()['content-type'] || '';
            if (ct.includes('json')) {
              const body = await response.json();
              if (body) {
                const dataArr = body.data || body.list || body.rows || body.result;
                if (Array.isArray(dataArr) && dataArr.length > 0) {
                  capturedApiData.push(...dataArr);
                }
              }
            }
          } catch { /* ignore */ }
        }
      });

      const url = `${CW_DETAIL_URL}?prodRegCode=${encodeURIComponent(registerCode)}`;
      console.log(`[chinawealth] Playwright 打开: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // 尝试点击"净值"相关标签
      const navTabSelectors = [
        'text=净值', 'text=历史净值', 'text=净值走势', 'text=产品净值',
        'text=单位净值', 'text=每日净值', 'text=净值信息',
      ];
      for (const sel of navTabSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(2000);
            break;
          }
        } catch { /* ignore */ }
      }

      // 解析页面表格中的净值数据
      const tableNavData = await page.evaluate(() => {
        const result: any[] = [];

        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          for (let i = 0; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td, th'));
            const cellTexts = cells.map(c => (c.textContent || '').trim());

            const dateCell = cellTexts.find(t => /\d{4}[-/]\d{2}[-/]\d{2}/.test(t));
            if (dateCell) {
              const normalizedDate = dateCell.replace(/\//g, '-');
              const numbers = cellTexts.filter(t => /^\d+\.\d+$/.test(t));
              if (numbers.length >= 1) {
                result.push({
                  navDate: normalizedDate,
                  unitNav: numbers[0] || null,
                  accNav: numbers[1] || numbers[0] || null,
                  dataSource: 'crawler',
                });
              }
            }
          }
        }

        // 文本正则匹配
        if (result.length === 0) {
          const bodyText = document.body.textContent || '';
          const regex = /(\d{4}[-/]\d{2}[-/]\d{2})[\s\S]{0,30}?(\d+\.\d{2,6})[\s\S]{0,30}?(\d+\.\d{2,6})/g;
          let match;
          while ((match = regex.exec(bodyText)) !== null) {
            result.push({
              navDate: match[1].replace(/\//g, '-'),
              unitNav: match[2],
              accNav: match[3],
              dataSource: 'crawler',
            });
          }
        }

        return result;
      });

      // 合并 API 拦截数据
      const apiNavData: any[] = [];
      for (const item of capturedApiData) {
        const navDate = item.navDate || item.netDate || item.date || item.priceDate;
        const unitNav = item.unitNav || item.netValue || item.unitNetValue || item.dwjz;
        const accNav = item.accNav || item.accNetValue || item.totalNetValue || item.ljjz;
        if (navDate) {
          apiNavData.push({
            navDate: typeof navDate === 'string' ? navDate.replace(/\//g, '-') : navDate,
            unitNav: unitNav ? String(unitNav) : null,
            accNav: accNav ? String(accNav) : (unitNav ? String(unitNav) : null),
            dataSource: 'crawler',
          });
        }
      }

      // 去重合并
      const allNavData = [...apiNavData];
      const existingDates = new Set(allNavData.map(d => d.navDate));
      for (const item of tableNavData) {
        if (!existingDates.has(item.navDate)) {
          allNavData.push(item);
          existingDates.add(item.navDate);
        }
      }

      allNavData.sort((a, b) => b.navDate.localeCompare(a.navDate));

      console.log(`[chinawealth] 净值采集完成: registerCode=${registerCode}, API拦截=${apiNavData.length}条, 页面解析=${tableNavData.length}条, 合计=${allNavData.length}条`);

      return allNavData;
    } catch (error) {
      console.error(`[chinawealth] 净值采集失败: ${error.message}`);
      return [];
    } finally {
      await closePage(page);
    }
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

  private parseProductType(text: string): string {
    if (!text) return 'bank-wealth';
    const sortedKeys = Object.keys(CW_TYPE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return CW_TYPE_MAP[key];
    }
    return 'bank-wealth';
  }
}
