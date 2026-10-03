set -e
cd /www/apps/strapi

echo "=== BEFORE ==="
pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).find(x=>x.name==='strapi');console.log(JSON.stringify({name:a.name,pm_id:a.pm_id,exec_mode:a.pm2_env.exec_mode,instances:a.pm2_env.instances,status:a.pm2_env.status}))})"

echo "=== SWITCH TO CLUSTER ==="
pm2 delete strapi
pm2 start ecosystem.config.cjs
pm2 save

echo "=== AFTER ==="
sleep 8
pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=JSON.parse(s).filter(x=>x.name==='strapi');console.log(l.map(a=>JSON.stringify({pm_id:a.pm_id,exec_mode:a.pm2_env.exec_mode,instance_var:a.pm2_env.instance_var,NODE_APP_INSTANCE:a.pm2_env.env.NODE_APP_INSTANCE,status:a.pm2_env.status,restarts:a.pm2_env.restart_time})).join('\n'))})"