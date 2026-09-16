# -*- coding: utf-8 -*-
"""给 fetch/XHR 打点，捕获 my/roles 相关调用"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)

logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.add_init_script("""
      window.__reqLog = [];
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
        window.__reqLog.push({ t: 'fetch', url: url, stack: (new Error()).stack.split('\\n').slice(1, 6) });
        return origFetch.apply(this, args);
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

    reqs = page.evaluate("window.__reqLog")
    for r in reqs:
        print("URL:", r["url"])
        for s in r["stack"]:
            print("   ", s.strip()[:150])
        print()
    browser.close()
