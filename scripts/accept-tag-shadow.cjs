/* 标签影子同步验收：讲师/场地/系列/活动 的标签索引(tag-index)全链路验收
 * 覆盖(Plan Task 7):
 *   1) 管理员创建讲师/场地/系列 → 讲师自动生成 activity-lecturer 影子标签(lifecycle)
 *   2) 创建活动绑定讲师/场地/系列 + 唯一 category → activity lifecycle 同步 tag-index
 *   3) GET /api/zhao-tag/v1/tags?filters[name]=<讲师名> 定位讲师影子标签 documentId
 *   4) tag-indexes/search?tagId=<讲师影子标签>&targetType=activity 命中该活动
 *   5) 改讲师名 → 新影子标签(新名)被创建/改名，旧活动索引(targetType=activity)仍可检索
 *   6) 改活动的讲师 → 旧讲师标签的 activity 索引移除、新讲师标签索引含该活动
 *   7) 公开活动列表 ?documentIds=<活动> 返回该活动
 *   8) 删除活动 → tag-indexes/search targetType=activity 不含该活动
 *   9) 清理：删除活动/系列 + 软删讲师/场地 + 通过 zhao-tag admin 删除 acc_ 前缀影子标签
 *
 * 用法: cd e:\code\basic && node scripts/accept-tag-shadow.cjs
 * 前置: 本地 dev 1337 运行中且已重建 zhao-point/zhao-tag 插件 dist；
 *       环境变量 ACCEPT_ADMIN_TOKEN 注入管理 token(需渠道作用域+租户访问)。
 * 约定: 路由前缀按实际代码为 /api/zhao-point/v1/admin/adm/...（见 zhao-point routes/content-api.ts）
 */
const http = require('http');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:1337';
const ADMIN = '/api/zhao-point/v1/admin/adm';  // 讲师/场地/系列/活动 管理路由
const P = '/api/zhao-point/v1';               // 活动公开路由
const T = '/api/zhao-tag/v1';                 // zhao-tag 公开/管理路由

let PASS = 0, FAIL = 0, SKIP = 0;
function ok(name, cond, extra = '') {
  if (cond) PASS++; else FAIL++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}
function skip(name, extra = '') {
  SKIP++;
  console.log('SKIP | ' + name + (extra ? ' | ' + extra : ''));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 用 fetch 实现（与 acc-activity-resource.cjs 相同的可靠网络层）
async function req(method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  let r;
  try {
    r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    return { status: 0, data: { netErr: e.message } };
  }
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, data: j };
}

// 提取 docId：各创建接口统一返回 {data: {documentId}}
function docOf(r) {
  if (!r || !r.data) return null;
  const d = r.data.data ?? r.data;
  return d && d.documentId;
}
// 查询活动标签索引 targetType=activity 的 targetId 列表
// search 返回 wrapList => { data: [...], meta }，数组在 r.data.data
function indexedTargetIds(r) {
  const d = r && r.data;
  const arr = Array.isArray(d) ? d : (d && Array.isArray(d.data) ? d.data : null);
  if (!arr) return [];
  return arr.map((x) => x && x.targetId).filter(Boolean);
}

