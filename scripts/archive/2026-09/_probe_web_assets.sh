#!/bin/bash
echo "===== user chunk imports ====="
python3 - <<'PY'
import re
data = open('/tmp/ch_user.js', encoding='utf-8', errors='replace').read()
# ESM imports
for m in re.finditer(r'import\{([^}]*)\}from"([^"]+)"', data):
    print('IMPORT', m.group(2), '::', m.group(1)[:200])
# 动态 import
for m in re.finditer(r'import\("([^"]+)"\)', data):
    print('DYN IMPORT', m.group(1))
# find fetchPermissions G body: search for 'getMyPermission' in whole chunk
i = data.find('getMyPermission')
if i > -1:
    print('getMyPermission ctx:', data[max(0,i-100):i+150])
PY
echo ""
echo "===== auth.Di0Xol2D.js content ====="
curl -s "https://h.joho.cn/assets/auth.Di0Xol2D.js" -o /tmp/ch_auth2.js -w "status:%{http_code} size:%{size_download}\n"
cat /tmp/ch_auth2.js
