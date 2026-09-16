#!/bin/bash
# 用 joho strapi 的 bcryptjs 生成 __PASSWORD__ 的 bcrypt 哈希并自校验
set -uo pipefail
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:$PATH
cat > /tmp/_gen_hash.cjs <<'EOF'
const bcrypt = require('/www/apps/strapi/node_modules/bcryptjs');
const pw = '__PASSWORD__';
const hash = bcrypt.hashSync(pw, 10);
const ok = bcrypt.compareSync(pw, hash);
console.log('HASH=' + hash);
console.log('VERIFY=' + (ok ? 'OK' : 'FAIL'));
EOF
node /tmp/_gen_hash.cjs