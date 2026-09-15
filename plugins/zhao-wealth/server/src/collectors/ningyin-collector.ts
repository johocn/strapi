'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';
import ChinawealthCollector from './chinawealth-collector';

const NINGYIN_BASE_URL = 'https://www.wmbnb.com';
const DETAIL_PAGE_URL = (productCode: string): string =>
  `${NINGYIN_BASE_URL}/product/productdetails/index.html?projectcode=${productCode}`;

// 翻页保险丝：防止接口异常导致无限循环（65 条约 5 页，日开产品五年约 100 页）
const MAX_PAGES = 500;

/**
 * 宁银理财采集器
 *
 * API 侦查结论（joho 实测）：
 *   官网 /ningbo-web/product/*.json 接口被 nginx WAF 按 TLS 指纹拦截（curl/Node fetch 均 403），
 *   必须 Playwright 真实浏览器会话内 fetch 同源请求。
 *   1. list.json?projectcode=  → 产品信息（登记编码在 id 字段，风险等级 risklevelDesc）
 *   2. funddaytable.json      → 净值分页表 { cdate(ms), netvalue, totalnetvalue, incomeratio }
 *      incomeratio 为近 7 日年化口径（与净值反算吻合），随净值入库为 annualYield
 *   3. 主源失败自动切中国理财网兜底（按登记编码，需调用方传入 registerCode）
 */
export default class NingyinCollector extends BaseCollector {
  /**
   * 采集产品基本信息 — Playwright 会话内 fetch list.json
   * 提取不到结构化信息时返回 null（提示走中国理财网补录登记编码）
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const code = productCode.toUpperCase();
    const page = await createPage();
    if (!page) {
      console.log('[ningyin] Playwright Browser 不可用，产品信息请通过中国理财网补录');
      return null;
    }

    try {
      await page.goto(DETAIL_PAGE_URL(code), { waitUntil: 'domcontentloaded', timeout: 30000 });
      // 官网详情页为 SPA，goto 后会发生重导航，等待 networkidle 消除竞态（超时静默忽略）
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      const info = await page.evaluate(async (c: string) => {
        const res = await fetch(`/ningbo-web/product/list.json?projectcode=${encodeURIComponent(c)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const p = j.list && j.list[0];
        if (!p) return null;
        return {
          productName: p.projectname || '',
          registerCode: p.id || '',
          riskLevel: p.risklevelDesc || '',
          riskLevelRaw: p.risklevelDesc || '',
          productType: 'bank-wealth',
          company: '宁银理财',
          issueDate: p.projectsetupdate ? new Date(p.projectsetupdate).toISOString().slice(0, 10) : '',
        };
      }, code);

      if (!info || !info.productName) {
        console.log('[ningyin] 未提取到产品信息（请确认产品代码或在中国理财网补录登记编码）');
        return null;
      }
      console.log(`[ningyin] 产品信息采集成功: ${info.productName}`);
      return info;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[ningyin] 产品信息采集失败: ${msg}`);
      return null;
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值数据 — 官网 funddaytable 翻页拉全量，失败自动切中国理财网兜底
   * 字段映射：cdate(ms)→navDate、netvalue→unitNav、totalnetvalue→accNav、incomeratio→annualYield
   */
  async collectNavData(productCode: string, options?: { registerCode?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const code = productCode.toUpperCase();
    const registerCode = (options && options.registerCode) || '';
    const startDate = (options && options.startDate) || '2020-01-01';
    const endDate = (options && options.endDate) || todayStr();

    try {
      return await this.collectViaOfficial(code, startDate, endDate);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[ningyin] 官网采集失败(${msg})，改用中国理财网源（登记编码 ${registerCode || '未知'}）`);
      return this.collectViaChinawealth(code, registerCode, msg);
    }
  }

  private async collectViaOfficial(code: string, startDate: string, endDate: string): Promise<any[]> {
    const page = await createPage();
    if (!page) throw new Error('Playwright Browser 不可用');

    try {
      await page.goto(DETAIL_PAGE_URL(code), { waitUntil: 'domcontentloaded', timeout: 30000 });
      // 官网详情页为 SPA，goto 后会发生重导航，等待 networkidle 消除竞态（超时静默忽略）
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      const perPage = 100; // 服务端有封顶（实测约 13-15 条/页），依赖翻页直至 list 为空
      const out: any[] = [];
      for (let pageno = 1; pageno <= MAX_PAGES; pageno++) {
        const url = `/ningbo-web/product/funddaytable.json?code=${encodeURIComponent(code)}&startdate=${startDate}&enddate=${endDate}&request_num=${perPage}&request_pageno=${pageno}`;
        const list = await page.evaluate(
          async (u: string) => {
            const res = await fetch(u, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            return j.list || [];
          },
          url
        );
        if (!list || list.length === 0) break;
        out.push(...list);
      }

      const records = out
        .filter((r: any) => r.cdate != null && (r.netvalue != null || r.totalnetvalue != null))
        .map((r: any) => ({
          navDate: toNavDate(r.cdate),
          unitNav: r.netvalue != null ? String(r.netvalue) : null,
          accNav: r.totalnetvalue != null ? String(r.totalnetvalue) : (r.netvalue != null ? String(r.netvalue) : null),
          annualYield: r.incomeratio != null ? String(r.incomeratio) : undefined,
          dataSource: 'crawler',
        }))
        .filter((r: any) => r.navDate && (r.unitNav || r.accNav));

      // 按日期去重（翻页重叠防御），保持首次出现顺序
      const seen = new Set<string>();
      const uniqueRecords = records.filter((r: any) => {
        if (seen.has(r.navDate)) return false;
        seen.add(r.navDate);
        return true;
      });

      uniqueRecords.sort((a: any, b: any) => String(b.navDate).localeCompare(String(a.navDate)));

      if (uniqueRecords.length === 0) throw new Error('未获取到净值数据');
      console.log(`[ningyin] 官网净值采集完成: code=${code}, 共${uniqueRecords.length}条`);
      return uniqueRecords;
    } finally {
      await closePage(page);
    }
  }

  private async collectViaChinawealth(code: string, registerCode: string, cause: string): Promise<any[]> {
    if (!registerCode) {
      throw new Error(`宁银理财净值采集失败: ${cause}（无登记编码，无法走中国理财网兜底）`);
    }
    const fallback = await new ChinawealthCollector().collectNavData(code, { registerCode });
    if (fallback.length === 0) {
      throw new Error(`宁银理财净值采集失败: ${cause} 改用中国理财网源（登记编码 ${registerCode}）也未获取到净值`);
    }
    console.log(`[ningyin] 中国理财网兜底采集完成: registerCode=${registerCode}, 共${fallback.length}条`);
    return fallback;
  }
}

/** 今天日期 → YYYY-MM-DD（本地时区） */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 日期归一化 → YYYY-MM-DD（兼容毫秒时间戳 / 数字 / 字符串） */
function toNavDate(raw: any): string {
  if (raw == null) return '';
  if (typeof raw === 'number' || /^\d{10,13}$/.test(String(raw))) {
    const n = Number(raw);
    const ms = n < 1e12 ? n * 1000 : n;
    if (ms > 0) {
      const d = new Date(ms);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '';
  }
  const s = String(raw).trim().replace(/[/.]/g, '-');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return s.slice(0, 10);
}
