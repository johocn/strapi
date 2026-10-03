#!/bin/bash
echo "=== FULL ERR LOG (last 50) ==="
tail -50 /home/admin/.pm2/logs/strapi-error.log 2>&1
echo ""
echo "=== FULL OUT LOG (last 50) ==="
tail -50 /home/admin/.pm2/logs/strapi-out.log 2>&1
