/* 决定性复现：注入 id2 登录态，用微信 UA 打开 exchange 页，抓分享链接与埋点 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9339;
const TARGET = 'https://v.joho.cn/#/pages/exchange/exchange';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003121) NetType/WIFI Language/zh_CN';

const id2User = {
  id: 2, username: 'wx_赵', nickname: 'wx_赵', inviteCode: 'H57G54W7',
  token: 'probe-token',
  createdAt: new Date().toISOString(),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions',
    `--user-agent=${UA}`, 'about:blank',
  ], { stdio: 'ignore' });

  // 等待调试端口可用
  let ver = null;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      ver = await r.json(); break;
    } catch (e) { await sleep(250); }
  }
  if (!ver) { console.log('FAIL: chrome devtools not ready'); chrome.kill(); return; }
  console.log('CDP:', ver['Browser']);

  // 建 target
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tabs.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id; pending[mid] = { res, rej };
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending[msg.id]) { pending[msg.id].res(msg); delete pending[msg.id]; }
  };
  await new Promise(res => ws.onopen = res);

  const tracked = [];
  async function setup() {
    await send('Page.enable'); await send('Network.enable');
    await send('Runtime.enable');
    // 捕获关键请求
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.method === 'Network.requestWillBeSent') {
          const u = msg.params.request.url;
          if (u.includes('invite-flow/track') || u.includes('jssdk-signature') || u.includes('share/visit')) {
            tracked.push({ kind: 'req', url: u, post: msg.params.request.postData || null });
          }
        }
        if (msg.method === 'Network.loadingFinished') {
          // console.log('respUrl', msg.params);
        }
      } catch (e) {}
    });
  }
  await setup();

  // 先在同源空页设置 localStorage（token/user/authConfig），再跳转目标页
  await send('Page.navigate', { url: 'https://v.joho.cn/' });
  await sleep(3500);
  const setupJs = `(() => {
    localStorage.setItem('token', 'probe-token');
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(id2User))});
    localStorage.setItem('authConfig', JSON.stringify({ mode:'sso', siteName:'v', ssoLoginUrl:'', shareTitle:'积分兑换', shareDescription:'快来看看' , methods:['sso']}));
    localStorage.removeItem('isGuest');
    localStorage.setItem('isGuest', 'false');
    localStorage.setItem('inviteTraceSessionId', 'probe_repro_001');
    return { user: localStorage.getItem('user'), token: localStorage.getItem('token'), auth: localStorage.getItem('authConfig') };
  })()`;
  const setupRes = await send('Runtime.evaluate', { expression: setupJs, returnByValue: true });
  console.log('== 注入结果 ==');
  console.log(JSON.stringify(setupRes.result?.result?.value));

  // 跳转 exchange 页并等待 onLaunch/onShow/setupPageShare 跑完
  await send('Page.navigate', { url: TARGET });
  await sleep(6000);

  // 读取可行状态
  const stateJs = `(() => {
    const u = localStorage.getItem('user');
    let parsed; try { parsed = JSON.parse(u); } catch(e){}
    return {
      user: parsed,
      inviteCode_storage: localStorage.getItem('inviteCode'),
      inviteTraceSessionId: localStorage.getItem('inviteTraceSessionId'),
      url: location.href,
    };
  })()`;
  const st = await send('Runtime.evaluate', { expression: stateJs, returnByValue: true });
  console.log('== 页面状态 ==');
  console.log(JSON.stringify(st.result?.result?.value, null, 2));

  console.log('== 捕获的请求 ==');
  for (const t of tracked) {
    console.log('---');
    console.log('URL:', t.url);
    console.log('BODY:', t.post);
  }
  if (tracked.length === 0) console.log('(无 invite-flow/jssdk/share 请求)');

  chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error('ERR', e); process.exit(1); });