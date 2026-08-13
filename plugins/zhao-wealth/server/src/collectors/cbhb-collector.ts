'use strict';

import BaseCollector from './base-collector';
import { httpClient } from '../utils/http-client';

const BASE_URL = 'https://www.cbhbwm.com.cn';

// 风险等级映射（文本）
const RISK_MAP: Record<string, string> = {
  '低风险': 'R1',
  '中低风险': 'R2',
  '中风险': 'R3',
  '中高风险': 'R4',
  '高风险': 'R5',
};

// 风险等级映射（API 数字编码）
const RISK_CODE_MAP: Record<string, string> = {
  '01': 'R1',
  '02': 'R2',
  '03': 'R3',
  '04': 'R4',
  '05': 'R5',
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
   * 通过销售编码采集渤银理财产品详情 — 直接调用 API
   * API: POST /eportalapply/portlet/bwmweb/queryGPro
   *
   * 字段映射：
   *   prodName  → productName
   *   saleCode  → saleCode / productCode
   *   checkInon → registerCode（登记编码）
   *   orgnoName → issuer（发行机构）
   *   riskLev   → riskLevel（"01"=R1, "02"=R2...）
   *   achievementValue → benchmark（业绩比较基准）
   *   subsBdate → issueDate（募集起始日 YYYYMMDD→YYYY-MM-DD）
   *   endDate   → maturityDate（到期日）
   *   establishDate → establishDate（成立日）
   *   gwProdCycle → 产品周期类型
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const saleCode = productCode;
    const url = `${BASE_URL}/eportalapply/portlet/bwmweb/queryGPro`;

    const params = new URLSearchParams({
      pageNo: '1',
      pageSize: '10',
      sortKey: '',
      sortType: '',
      searchStr: '',
      collMod: '',
      custType: '',
      gwProdMod: '',
      gwProdCycle: '',
      prodSeriesId: '',
      prodSaleStatus: '',
      saleCode,
    });

    try {
      const resp = await httpClient.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${saleCode}`,
        },
      });

      const raw = resp.data;
      const parsed = typeof raw.data === 'string' ? JSON.parse(raw.data) : raw.data;
      const records = parsed.data || [];

      if (records.length === 0) {
        console.log(`[cbhb] 产品详情API未返回数据: saleCode=${saleCode}`);
        return null;
      }

      const r = records[0];

      // 日期格式转换 YYYYMMDD → YYYY-MM-DD
      const formatDate = (d: string): string => {
        if (!d || d.length !== 8) return d || '';
        return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
      };

      // 风险等级：优先用 API 编码映射，回退到文本匹配
      const riskLevCode = String(r.riskLev || '');
      const riskLevel = RISK_CODE_MAP[riskLevCode] || 'R2';

      // 期限类型：根据产品期限天数推断
      const prodPeriod = Number(r.prodPeriod || 0);
      let termType = 'medium';
      if (prodPeriod > 0) {
        if (prodPeriod <= 180) termType = 'short';
        else if (prodPeriod <= 365) termType = 'medium';
        else termType = 'long';
      }

      // 产品状态映射
      const statusMap: Record<string, string> = {
        '0': '待售',
        '1': '在售',
        '2': '已结束',
        '3': '已到期',
      };
      const productStatus = statusMap[String(r.prodSaleStatus)] || '';

      console.log(`[cbhb] 产品详情API采集完成: prodName=${r.prodName}, registerCode=${r.checkInon}`);

      return {
        saleCode: r.saleCode || saleCode,
        productCode: r.saleCode || saleCode,
        productName: r.prodName || '',
        registerCode: r.checkInon || '',
        riskLevel,
        riskLevelRaw: r.riskLev || '',
        termType,
        termTypeRaw: r.prodPeriod ? `${r.prodPeriod}天` : '',
        productType: 'bank-wealth',
        productTypeRaw: '固定收益类',
        issueDate: formatDate(r.subsBdate),
        maturityDate: formatDate(r.endDate),
        establishDate: formatDate(r.establishDate),
        benchmark: r.achievementValue || '',
        company: '渤银理财',
        issuer: r.orgnoName || '渤银理财有限责任公司',
        distributor: r.sumDistributorName || '',
        productStatus,
      };
    } catch (error) {
      throw new Error(`渤银产品详情API采集失败: ${error.message}`);
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
