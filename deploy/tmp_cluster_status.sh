sleep 60
curl -s --noproxy '*' -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:1337/_health
curl -s --noproxy '*' -o /dev/null -w 'api=%{http_code}\n' https://v.joho.cn/api/
pm2 jlist > /tmp/jl.json
node -e '
const a=JSON.parse(require("fs").readFileSync("/tmp/jl.json","utf8")).filter(x=>x.name==="strapi");
for(const x of a) console.log(JSON.stringify({pm_id:x.pm_id,exec_mode:x.pm2_env.exec_mode,status:x.pm2_env.status,restarts:x.pm2_env.restart_time,memMB:Math.round(x.monit.memory/1048576),uptime_s:x.pm2_env.pm_uptime}));
'
free -m
echo "=== cron 注册次数（本进程）==="
pm2 logs strapi --out --lines 200 --nostream 2>/dev/null | grep -c "插件已启动" || true