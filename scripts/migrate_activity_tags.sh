#!/bin/bash
# ============================================================
# 迁移：activity.tags(json) -> zhao_tags 记录 + manyToMany relation + slug 回填
#
# 用法:
#   DRY=1 bash migrate_activity_tags.sh   # 默认：仅统计，不写入
#   DRY=0 bash migrate_activity_tags.sh   # 执行：自动备份 + 迁移
#
# 执行前必须先在生产库实测（docker exec psql，库名/容器以环境为准）：
#   1) \dt *tag*lnk*   # 确认 manyToMany 关联表名（形如 activities_zhao_tags_lnk /
#                      # zhao_tags_activities_lnk），替换下方 LNK="<LNK_TABLE>"
#   2) PG_CONTAINER / PG_USER / PG_DB 按生产环境实测替换
# ============================================================
set -euo pipefail

DRY="${DRY:-1}"
STAMP=$(date +%Y%m%d%H%M%S)

# ---- 连接参数（占位，需按生产环境实测替换）----
PG_CONTAINER="<PG_CONTAINER>"
PG_USER="<PG_USER>"
PG_DB="<PG_DB>"
PSQL="docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -tA -P pager=off"

# ---- manyToMany 关联表名（占位，先用 \dt *tag*lnk* 实测）----
LNK="<LNK_TABLE>"

BACKUP="/home/admin/migrate_activity_tags_${STAMP}.csv"

# 1) 备份 json tags（只读 COPY；无论 DRY 与否先备份，失败仅告警不中断）
if ! $PSQL -c "COPY (SELECT id, title, tags FROM activities WHERE tags IS NOT NULL AND jsonb_typeof(tags)='array') TO STDOUT" > "$BACKUP" 2>/dev/null; then
  echo "[warn] 备份失败（不中断，路径: $BACKUP）"
else
  echo "[info] 备份: $BACKUP"
fi

if [ "$DRY" = "1" ]; then
  echo "[DRY] ===== 全部 json 标签统计（name | 次数）====="
  $PSQL -c "SELECT jt AS tagname, count(*) AS cnt FROM activities a, jsonb_array_elements_text(a.tags) AS jt WHERE a.tags IS NOT NULL AND jsonb_typeof(a.tags)='array' GROUP BY jt ORDER BY cnt DESC, jt;"
  echo "[DRY] ===== 待处理标签（zhao_tags 中不存在的 name，前 50）====="
  $PSQL -c "SELECT jt AS tagname, count(*) AS cnt FROM activities a, jsonb_array_elements_text(a.tags) AS jt WHERE a.tags IS NOT NULL AND jsonb_typeof(a.tags)='array' AND NOT EXISTS (SELECT 1 FROM zhao_tags z WHERE z.name=jt) GROUP BY jt ORDER BY cnt DESC, jt LIMIT 50;"
  echo "[DRY] 完成统计，未做任何写入"
  exit 0
fi

# 2) 执行迁移（单会话运行，保证 TEMP TABLE _act_tags 跨语句可见）
$PSQL <<SQL
DROP TABLE IF EXISTS _act_tags;
CREATE TEMP TABLE _act_tags AS
SELECT a.id AS activity_id, jt AS tagname
FROM activities a, jsonb_array_elements_text(a.tags) AS jt
WHERE a.tags IS NOT NULL AND jsonb_typeof(a.tags) = 'array';

-- 3) 新建缺失 tag（name 去重；slug 用 tag- + md5(name||now) 前 8 位保证唯一；幂等）
INSERT INTO zhao_tags (name, slug, is_preset, is_public, created_at, updated_at)
SELECT DISTINCT t.tagname,
       'tag-' || substr(md5(t.tagname || now()::text), 1, 8),
       false, true, now(), now()
FROM _act_tags t
WHERE NOT EXISTS (SELECT 1 FROM zhao_tags z WHERE z.name = t.tagname)
ON CONFLICT DO NOTHING;

-- 4) 建 relation（manyToMany；NOT EXISTS + ON CONFLICT 双重防重）
INSERT INTO ${LNK} (activity_id, tag_id)
SELECT x.activity_id, z.id
FROM _act_tags x
JOIN zhao_tags z ON z.name = x.tagname
WHERE NOT EXISTS (SELECT 1 FROM ${LNK} l WHERE l.activity_id = x.activity_id AND l.tag_id = z.id)
ON CONFLICT DO NOTHING;

-- 5) slug 回填：迁移后 slug = document_id（空值补全，幂等）
UPDATE activities SET slug = document_id WHERE slug IS NULL OR slug = '';

\echo '===== 验证 ====='
\echo 'relation 总数:'
SELECT count(*) FROM ${LNK};
\echo '无 relation 的活动数（预期 0）:'
SELECT count(*) FROM activities a WHERE NOT EXISTS (SELECT 1 FROM ${LNK} l WHERE l.activity_id = a.id);
SQL

echo "[OK] 迁移完成，备份: $BACKUP"
