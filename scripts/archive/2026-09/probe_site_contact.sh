#!/usr/bin/env bash
export PGPASSWORD=$(grep -oP 'DATABASE_PASSWORD=\K.*' /www/apps/strapi/.env | head -1)
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A \
  -c "SELECT document_id, jsonb_pretty(extra_config->'promoContact') FROM zhao_site_configs WHERE extra_config::jsonb ? 'promoContact' LIMIT 5"
echo "PROBE_DONE"