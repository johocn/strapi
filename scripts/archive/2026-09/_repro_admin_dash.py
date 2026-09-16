# -*- coding: utf-8 -*-
"""复现 admin 用户 dashboard 积分管理可见性"""
import json
import sys
import time

from playwright.sync_api import sync_playwright

TOKEN = open(r"e:\code\basic\scripts\_admin_token.txt", encoding="utf-8").read().strip()

USER = json.dumps({"id": 1, "username": "admin", "email": "admin@example.com"}, ensure_ascii=False)
ROLES = json.dumps(["channel-admin"])
PERMS = json.dumps([])  # 留空让前端重新拉取
TENANTS = json.dumps([
    {"id": 2, "documentId": "drxb4lxprzdoyj6tj667wpvb", "siteName": "圣麟口腔"},
    {"id": 3, "documentId": "o1cxh6bxyjlnbpi8pt09jrhf", "siteName": "锦润学域"},
], ensure_ascii=False)
TENANT_ID = "drxb4lxprzdoyj6tj667wpvb"

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

    page.goto("https://h.joho.cn", wait_until="networkidle")
    page.evaluate("""(args) => {
      localStorage.setItem('tadmin_token', args.token);
      localStorage.setItem('tadmin_user', args.user);
      localStorage.setItem('tadmin_roles', args.roles);
      localStorage.setItem('tadmin_permissions', args.perms);
      localStorage.setItem('tadmin_tenant_list', args.tenants);
      localStorage.setItem('tadmin_current_tenant_id', args.tenantId);
    }""", {"token": TOKEN, "user": USER, "roles": ROLES, "perms": PERMS, "tenants": TENANTS, "tenantId": TENANT_ID})

    page.goto("https://h.joho.cn/#/pages/dashboard/index", wait_until="networkidle")
    time.sleep(6)  # 等 config/permissions/tenants 异步加载
    page.screenshot(path=r"e:\code\basic\scripts\_dash_admin.png", full_page=True)

    # 检查页面文本：积分/官网中心/课程中心等模块标题
    html = page.content()
    for kw in ["积分体系", "积分记录", "积分类型", "积分规则", "官网中心", "企业官网", "课程中心", "控制台", "渠道数量"]:
        print(f"{kw}: {'FOUND' if kw in html else 'MISSING'}")

    print("\n--- console errors ---")
    for e in errors[-20:]:
        print(e[:300])
    browser.close()
