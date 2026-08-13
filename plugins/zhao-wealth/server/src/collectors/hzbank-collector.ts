'use strict';

import BaseCollector from './base-collector';
import { httpClient } from '../utils/http-client';

/**
 * 杭银理财采集器
 *
 * API 发现过程：
 *   通过 Playwright 抓包 https://www.hzbankwealth.com.cn/hzbankwealth/xqy/gmcp/index.html?code=JQB2668J
 *   发现所有数据均通过静态 JSON 文件加载，无需认证，直接 GET 即可
 *
 * API 端点（均为 GET，返回 JSON）：
 *   1. 净值数据: /eportal/hzbw/netval/{productCode}_netval.json
 *      → 数组：[{ net_value_date, unit_net_value, acc_net_value, seven_days_annualized_rate, ten_thousand_income }]
 *   2. 产品详情: /eportal/hzbw/detail/{productCode}_detail.json
 *      → 对象：{ contenttitle, dengjino, rizengzhang, touzileixin, yunzuomoshi, licaiqixian, ... }
 *   3. 时间线: /eportal/hzbw/timeline/{productCode}_timeline.json
 *   4. 销售方: /eportal/hzbw/seller/{productCode}_seller.json
 *   5. 公告: /eportal/hzbw/announcement/{productCode}_announcement.json
 *
 * 技术选型：axios
 *   - 自动 JSON 解析（resp.data 即对象，无需手动 JSON.parse）
 *   - 统一超时和错误处理
 *   - 请求/响应拦截器记录日志
 */

const BASE_URL = 'https://www.hzbankwealth.com.cn';

// 风险等级映射（杭银理财用中文描述风险等级，字段名 rizengzhang 实际存的是风险等级）
const RISK_MAP: Record<string, string> = {
  '低风险': 'R1',
  '中低风险': 'R2',
  '中风险': 'R3',
  '中高风险': 'R4',
  '高风险': 'R5',
};

// 运作模式映射
const OPMODE_MAP: Record<string, string> = {
  '开放式': 'open',
  '封闭式': 'closed',
  '定期开放式': 'periodic',
};

export default class HzbankCollector extends BaseCollector {
  /**
   * 采集净值数据 — 直接 GET 静态 JSON 文件
   *
   * API: GET /eportal/hzbw/netval/{productCode}_netval.json
   * 无需认证，无需 Playwright，纯 HTTP 请求
   *
   * 字段映射：
   *   net_value_date → navDate（已是 YYYY-MM-DD 格式）
   *   unit_net_value → unitNav（单位净值）
   *   acc_net_value  → accNav（累计净值）
   *   ten_thousand_income → tenThousandIncome（万份收益，货币基金类用）
   *   seven_days_annualized_rate → sevenDayAnnualized（七日年化收益率）
   */
  async collectNavData(productCode: string, options?: { registerCode?: string }): Promise<any[]> {
    const code = productCode.toUpperCase();
    const url = `${BASE_URL}/eportal/hzbw/netval/${code}_netval.json`;

    try {
      const resp = await httpClient.get(url, {
        headers: {
          'Referer': `${BASE_URL}/hzbankwealth/xqy/gmcp/index.html?code=${productCode}`,
        },
      });

      // axios 自动解析 JSON，resp.data 已是数组
      const records = Array.isArray(resp.data) ? resp.data : [];

      const navData = records.map((r: any) => ({
        navDate: r.net_value_date || '',
        unitNav: r.unit_net_value != null ? String(r.unit_net_value) : null,
        accNav: r.acc_net_value != null ? String(r.acc_net_value) : null,
        tenThousandIncome: r.ten_thousand_income != null ? String(r.ten_thousand_income) : null,
        sevenDayAnnualized: r.seven_days_annualized_rate != null ? String(r.seven_days_annualized_rate) : null,
        dataSource: 'crawler',
      }));

      // 过滤无效记录（无日期或净值全为空）
      const validData = navData.filter((d: any) => d.navDate && (d.unitNav || d.accNav || d.tenThousandIncome));

      // 按日期降序排序
      validData.sort((a: any, b: any) => b.navDate.localeCompare(a.navDate));

      console.log(`[hzbank] 净值采集完成: code=${code}, 共${validData.length}条（原始${navData.length}条）`);
      return validData;
    } catch (error) {
      throw new Error(`杭银净值采集失败: ${error.message}`);
    }
  }

