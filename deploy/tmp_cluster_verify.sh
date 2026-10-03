for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' http://127.0.0.1:1337/_health || true)
  echo "try $i -> $code"
  if [ "${code:0:1}" = "2" ]; then break; fi
  sleep 5
done
echo "=== local health ==="
curl -s --noproxy '*' http://127.0.0.1:1337/_health; echo
echo "=== public api ==="
curl -s -o /dev/null -w 'v.joho.cn/api/ -> %{http_code}\n' --noproxy '*' https://v.joho.cn/api/
echo "=== mem ==="
free -m
echo "=== pm2 status ==="
pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=JSON.parse(s).filter(x=>x.name==='strapi');console.log(l.map(a=>JSON.stringify({pm_id:a.pm_id,exec_mode:a.pm2_env.exec_mode,status:a.pm2_env.status,restarts:a.pm2_env.restart_time,mem:a.monit.memory})).join('\n'))})"