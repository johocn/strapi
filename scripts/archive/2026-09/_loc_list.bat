@echo off
set PGPASSWORD=admin
psql -U postgres -h 127.0.0.1 -p 5432 -d strapi -P pager=off -c "\dt"
echo DONE