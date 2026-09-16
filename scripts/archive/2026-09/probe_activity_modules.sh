#!/usr/bin/env bash
set -e
export PGPASSWORD=$(grep -oP 'DATABASE_PASSWORD=\K.*' /www/apps/strapi/.env | head -1)
DOC="kdyv7bl6s95avdbeme677uyq"
echo "=== activity promoModules ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A \
  -c "SELECT document_id, promo_modules FROM activities WHERE document_id='$DOC'"
echo "=== activity promoContact ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A \
  -c "SELECT document_id, promo_contact FROM activities WHERE document_id='$DOC'"
echo "=== site configs promoContact ==="
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A \
  -c "SELECT document_id, extra_config FROM site_configs WHERE extra_config::text LIKE '%promoContact%' LIMIT 5"
echo "PROBE_DONE"