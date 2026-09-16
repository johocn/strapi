# -*- coding: utf-8 -*-
"""列出页面全部 API 请求 URL（排查 /my/roles 是否发出）"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)

urls = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    def on_request(req):
        if "/api/" in req.url:
            urls.append(f"{req.method} {req.url.split('/api')[-1]}")

    page.on("request", on_request)
    page.goto("https://h.joho.cn", wait_until="networkidle")
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', JSON.stringify(['channel-admin']));
      localStorage.setItem('tadmin_permissions', '[]');
      localStorage.setItem('tadmin_tenant_list', JSON.stringify([]));
      localStorage.setItem('tadmin_current_tenant_id', 'drxb4lxprzdoyj6tj667wpvb');
    }""", {"token": TOKEN, "user": USER})

    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    page.wait_for_timeout(6000)

    for u in urls:
        print(u)
    browser.close()
