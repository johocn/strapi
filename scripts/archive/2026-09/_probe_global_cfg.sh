#!/bin/bash
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT id, document_id, module_enabled::text AS enabled, module_tenant_grants::text AS grants FROM zhao_global_configs;"
