#!/bin/bash
cd /www/apps/strapi
echo "=== 1. .env 检查 ==="
cat .env 2>&1 | head -20
echo ""
echo "=== 2. config/database.js 检查 ==="
cat config/database.js 2>&1 | head -30
echo ""
echo "=== 3. PostgreSQL 检查 ==="
systemctl status postgresql 2>&1 || service postgresql status 2>&1 || pg_isready 2>&1 || echo "PostgreSQL not running"
echo ""
echo "=== 4. 完整 pm2 env ==="
pm2 env strapi 2>&1 | head -30
echo ""
echo "=== 5. NODE_ENV 检查 ==="
echo "NODE_ENV=$NODE_ENV"
cat config/server.js 2>/dev/null | head -20 || echo "no config/server.js"
