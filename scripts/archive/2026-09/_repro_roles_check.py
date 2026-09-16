# -*- coding: utf-8 -*-
"""验证 /my/roles 网络层 + 检查产物引用"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://h.joho.cn", wait_until="networkidle")

    # 直接 fetch /my/roles
    result = page.evaluate("""async (token) => {
      const r = await fetch('/api/zhao-auth/v1/my/roles', {
        headers: { 'Authorization': 'Bearer ' + token, 'x-site-id': 'drxb4lxprzdoyj6tj667wpvb' }
      })
      const body = await r.json()
      return { status: r.status, body: body }
    }""", TOKEN)
    print("fetch /my/roles:", result["status"], json.dumps(result["body"], ensure_ascii=False)[:300])

    # 注入登录状态后完整加载
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', JSON.stringify(['channel-admin']));
      localStorage.setItem('tadmin_permissions', '[]');
      localStorage.setItem('tadmin_current_tenant_id', 'drxb4lxprzdoyj6tj667wpvb');
    }""", {"token": TOKEN, "user": USER})

    logs = []
    page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    page.wait_for_timeout(6000)
    print("--- console logs ---")
    for l in logs[:30]:
        print(l[:250])
    browser.close()
