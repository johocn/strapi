#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
DB="docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -t -A"
B=/home/admin/strapi_pre_cleanup_20260830.jsonl.gz
echo '=== 当前课程关联表行数 ==='
for t in zhao_courses zhao_course_categories zhao_course_lessons zhao_course_enrollments zhao_tags zhao_tag_groups zhao_course_access_codes; do
  n=$($DB -c "SELECT count(*) FROM $t" 2>/dev/null)
  echo "$t = $n"
done
echo ''
echo '=== 备份中同表数据量 ==='
for t in zhao_courses zhao_course_categories zhao_course_lessons zhao_tags zhao_tag_groups zhao_site_templates zhao_global_configs; do
  n=$(gunzip -c $B 2>/dev/null | awk -v T="#T      $t" 'BEGIN{c=0} $0==T{f=1;next} /^#T/{f=0} f&&$0!=""{c++} END{print c}')
  echo "$t (backup) = $n"
done
echo ''
echo '=== 是否存在更早备份(08-29/其它日期) ==='
ls -la /home/admin/*.jsonl.gz /home/admin/*.dump /home/admin/*.sql* 2>/dev/null
find /home/admin -maxdepth 2 -name '*.jsonl.gz' -o -maxdepth 2 -name '*.dump' 2>/dev/null | head -20
echo 'DONE'