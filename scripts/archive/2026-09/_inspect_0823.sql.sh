#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
F=/home/admin/sso-config-backup-20260823_073326.sql
echo '=== 8-23 备份头部 ==='
head -30 $F
echo ''
echo '=== 8-23 备份涉及的表(CREATE TABLE / COPY table / INSERT INTO) ==='
grep -oE 'CREATE TABLE (public\.)?[a-z_]+' $F | head | sed 's/CREATE TABLE //'
grep -oE 'COPY (public\.)?[a-z_]+' $F | sed 's/COPY //' | head -40
echo ''
echo '=== 8-23 备份是否含课程/网站表 ==='
grep -cE 'zhao_courses|zhao_website|courses' $F
echo 'DONE'