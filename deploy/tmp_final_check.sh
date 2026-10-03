pm2 jlist > /tmp/jl2.json
node -e '
const a=JSON.parse(require("fs").readFileSync("/tmp/jl2.json","utf8")).filter(x=>x.name==="strapi");
for(const x of a) console.log(JSON.stringify({pm_id:x.pm_id,exec_mode:x.pm2_env.exec_mode,status:x.pm2_env.status,restarts:x.pm2_env.restart_time,unstable:x.pm2_env.unstable_restarts,memMB:Math.round(x.monit.memory/1048576),uptime_min:Math.round((Date.now()-x.pm2_env.pm_uptime)/60000)}));
'
echo "=== 启动完成标志 ==="
pm2 logs strapi --out --lines 400 --nostream 2>/dev/null | grep -E "To access the server|插件已启动|Playwright" | tail -6
echo "=== 健康 ==="
curl -s --noproxy '*' -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:1337/_health
curl -s --noproxy '*' -o /dev/null -w 'api=%{http_code}\n' https://v.joho.cn/api/
free -m