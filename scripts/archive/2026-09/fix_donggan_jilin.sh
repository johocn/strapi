#!/bin/bash
set -e
ENV=/www/apps/strapi/.env
P=$(grep -E '^DATABASE_PASSWORD' "$ENV" | head -1 | cut -d= -f2-)
echo "=== versions act_confirm by code ==="
docker exec -e PGPASSWORD="$P" 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "select id, code, wx_template_id, wx_template_fields, link, status, weight from sso_msg_template_versions where code='act_confirm' order by id;" 2>&1 | head -40
echo "=== all versions ==="
docker exec -e PGPASSWORD="$P" 1Panel-postgresql-pIe0 psql -U strapi -d strapi -c "select id, code, wx_template_id, link, status, weight from sso_msg_template_versions order by id;" 2>&1 | head -40