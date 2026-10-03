node -e "const c=require('/www/apps/strapi/ecosystem.config.cjs');console.log(JSON.stringify(c.apps[0]));"
free -m
pm2 jlist | head -c 2000