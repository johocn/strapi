const http = require('http');
const WebSocket = require('e:/code/shao/node_modules/ws');

const HTTP = 'http://127.0.0.1:9223';

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get(HTTP + '/json/list', (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function main() {
  return new Promise(async (resolve, reject) => {
    const targets = await getTargets();
    const page = targets.find((t) => t.type === 'page');
    if (!page) return reject(new Error('no page target'));
    console.log('target url:', page.url);

    const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 100 * 1024 * 1024 });
    let nextId = 0;
    const pending = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
    await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) return { error: JSON.stringify(r.exceptionDetails).slice(0, 200) };
      return r.result ? r.result.value : null;
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    try {
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.setLifecycleEventsEnabled', { enabled: true });

      // 1) 建立 v.joho.cn origin
      await send('Page.navigate', { url: 'http://v.joho.cn/' });
      await sleep(5000);
      const originBefore = await evaluate('window.location.origin');
      console.log('origin:', originBefore);

      // 2) 注入 id2 登录态（inviteCode 真实码 H57G54W7）
      const user = JSON.stringify({
        id: 2, username: 'wx_唐', nickname: 'wx_唐',
        inviteCode: 'H57G54W7', token: 'probe-token',
        createdAt: new Date().toISOString(),
      });
      const inject = await evaluate(`(() => {
        localStorage.setItem('token', 'probe-token');
        localStorage.setItem('user', ${JSON.stringify(user)});
        return { stored: localStorage.getItem('user') };
      })()`);
      console.log('inject result:', JSON.stringify(inject));

      // 3) 导航到 exchange 页，触发 setupPageShare → share_sent 埋点
      await send('Page.navigate', { url: 'http://v.joho.cn/#/pages/exchange/exchange' });
      await sleep(7000);
      const state = await evaluate(`(() => ({
        href: location.href,
        user: localStorage.getItem('user'),
      })())`);
      console.log('after navigate:', JSON.stringify(state));
    } catch (e) {
      reject(e);
    } finally {
      ws.close();
      resolve();
    }
  });
}

main()
  .then(() => {
    console.log('PROBE_DONE');
    process.exit(0);
  })
  .catch((e) => {
    console.error('PROBE_ERROR', e.message);
    process.exit(1);
  });