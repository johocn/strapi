#!/bin/bash
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
cd /home/admin
echo '=== A. 备份中 zhao_site_configs 完整段 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_site_configs/{f=1;next} /^#T\t/{f=0} f'
echo ''
echo '=== B. 备份中 zhao_site_configs_template_lnk 段 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_site_configs_template_lnk/{f=1;next} /^#T\t/{f=0} f'
echo ''
echo '=== C. 备份中 zhao_channels_sites_lnk 段 ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_channels_sites_lnk/{f=1;next} /^#T\t/{f=0} f'
echo ''
echo '=== D. 备份中 zhao_channels 段(只看 id<=3 与根渠道) ==='
zcat strapi_pre_cleanup_20260830.jsonl.gz | awk '/^#T\tzhao_channels/{f=1;next} /^#T\t/{f=0} f' | node -e "let d='';process.stdin.on('data',x=>d+=x).on('end',()=>{d.trim().split('\n').forEach(l=>{try{const o=JSON.parse(l); if(o.id<=5||o.name.includes('根'))console.log(JSON.stringify({id:o.id,name:o.name,code:o.code,channel_tier:o.channel_tier,path:o.path,status:o.status,site_id:o.site_id}))}catch(e){}})})"
echo '=== DONE ==='