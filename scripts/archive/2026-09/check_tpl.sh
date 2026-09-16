#!/bin/bash
set -e
cd /www/apps/strapi
P=$(grep -E '^DATABASE_PASSWORD' .env | head -1 | cut -d= -f2)
Q="docker exec -e PGPASSWORD=$P 1Panel-postgresql-pIe0 psql -U strapi -d strapi -At"
echo "=== sso_msg_templates 列结构 ==="
$Q -c "select column_name from information_schema.columns where table_name='sso_msg_templates' order by ordinal_position;"
echo "=== sso_msg_template_versions 列结构 ==="
$Q -c "select column_name from information_schema.columns where table_name='sso_msg_template_versions' order by ordinal_position;"
echo "=== act_confirm 模板本体 ==="
$Q -c "select id, code, name, provider, wx_template_id, wx_template_fields, is_enabled, content from sso_msg_templates where code='act_confirm';"