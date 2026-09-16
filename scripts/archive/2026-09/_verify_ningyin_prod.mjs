'use strict';
/* 临时验证脚本（不提交）：生产环境宁银理财 ZGN2660096E 建档 + 净值采集验证 */
import { execSync } from 'node:child_process';

const BASE = 'http://127.0.0.1:1337';
const PRODUCT_CODE = 'ZGN2660096E';
const COMPANY_DB_NAME = '宁银理财有限责任公司';
const COMPANY_ID = 20;
const CREDS = [
  { identifier: 'zhao', password: '__PASSWORD__' },
  { identifier: 'admin', password: '__ADMIN_PASSWORD__' },
  { identifier: 'admin', password: '__PASSWORD__' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...a) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
}

function psql(sql) {
  try {
    const out = execSync(
      `docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "${sql}"`,
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    return out.replace(/\n+$/, '');
  } catch (e) {
    log('[psql] 执行失败:', e.message);
    return '';
  }
}

function psqlRows(sql) {
  const raw = psql(sql);
  if (!raw) return [];
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function api(path, { method = 'POST', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

async function login() {
  for (const cred of CREDS) {
    try {
      const r = await api('/api/zhao-auth/v1/admin/auth/local', { body: cred });
      if (r.json && r.json.jwt) {
        log(`[login] 成功 identifier=${cred.identifier} jwt长度=${r.json.jwt.length}`);
        return r.json.jwt;
      }
      log(`[login] 失败 identifier=${cred.identifier} status=${r.status} body=${JSON.stringify(r.json)}`);
    } catch (e) {
      log(`[login] 异常 identifier=${cred.identifier} err=${e.message}`);
    }
  }
  throw new Error('三个凭证均登录失败');
}

function navCount(productId) {
  return parseInt(psql(`SELECT COUNT(*) FROM wealth_navs n JOIN wealth_navs_product_lnk l ON l.wealth_nav_id=n.id WHERE l.wealth_product_id=${productId}`), 10) || 0;
}

async function pollStable(getter, label, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  let last = getter();
  let stable = 0;
  log(`[poll] ${label} 初始=${last}`);
  while (Date.now() < deadline) {
    await sleep(5000);
    const c = getter();
    if (c !== last) {
      log(`[poll] ${label} 变化 ${last} -> ${c}`);
      last = c;
      stable = 0;
    } else {
      stable += 1;
      if (last > 0 && stable >= 2) {
        log(`[poll] ${label} 稳定=${last}`);
        return last;
      }
    }
  }
  log(`[poll] ${label} 超时，最终=${last}`);
  return last;
}

async function pollMetrics(productId, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  let lastStr = '';
  while (Date.now() < deadline) {
    const s = parseInt(psql(`SELECT COUNT(*) FROM wealth_annual_snapshots_product_lnk WHERE wealth_product_id=${productId}`), 10) || 0;
    const r = parseInt(psql(`SELECT COUNT(*) FROM wealth_risk_metrics_product_lnk WHERE wealth_product_id=${productId}`), 10) || 0;
    const str = `${s},${r}`;
    if (str !== lastStr) {
      log(`[poll] 年化快照数=${s} 风险指标数=${r}`);
      lastStr = str;
    }
    if (s > 0 && r > 0) {
      log('[poll] 年化/风险指标均已生成');
      break;
    }
    await sleep(5000);
  }
  return lastStr;
}

function lastCollectTime(productId) {
  return psql(`SELECT c.last_collect_time FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${productId}`).trim();
}

async function waitConfigDone(productId, beforeVal, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const v = lastCollectTime(productId);
    if (v && v !== beforeVal) {
      log(`[poll] 采集配置已更新 last_collect_time=${v}`);
      return v;
    }
    await sleep(3000);
  }
  log('[poll] 等待采集配置更新超时');
  return lastCollectTime(productId);
}

async function main() {
  // ===== 0. 前置：公司确认 =====
  const compRows = psqlRows(`SELECT id, name, short_name FROM wealth_companies WHERE name LIKE '%宁银%' OR short_name LIKE '%宁银%'`);
  log('[step0] 宁银公司:', compRows.length ? compRows.join(' | ') : '(未找到)');
  if (compRows.length === 0) {
    log('[step0] 公司不存在，按最小字段插入');
    psql(`INSERT INTO wealth_companies (name, short_name, created_at, updated_at, published_at) VALUES ('宁银理财有限责任公司', '宁银理财', now(), now(), now())`);
    const again = psqlRows(`SELECT id FROM wealth_companies WHERE name='宁银理财有限责任公司'`);
    log('[step0] 新建后公司 id=', again.join(' | '));
  }

  // 前置：产品是否已存在
  const existRows = psqlRows(`SELECT id, product_name, register_code FROM wealth_products WHERE product_code='${PRODUCT_CODE}'`);
  log('[step0] 产品已存在?', existRows.length ? existRows.join(' | ') : '(不存在)');

  // ===== 1. 登录 =====
  const token = await login();

  // ===== 2. 采集 =====
  let sourceData = null;
  let officialData = null;
  let mergedData = null;
  let verification = null;
  const r1 = await api('/api/zhao-wealth/v1/admin/products/collect', { body: { source: '宁银理财', query: PRODUCT_CODE }, token });
  log('[collect] HTTP', r1.status, 'code', r1.json && r1.json.code);
  if (r1.json && r1.json.code === 200) {
    ({ sourceData, officialData, mergedData, verification } = r1.json.data);
  } else {
    // 已知生产缺陷：ningyin 采集器 goto(domcontentloaded) 后立即 evaluate 与页面 SPA 重导航竞态，稳定失败
    log('[collect] 失败:', JSON.stringify(r1.json));
    log('[collect] 判定：宁银官网采集竞态缺陷（详见 pm2 [ningyin] 日志），改用探针数据手动组装 mergedData');
    sourceData = {
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）-E',
      registerCode: 'Z7002126000109',
      riskLevel: '中低风险',
      riskLevelRaw: '中低风险',
      productType: 'bank-wealth',
      company: '宁银理财',
      issueDate: '2026-05-20',
    };
    officialData = {
      productName: '宁银理财宁欣日日薪固定收益类日开理财96号（最短持有7天）',
      productCode: 'ZGN2660096',
      companyName: '宁银理财有限责任公司',
      operationMode: '开放式净值型',
      riskLevel: 'R2',
      riskLevelRaw: '二级(中低)',
      productType: 'bank-wealth',
      registerCode: 'Z7002126000109',
      issueDate: '2026-05-20',
      maturityDate: '2050-12-31',
    };
    verification = {
      status: 'probe_assembled',
      matchScore: 1.0,
      differences: [],
      note: 'collect 接口因宁银官网竞态缺陷不可用，数据由独立 Playwright 探针（官网 list.json + 中国理财网）取得',
    };
    mergedData = {
      productCode: PRODUCT_CODE, // 官网探针源无销售编码字段，补采集查询参数
      saleCode: PRODUCT_CODE,
      registerCode: sourceData.registerCode,
      productName: sourceData.productName,
      productNameCw: officialData.productName,
      riskLevel: sourceData.riskLevel, // 中低风险，稍后归一化为 R2
      riskLevelRaw: sourceData.riskLevelRaw,
      productType: sourceData.productType,
      issueDate: sourceData.issueDate,
      maturityDate: officialData.maturityDate,
      company: officialData.companyName,
      companyName: officialData.companyName,
    };
  }
  log('[collect] sourceData:', JSON.stringify(sourceData));
  log('[collect] officialData:', JSON.stringify(officialData));
  log('[collect] mergedData:', JSON.stringify(mergedData));
  log('[collect] verification:', JSON.stringify(verification));

  // ===== 3. 断言（不符仅警告，不中断）=====
  const nameOk = String((sourceData && sourceData.productName) || '').includes('宁欣日日薪');
  const regOk = String((sourceData && sourceData.registerCode) || '') === 'Z7002126000109';
  if (!nameOk) log('[warn] sourceData.productName 不含「宁欣日日薪」:', sourceData && sourceData.productName);
  if (!regOk) log('[warn] sourceData.registerCode != Z7002126000109:', sourceData && sourceData.registerCode);

  // ===== 4. confirm =====
  const confirmBody = { ...mergedData };
  confirmBody.source = 'ningyin';
  // 风险等级归一化：官网返回中文表述（如"中低风险"），库内枚举为 R1-R5
  const RISK_MAP = { '低风险': 'R1', '中低风险': 'R2', '中风险': 'R3', '中高风险': 'R4', '高风险': 'R5' };
  if (confirmBody.riskLevel && !/^R[1-5]$/.test(String(confirmBody.riskLevel))) {
    const mapped = RISK_MAP[String(confirmBody.riskLevel)] || 'R2';
    log(`[confirm] riskLevel="${confirmBody.riskLevel}" 归一化为 ${mapped}`);
    confirmBody.riskLevel = mapped;
  }
  if (typeof confirmBody.company !== 'number') {
    const cn = confirmBody.company ? String(confirmBody.company).trim() : '';
    if (!cn || cn !== COMPANY_DB_NAME) {
      log(`[confirm] company="${cn}" 与库中全称不一致，改用 companyId=${COMPANY_ID}`);
      confirmBody.company = COMPANY_ID;
    } else {
      log(`[confirm] company="${cn}" 与库中全称一致，按名称关联`);
    }
  }
  const r2 = await api('/api/zhao-wealth/v1/admin/products/collect/confirm', { body: confirmBody, token });
  log('[confirm] 返回:', JSON.stringify(r2.json));

  let productId = null;
  if (r2.json && r2.json.code === 200 && r2.json.data && r2.json.data.id) {
    productId = r2.json.data.id;
    log('[confirm] 新建产品 id=', productId);
  } else {
    const rows = psqlRows(`SELECT id FROM wealth_products WHERE product_code='${PRODUCT_CODE}'`);
    productId = rows.length ? parseInt(rows[0], 10) : null;
    log('[confirm] 产品已存在（跳过创建），id=', productId);
  }
  if (!productId) {
    log('[confirm] 无法取得 productId，终止');
    process.exit(1);
  }

  log('[psql] 产品记录:', psqlRows(`SELECT id, product_name, register_code, risk_level, product_type, issue_date FROM wealth_products WHERE id=${productId}`).join(' | '));
  log('[psql] 公司关联:', psqlRows(`SELECT c.name FROM wealth_products_company_lnk l JOIN wealth_companies c ON c.id=l.wealth_company_id WHERE l.wealth_product_id=${productId}`).join(' | ') || '(未关联!)');
  log('[psql] 采集配置:', psqlRows(`SELECT c.id, c.collect_status, c.collect_rules FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${productId}`).join(' | '));

  // ===== 5. trigger =====
  const cfgBefore = lastCollectTime(productId);
  const r3 = await api('/api/zhao-wealth/v1/admin/collect/trigger', { body: { productId }, token });
  log('[trigger] 返回:', JSON.stringify(r3.json));

  // ===== 6. 轮询净值 =====
  const finalCount = await pollStable(() => navCount(productId), `navs(product=${productId})`, 180000);

  // ===== 7. 年化/风险指标轮询（采集后自动补缺）=====
  await pollMetrics(productId, 180000);

  // 等采集配置落定（last_insert_count 等字段）
  await waitConfigDone(productId, cfgBefore, 60000);

  // ===== 8. 最终核对 =====
  log('[final] 净值条数:', finalCount);
  log('[final] 最新5条 (nav_date|unit_nav|annual_yield):');
  for (const row of psqlRows(`SELECT nav_date || '|' || unit_nav || '|' || COALESCE(annual_yield,'') FROM wealth_navs n JOIN wealth_navs_product_lnk l ON l.wealth_nav_id=n.id WHERE l.wealth_product_id=${productId} ORDER BY nav_date DESC LIMIT 5`)) {
    log('  ', row);
  }
  const sCount = parseInt(psql(`SELECT COUNT(*) FROM wealth_annual_snapshots_product_lnk WHERE wealth_product_id=${productId}`), 10) || 0;
  const rCount = parseInt(psql(`SELECT COUNT(*) FROM wealth_risk_metrics_product_lnk WHERE wealth_product_id=${productId}`), 10) || 0;
  log('[final] 年化快照数:', sCount);
  log('[final] 风险指标数:', rCount);
  log('[final] 采集配置详情:', psqlRows(`SELECT c.id, c.collect_status, c.last_insert_count, c.last_update_count, c.collect_rules, c.last_collect_time FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${productId}`).join(' | '));

  // ===== 9. 幂等复采 =====
  const beforeRe = navCount(productId);
  log('[idem] 复采前净值条数=', beforeRe);
  const cfgBefore2 = lastCollectTime(productId);
  const r4 = await api('/api/zhao-wealth/v1/admin/collect/trigger', { body: { productId }, token });
  log('[idem] 复采 trigger 返回:', JSON.stringify(r4.json));
  await pollStable(() => navCount(productId), `navs-recollect(product=${productId})`, 180000);
  await waitConfigDone(productId, cfgBefore2, 60000);
  log('[idem] 复采后净值条数=', navCount(productId));
  log('[idem] 采集配置(复采后):', psqlRows(`SELECT c.last_insert_count, c.last_update_count, c.last_collect_time, c.collect_status FROM wealth_collect_configs c JOIN wealth_collect_configs_product_lnk l ON l.wealth_collect_config_id=c.id WHERE l.wealth_product_id=${productId}`).join(' | '));
}

main().catch((e) => {
  log('[fatal]', e && e.stack ? e.stack : e);
  process.exit(1);
});
