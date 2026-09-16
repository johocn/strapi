# -*- coding: utf-8 -*-
"""XHR 打点追踪 my/roles 调用"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.add_init_script("""
      window.__xhrLog = [];
      const XHR = XMLHttpRequest.prototype;
      const origOpen = XHR.open;
      const origSend = XHR.send;
      XHR.open = function(method, url) {
        this.__reqUrl = url;
        this.__reqMethod = method;
        this.__reqStack = (new Error()).stack.split('\\n').slice(1, 8).join(' | ');
        return origOpen.apply(this, arguments);
      };
      XHR.send = function() {
        if (this.__reqUrl && String(this.__reqUrl).includes('/api/')) {
          window.__xhrLog.push({ m: this.__reqMethod, url: this.__reqUrl, stack: this.__reqStack });
        }
        return origSend.apply(this, arguments);
      };
    """)

    page.goto("https://h.joho.cn", wait_until="networkidle")
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', JSON.stringify(['channel-admin']));
      localStorage.setItem('tadmin_permissions', '[]');
      localStorage.setItem('tadmin_current_tenant_id', 'drxb4lxprzdoyj6tj667wpvb');
    }""", {"token": TOKEN, "user": USER})

    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    page.wait_for_timeout(6000)

    reqs = page.evaluate("window.__xhrLog")
    print("total requests:", len(reqs))
    for r in reqs:
        u = r["url"]
        print(f"[{r['m']}] {u.split('/api')[-1]}")
        print("   ", r["stack"][:250])
        print()
    browser.close()