  /**
   * 采集产品基本信息 — GET 静态 JSON 文件
   *
   * API: GET /eportal/hzbw/detail/{productCode}_detail.json
   *
   * 字段映射：
   *   contenttitle → productName
   *   dengjino     → registerCode（登记编码）
   *   rizengzhang  → riskLevel（风险等级，中文描述）
   *   touzileixin  → productTypeRaw（投资类型）
   *   yunzuomoshi  → operationMode（运作模式）
   *   licaiqixian  → termInfo（理财期限）
   *   chengliriqi  → establishDate（成立日期）
   *   jieshuriqi   → maturityDate（结束日期）
   *   danweijingzhi → unitNetValue（当前单位净值）
   *   leijijingzhi → accNetValue（当前累计净值）
   *   seven_days_annualized_rate → sevenDayAnnualized
   *   ten_thousand_income → tenThousandIncome
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const code = productCode.toUpperCase();
    const url = `${BASE_URL}/eportal/hzbw/detail/${code}_detail.json`;

    try {
      const resp = await httpClient.get(url, {
        headers: {
          'Referer': `${BASE_URL}/hzbankwealth/xqy/gmcp/index.html?code=${productCode}`,
        },
      });

      const d = resp.data;
      if (!d || !d.contenttitle) {
        console.log(`[hzbank] 产品详情为空: code=${code}`);
        return null;
      }

      // 风险等级解析
      const riskText = d.rizengzhang || '';
      const riskLevel = this.parseRiskLevel(riskText);

      // 运作模式解析
      const opModeText = d.yunzuomoshi || '';
      const operationMode = OPMODE_MAP[opModeText] || 'open';

      // 产品类型映射
      let productType = 'bank-wealth';
      if (d.touzileixin === '固定收益类') productType = 'bank-wealth';
      else if (d.touzileixin === '权益类') productType = 'stock-fund';
      else if (d.touzileixin === '混合类') productType = 'mixed-fund';

      return {
        productCode: code,
        productName: d.contenttitle || '',
        registerCode: d.dengjino || '',
        riskLevel,
        riskLevelRaw: riskText,
        productType,
        productTypeRaw: d.touzileixin || '',
        operationMode,
        operationModeRaw: opModeText,
        termInfo: d.licaiqixian || '',
        establishDate: d.chengliriqi || '',
        maturityDate: d.jieshuriqi || '',
        issueDate: d.order_fund_date || '',
        unitNetValue: d.danweijingzhi || '',
        accNetValue: d.leijijingzhi || '',
        sevenDayAnnualized: d.seven_days_annualized_rate || '',
        tenThousandIncome: d.ten_thousand_income || '',
        company: '杭银理财',
        issuer: d.guanliren || '杭银理财有限责任公司',
        custodian: d.tuoguanren || '',
        salesTarget: d.xiaoshouduixiang || '',
        productStatus: d.chanpinzhuangtai || '',
        leixing: d.leixing || '',
      };
    } catch (error) {
      throw new Error(`杭银产品详情采集失败: ${error.message}`);
    }
  }

  /**
   * 解析风险等级
   * 按关键词长度降序检查，避免"低风险"匹配到"中低风险"的子串
   */
  private parseRiskLevel(text: string): string {
    const sortedKeys = Object.keys(RISK_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) return RISK_MAP[key];
    }
    return 'R2';
  }
}
