#!/bin/bash
docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT tablename FROM pg_tables WHERE tablename LIKE '%global%' OR tablename LIKE '%config%';" | head -30
