# -*- coding: utf-8 -*-
"""记录页面加载的 JS chunk URL"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)

chunks = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    def on_request(req):
        if ".js" in req.url and "assets/" in req.url:
            chunks.append(req.url.split("/")[-1])

    page.on("request", on_request)
    page.goto("https://h.joho.cn", wait_until="networkidle")
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', JSON.stringify(['channel-admin']));
      localStorage.setItem('tadmin_permissions', '[]');
      localStorage.setItem('tadmin_current_tenant_id', 'drxb4lxprzdoyj6tj667wpvb');
    }""", {"token": TOKEN, "user": USER})

    chunks.clear()
    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    page.wait_for_timeout(6000)

    for c in sorted(set(chunks)):
        print(c)
    browser.close()