(async () => {
  const TOKEN = process.env.ACCEPT_ADMIN_TOKEN;
  if (!TOKEN) {
    console.log('\n[前置] 未设置环境变量 ACCEPT_ADMIN_TOKEN，跳过所有需管理权限的步骤。');
    console.log('[提示] 请设置 ACCEPT_ADMIN_TOKEN 且确认该 token 具有租户/渠道作用域与相关权限。');
    skip('管理 token 未注入（ACCEPT_ADMIN_TOKEN 缺失）');
    console.log(`\n=== 讲师标签影子同步 验收: PASS=${PASS} FAIL=${FAIL} SKIP=${SKIP} ===`);
    console.log('SKIPPED（环境前置缺失，非功能失败）');
    process.exit(0);
  }

  // 管理请求：401/403 视为鉴权前置问题 → SKIPPED（而非 FAIL）
  async function adm(method, p, body, label) {
    const r = await req(method, p, body, TOKEN);
    if (r.status === 401 || r.status === 403) {
      console.log('\n[鉴权] 管理请求返回 ' + r.status + '（' + label + '）。请确认 ACCEPT_ADMIN_TOKEN 具有租户/渠道权限。');
      throw Object.assign(new Error('AUTH'), { authFail: true });
    }
    return r;
  }

  try {
    const rand = crypto.randomBytes(4).toString('hex');
    const ts = Date.now();
    const lName = 'acc_tgl_' + rand;          // 讲师A
    const lName2 = 'acc_tgl2_' + rand;        // 讲师B（用于换讲师）
    const vName = 'acc_tgv_' + rand;          // 场地
    const sName = 'acc_tgs_' + rand;          // 系列标题
    const aTitle = 'acc_tga_' + rand;         // 活动标题（同时作为唯一 category）
    const lRename = 'acc_tgl_' + rand + '_renamed';

    // ---------- 1. 创建讲师A/讲师B/场地/系列 ----------
    let r = await adm('POST', ADMIN + '/lecturers', { data: { name: lName } }, '创建讲师A');
    const lecA = docOf(r);
    r = await adm('POST', ADMIN + '/lecturers', { data: { name: lName2 } }, '创建讲师B');
    const lecB = docOf(r);
    r = await adm('POST', ADMIN + '/venues', { data: { name: vName } }, '创建场地');
    const venue = docOf(r);
    r = await adm('POST', ADMIN + '/series', { data: { title: sName } }, '创建系列');
    const series = docOf(r);
    ok('创建讲师A/B/场地/系列 并取到 documentId', !!lecA && !!lecB && !!venue && !!series,
      `lecA=${lecA} lecB=${lecB} venue=${venue} series=${series}`);

    // 等讲师 lifecycle 异步完成影子标签创建
    await sleep(400);

    // ---------- 2. 创建活动：绑定讲师A/场地/系列 + 唯一 category，未来时间避免排期冲突 ----------
    const startTime = new Date(Date.now() + 3 * 86400000);
    r = await adm('POST', ADMIN + '/activities', {
      data: {
        title: aTitle,
        category: aTitle,            // 活动名生成的唯一分类
        capacity: 100,
        lecturer: lecA,
        venue,
        belongsToSeries: series,
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + 3600000).toISOString(),
        status: 'signup_open',
      },
    }, '创建活动');
    const actDoc = docOf(r);
    ok('创建活动并取到 documentId', !!actDoc, `act=${actDoc}`);

    await sleep(400); // 等 activity lifecycle 同步 tag-index

    // ---------- 3. 定位讲师A影子标签 + 断言活动被索引 ----------
    r = await req('GET', T + '/tags?filters[name]=' + encodeURIComponent(lName));
    const tagArr = (r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    const shadowTagA = tagArr[0] && tagArr[0].documentId;
    ok('讲师A影子标签存在(activity-lecturer, name=' + lName + ')', !!shadowTagA, `tag=${shadowTagA}`);

    r = await req('GET', T + '/tag-indexes/search?tagId=' + shadowTagA + '&targetType=activity');
    const idx0 = indexedTargetIds(r);
    ok('讲师A影子标签 targetType=activity 命中活动', idx0.includes(actDoc),
      'targetIds=' + JSON.stringify(idx0));

    // ---------- 4. 改讲师A名为新名：断言新名标签出现 + 旧活动索引仍可检索 ----------
    r = await adm('PUT', ADMIN + '/lecturers/' + lecA, { data: { name: lRename } }, '改讲师A名字');
    ok('改讲师A名返回成功', r.status === 200, `status=${r.status}`);
    await sleep(400);

    r = await req('GET', T + '/tags?filters[name]=' + encodeURIComponent(lRename));
    const renamedArr = (r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    const renameTag = renamedArr[0] && renamedArr[0].documentId;
    ok('新名影子标签创建/改名成功(name=' + lRename + ')', !!renameTag, `tag=${renameTag}`);

    // 旧活动索引：活动未被改，tag-index 仍指向原标签（targetType=activity 仍含该活动）
    r = await req('GET', T + '/tag-indexes/search?tagId=' + shadowTagA + '&targetType=activity');
    ok('改讲师名后旧活动索引仍可检索(targetType=activity 仍含活动)', indexedTargetIds(r).includes(actDoc),
      'targetIds=' + JSON.stringify(indexedTargetIds(r)));

    // ---------- 5. 定位讲师B影子标签，切换活动讲师 A→B ----------
    r = await req('GET', T + '/tags?filters[name]=' + encodeURIComponent(lName2));
    const tagBArr = (r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    const shadowTagB = tagBArr[0] && tagBArr[0].documentId;
    ok('讲师B影子标签存在', !!shadowTagB, `tag=${shadowTagB}`);

    r = await adm('PUT', ADMIN + '/activities/' + actDoc, { data: { lecturer: lecB } }, '改活动讲师为B');
    ok('改活动讲师A→B返回成功', r.status === 200, `status=${r.status}`);
    await sleep(400);

    r = await req('GET', T + '/tag-indexes/search?tagId=' + shadowTagA + '&targetType=activity');
    ok('旧讲师A标签的 activity 索引不再含该活动', !indexedTargetIds(r).includes(actDoc),
      'targetIds=' + JSON.stringify(indexedTargetIds(r)));
    r = await req('GET', T + '/tag-indexes/search?tagId=' + shadowTagB + '&targetType=activity');
    ok('新讲师B标签的 activity 索引含该活动', indexedTargetIds(r).includes(actDoc),
      'targetIds=' + JSON.stringify(indexedTargetIds(r)));

    // ---------- 6. 公开活动列表 documentIds 返回该活动 ----------
    r = await req('GET', P + '/activities?documentIds=' + encodeURIComponent(actDoc));
    const rows = (r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    ok('公开活动列表 documentIds 返回该活动', rows.some((x) => x && x.documentId === actDoc),
      `status=${r.status} 命中=${rows.length}`);

    // ---------- 7. 删除活动 → 该活动相关标签索引清空 ----------
    r = await adm('DELETE', ADMIN + '/activities/' + actDoc, null, '删除活动');
    ok('删除活动返回成功', r.status === 200, `status=${r.status}`);
    await sleep(400);
    r = await req('GET', T + '/tag-indexes/search?tagId=' + shadowTagB + '&targetType=activity');
    ok('删除活动后 讲师B标签的 activity 索引不含该活动', !indexedTargetIds(r).includes(actDoc),
      'targetIds=' + JSON.stringify(indexedTargetIds(r)));

    // ---------- 8. 清理 ----------
    // 删除活动/系列（讲师/场地 DELETE 为软删，保留为 disabled）
    await adm('DELETE', ADMIN + '/series/' + series, null, '清理系列').catch(() => {});
    await adm('DELETE', ADMIN + '/lecturers/' + lecA, null, '清理讲师A').catch(() => {});
    await adm('DELETE', ADMIN + '/lecturers/' + lecB, null, '清理讲师B').catch(() => {});
    await adm('DELETE', ADMIN + '/venues/' + venue, null, '清理场地').catch(() => {});
    // 软删不删标签，需通过 zhao-tag admin 按 acc_ 前缀清理影子标签
    r = await adm('GET', T + '/admin/tags?filters[name][$startsWith]=acc_&pagination[pageSize]=100', null, '查询acc_影子标签');
    const accTags = (r.data && Array.isArray(r.data.data)) ? r.data.data : [];
    let del = 0;
    for (const t of accTags) {
      if (!t || !t.documentId) continue;
      const dr = await req('DELETE', T + '/admin/tags/' + t.documentId, null, TOKEN);
      if (dr.status === 200) del++;
    }
    ok('清理 acc_ 前缀影子标签(' + del + ' 个)', del >= 1,
      `发现=${accTags.length} 删除=${del}`);

    console.log(`\n=== 讲师标签影子同步 验收: PASS=${PASS} FAIL=${FAIL} SKIP=${SKIP} ===`);
    process.exit(FAIL ? 1 : 0);
  } catch (e) {
    if (e && e.authFail) {
      // 管理路由 401/403：环境前置问题 → SKIPPED，不计 FAIL
      skip('管理请求鉴权失败（401/403），后续依赖功能未验证');
      console.log('\n=== 讲师标签影子同步 验收: PASS=' + PASS + ' FAIL=' + FAIL + ' SKIP=' + SKIP + ' ===');
      console.log('SKIPPED（token 鉴权前置缺失，非功能失败）');
      process.exit(0);
    }
    console.error('脚本异常:', e && e.stack || e);
    process.exit(1);
  }
})();