set -e
cd /www/apps/strapi
git show b8ad5449c4:ecosystem.config.cjs > /tmp/eco.revert.cjs
echo "=== revert config ==="
cat /tmp/eco.revert.cjs
cp /tmp/eco.revert.cjs ecosystem.config.cjs
pm2 delete strapi
pm2 start ecosystem.config.cjs
pm2 save
echo "=== wait health ==="
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' http://127.0.0.1:1337/_health || true)
  echo "try $i -> $code"
  if [ "${code:0:1}" = "2" ]; then break; fi
  sleep 5
done
curl -s -o /dev/null -w 'v.joho.cn/api/ -> %{http_code}\n' --noproxy '*' https://v.joho.cn/api/
free -m