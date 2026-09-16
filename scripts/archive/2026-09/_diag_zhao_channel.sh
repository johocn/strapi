#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
db(){ docker exec -i 1Panel-postgresql-pIe0 psql -U strapi -d strapi -P pager=off -c "$1"; }
echo '=== 1. zhao_channels 列 ==='
db "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_channels' ORDER BY ordinal_position;"
echo '=== 2. zhao_channel_members 列 ==='
db "SELECT column_name FROM information_schema.columns WHERE table_name='zhao_channel_members' ORDER BY ordinal_position;"
echo '=== 3. 用户2 的渠道成员关联渠道 ==='
db "SELECT l.user_id, cm.id member_id, ch.id channel_id, COALESCE(ch.name,'') ch_name FROM zhao_channel_members cm
    JOIN zhao_channel_members_user_lnk l ON l.channel_member_id=cm.id
    LEFT JOIN zhao_channel_members_channel_lnk ml ON ml.channel_member_id=cm.id
    LEFT JOIN zhao_channels ch ON ch.id=ml.channel_id
    WHERE l.user_id=2;"
echo '=== 4. 用户10 是否有渠道成员 ==='
db "SELECT COUNT(*) FROM zhao_channel_members_user_lnk l JOIN zhao_channel_members cm ON cm.id=l.channel_member_id WHERE l.user_id=10;"
echo 'DONE'