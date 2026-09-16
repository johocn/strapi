# -*- coding: utf-8 -*-
"""抓取 dashboard 实际请求的 public/config 与 /my/roles 响应"""
import json
from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()
USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)
TENANTS = json.dumps([
    {"id": 2, "documentId": "drxb4lxprzdoyj6tj667wpvb", "siteName": "圣麟口腔"},
], ensure_ascii=False)

captured = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    def on_response(resp):
        if "public/config" in resp.url or "my/roles" in resp.url or "permission-keys" in resp.url:
            try:
                body = resp.json()
            except Exception:
                return
            captured.append({
                "url": resp.url.split("?")[0].split("/api")[-1],
                "status": resp.status,
                "body": body,
            })

    page.on("response", on_response)
    page.goto("https://h.joho.cn", wait_until="networkidle")
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', JSON.stringify(['channel-admin']));
      localStorage.setItem('tadmin_permissions', '[]');
      localStorage.setItem('tadmin_tenant_list', args.tenants);
      localStorage.setItem('tadmin_current_tenant_id', args.tenantId);
    }""", {"token": TOKEN, "user": USER, "tenants": TENANTS, "tenantId": "drxb4lxprzdoyj6tj667wpvb"})

    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    page.wait_for_timeout(6000)

    for c in captured:
        print(f"=== {c['url']} [{c['status']}] ===")
        d = c["body"]
        if isinstance(d, dict) and "data" in d:
            d = d["data"]
        if "moduleGrantedForCurrentTenant" in str(d):
            print("  granted:", {k: v for k, v in d.get("moduleGrantedForCurrentTenant", {}).items() if k in ("website", "points")})
            print("  moduleVisibility.points:", d.get("moduleVisibility", {}).get("points"))
            print("  moduleVisibility.website:", d.get("moduleVisibility", {}).get("website"))
        elif isinstance(d, list) or "roles" in str(d):
            print(" ", json.dumps(d, ensure_ascii=False)[:400])
        else:
            print(" ", json.dumps(d, ensure_ascii=False)[:400])
    browser.close()
