'use strict';

import BaseCollector from './base-collector';
import { createPage, closePage } from '../playwright-manager';
import { httpClient } from '../utils/http-client';
import {
  NANYIN_BASE_URL,
  QUERY_NAV_URL,
  NAV_PAGE_URL,
  BROWSER_UA,
  getServerPublicKey,
  generateAesKey,
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
} from './nanyin-utils';

// 翻页保险丝：totalCount 缺失时防止无限循环
const MAX_PAGES = 100;

/**
 * 南银理财采集器
 *
 * API 侦查结论：
 *   净值接口为 RSA/AES 双层加密（Node crypto 原生实现，零新依赖）：
 *   1. GET publicKey.portlet 获取 RSA 公钥（格式不定，兼容 PKCS1/SPKI/base64 解析）
 *   2. 生成随机 16 字节 AES key → AES-128-ECB 加密请求体 data/timeStamp，RSA 加密 aesKey
 *   3. POST queryNetValueList.portlet（Referer/Origin/浏览器 UA）
 *   4. 响应 data.data 为 AES 密文，解密得 { aaData, totalCount, currentPage }
 *   5. 按 currentPage 翻页拉全量；失败（含 502）自动切 Playwright 会话内同源 fetch 兜底
 *
 * 产品信息无公开结构化接口 → 走中国理财网补录（登记编码 Z7003225000398）
 */
