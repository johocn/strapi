'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';

// 青岛银行官网净值查询列表页（客户可自行搜索产品代码查阅净值）
const QDCCB_LIST_URL =
  'https://www.qdccb.com/eportal/ui?pageId=cad5fba118244923ab077d6071fc4b4d&aisiteOutPageId=b9d7863b63f74689b5fe16de82f45bce';
// 产品详情页（URL 尾部拼 prdcode={产品代码}1，"1" 为 PC 端类型后缀）
const QDCCB_DETAIL_URL =
  'https://www.qdccb.com/eportal/ui?pageId=c788082319fc4da1ad9a35eb2150d872&prdcode=';

// 产品信息列表 moduleId
const INFO_MODULE_ID = '3567249ec8ca464d8c77a548570c2928';
// 净值接口 moduleId（与列表不同！）
const NAV_MODULE_ID = '8c1e93dc09154b83a11ba801b3971f95';

const NAV_PAGE_SIZE = 10;

// 官网风险等级中文 → 标准 R 等级
const RISK_MAP: Record<string, string> = {
  '低风险': 'R1',
  '中低风险': 'R2',
  '中等风险': 'R3',
  '中高风险': 'R4',
  '高风险': 'R5',
};

function mapRiskLevel(text: string): string {
  if (!text) return 'R2';
  if (/R[1-5]/.test(text)) return text.match(/R[1-5]/)![0];
  return RISK_MAP[text] || 'R2';
}

function normalizeDate(text: string): string {
  if (!text) return '';
  return text.replace(/\//g, '-');
}

async function fetchPortlet(page: any, moduleId: string, portlet: string, body: Record<string, string>): Promise<any> {
  const params = new URLSearchParams(body).toString();
  return page.evaluate(async ({ moduleId, portlet, params }) => {
    const resp = await fetch(`/eportal/ui?portal.url=${encodeURIComponent(portlet)}&moduleId=${moduleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: params,
    });
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, result: [], raw: text.slice(0, 200) };
    }
  }, { moduleId, portlet, params });
}

export default class QingdaoCollector extends BaseCollector {
  /**
   * 采集产品信息：官网列表接口 queryData.portlet 按产品代码精确查询
   * 官网仅收录在售产品；查不到（如已下架/理财网特有产品）抛错，提示改用中国理财网源
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }
    try {
      await page.goto(QDCCB_LIST_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);

      const data = await fetchPortlet(page, INFO_MODULE_ID, '/portlet/finance!queryData.portlet', {
        bz: '人民币',
        cpzt: '',
        prdCode: productCode,
        cpdjbm: '',
        cpgly: '',
        fxdj: '',
        yzfs: '',
        qx: '',
        pageNo: '1',
        pageSize: '10',
      });

      const rows = data.result || data.aaData || [];
      if (!rows.length) {
        throw new Error(`官网未找到匹配产品（${productCode}），可改用中国理财网源（需登记编码）`);
      }

      const row = rows[0];
      return {
        productCode: row.prdCode || productCode,
        productName: row.prdName || '',
        registerCode: row.cpdjbm || '',
        riskLevel: mapRiskLevel(row.fxdj),
        productStatus: row.zscxq || '',
        issueDate: normalizeDate(row.estDate),
        operationMode: row.yzfs || '',
        navSourceUrl: QDCCB_LIST_URL,
      };
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值：打开官网详情页（prdcode={代码}1），页面内 fetch queryNavData.portlet 分页取全
   * 净值行字段：nav（单位净值）、navdate（净值日期）
   */
  async collectNavData(productCode: string): Promise<any[]> {
    const page = await createPage();
    if (!page) {
      throw new Error('Playwright Browser 不可用');
    }
    try {
      const detailUrl = `${QDCCB_DETAIL_URL}${productCode}1`;
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const all: any[] = [];
      const pageNo = 1;
      const data = await fetchPortlet(page, NAV_MODULE_ID, '/portlet/finance!queryNavData.portlet', {
        prdcode: `${productCode}1`,
        pageNo: String(pageNo),
        pageSize: String(NAV_PAGE_SIZE),
      });

      if (!data || data.success === false) {
        return [];
      }

      const rows = data.result || data.aaData || [];
      const total = Number(data.totalCount || rows.length);
      all.push(...rows);

      const totalPages = Math.max(1, Math.ceil(total / NAV_PAGE_SIZE));
      for (let p = 2; p <= totalPages; p++) {
        const next = await fetchPortlet(page, NAV_MODULE_ID, '/portlet/finance!queryNavData.portlet', {
          prdcode: `${productCode}1`,
          pageNo: String(p),
          pageSize: String(NAV_PAGE_SIZE),
        });
        const nextRows = (next && (next.result || next.aaData)) || [];
        if (!nextRows.length) break;
        all.push(...nextRows);
      }

      return all
        .map((row: any) => ({
          navDate: row.navdate || '',
          unitNav: row.nav != null ? String(row.nav) : null,
        }))
        .filter((d: any) => d.navDate && d.unitNav !== null);
    } finally {
      await closePage(page);
    }
  }
}