export default class NanyinCollector extends BaseCollector {
  /**
   * 采集产品基本信息 — Playwright 打开净值页从 DOM 提取
   * 提取不到结构化信息时返回 null，提示走中国理财网补录
   */
  async collectProductInfo(productCode: string): Promise<any> {
    const code = productCode.toUpperCase();
    const page = await createPage();
    if (!page) {
      console.log('[nanyin] Playwright Browser 不可用，产品信息请通过中国理财网补录（登记编码 Z7003225000398）');
      return null;
    }

    try {
      const url = NAV_PAGE_URL(code);
      console.log(`[nanyin] Playwright 打开净值页: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const info = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const title = (document.title || '').trim();

        // 产品名称：优先结构化节点，回退页面标题
        let productName = '';
        const selectors = ['.product-name', '.prod-name', '.cp-name', '.cpName', '.name', 'h1', 'h2'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          const text = el ? (el.textContent || '').trim() : '';
          if (text && text.length > 2 && text.length <= 60) {
            productName = text;
            break;
          }
        }
        if (!productName && title) {
          productName = title.split(/[-_|]/)[0].trim();
        }
        if (!productName || productName.length < 4) return null;

        // 风险等级（中文/英文均可，仅提取原文）
        let riskLevelRaw = '';
        const riskMatch = bodyText.match(/风险等级[：:\s]*([一二三四五]级|R\s*[1-5])/);
        if (riskMatch) riskLevelRaw = riskMatch[1].replace(/\s+/g, '');

        return {
          productName,
          riskLevel: riskLevelRaw,
          riskLevelRaw,
          productType: 'bank-wealth',
          company: '南银理财',
        };
      });

      if (!info) {
        console.log('[nanyin] 未提取到结构化产品信息，产品信息请通过中国理财网补录（登记编码 Z7003225000398）');
        return null;
      }
      console.log(`[nanyin] 产品信息采集成功: ${info.productName}`);
      return info;
    } catch (error) {
      console.log(`[nanyin] 产品信息采集失败: ${error.message}，产品信息请通过中国理财网补录（登记编码 Z7003225000398）`);
      return null;
    } finally {
      await closePage(page);
    }
  }

  /**
   * 采集净值数据 — RSA/AES 双层加密接口
   *
   * 链路：公钥 → 随机 AES key → 加密请求体（data/timeStamp/AES，aesKey/RSA）
   *       → POST 翻页 → 解密 data.data → aaData 映射 → 过滤排序
   * 字段映射：date→navDate、netValue→unitNav、cumulativeNetValue→accNav（缺省回退 unitNav）
   */
  async collectNavData(productCode: string, options?: { registerCode?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const code = productCode.toUpperCase();
    const allRecords: any[] = [];
    let rawCount = 0;

    try {
      // 1. 服务器 RSA 公钥 + 随机 16 字符 AES key（与官网 genKey 一致）
      const publicKey = await getServerPublicKey();
      const aesKey = generateAesKey();

      // 2. currentPage 从 1 递增翻页，直到收满 totalCount 或返回空
      for (let currentPage = 1; currentPage <= MAX_PAGES; currentPage++) {
        // 3. 组装双层加密请求体
        const payload = JSON.stringify({
          productCode: code,
          startDate: (options && options.startDate) || '',
          endDate: (options && options.endDate) || '',
          currentPage,
        });
        const body = {
          data: aesEncrypt(payload, aesKey),
          aesKey: rsaEncrypt(aesKey, publicKey),
          timeStamp: aesEncrypt(String(Date.now()), aesKey),
        };

        // 4. POST 净值接口（httpClient 优先；502/非 2xx 自动切 Playwright 会话兜底）
        const resp = await this.postNavQuery(code, body);

        // 5. 解密响应 data.data → { aaData, totalCount, currentPage }
        const cipherBase64 = resp && resp.data;
        if (!cipherBase64) throw new Error('响应缺少 data.data');
        const parsed = JSON.parse(aesDecrypt(cipherBase64, aesKey));
        const aaData = Array.isArray(parsed.aaData) ? parsed.aaData : [];
        const totalCount = parsed.totalCount != null ? Number(parsed.totalCount) : 0;

        // 6. 映射标准净值字段
        for (const r of aaData) {
          const navDate = toNavDate(r.date);
          const unitNav = r.netValue != null ? String(r.netValue) : null;
          allRecords.push({
            navDate,
            unitNav,
            accNav: r.cumulativeNetValue != null ? String(r.cumulativeNetValue) : unitNav,
            dataSource: 'crawler',
          });
        }
        rawCount += aaData.length;

        // 7. 终止条件：本页为空 / 已收满 totalCount
        if (aaData.length === 0) break;
        if (totalCount > 0 && allRecords.length >= totalCount) break;
      }

      // 8. 过滤无效记录（无日期或净值全空），按日期降序
      const validData = allRecords.filter((d: any) => d.navDate && (d.unitNav || d.accNav));
      validData.sort((a: any, b: any) => String(b.navDate).localeCompare(String(a.navDate)));

      if (validData.length === 0) throw new Error('未获取到净值数据');

      console.log(`[nanyin] 净值采集完成: code=${code}, 共${validData.length}条（原始${rawCount}条）`);
      return validData;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`南银理财净值采集失败: ${msg} 改用中国理财网源（登记编码 Z7003225000398）`);
    }
  }

  /**
   * POST 净值接口 — httpClient 优先，502/非 2xx 切 Playwright 会话兜底
   */
  private async postNavQuery(productCode: string, body: object): Promise<any> {
    try {
      const resp = await httpClient.post(QUERY_NAV_URL, body, {
        headers: {
          'User-Agent': BROWSER_UA,
          'Origin': NANYIN_BASE_URL,
          'Referer': NAV_PAGE_URL(productCode),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return resp.data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // 仅服务器错误（4xx/5xx）触发 Playwright 兜底；网络错误直接抛出
      if (/HTTP [45]\d{2}/.test(msg)) {
        console.log(`[nanyin] HTTP 异常(${msg})，改用 Playwright 会话请求`);
        return this.postNavQueryViaPlaywright(productCode, body);
      }
      throw error;
    }
  }

  /**
   * Playwright 兜底：页面会话内同源 fetch（自动携带 Cookie）
   * 请求体仍为 Node 端已加密的 JSON 字符串，解密仍在 Node 端完成
   */
  private async postNavQueryViaPlaywright(productCode: string, body: object): Promise<any> {
    const page = await createPage();
    if (!page) throw new Error('Playwright Browser 不可用');

    try {
      await page.goto(NAV_PAGE_URL(productCode), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const bodyStr = JSON.stringify(body);
      return await page.evaluate(
        async (args: { fetchUrl: string; bodyStr: string }) => {
          const res = await fetch(args.fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: args.bodyStr,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        },
        { fetchUrl: QUERY_NAV_URL, bodyStr }
      );
    } finally {
      await closePage(page);
    }
  }
}

/**
 * 日期归一化 → YYYY-MM-DD
 * 兼容 YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD / 时间戳（秒/毫秒）
 */
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
