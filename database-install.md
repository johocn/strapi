docker ps | grep postgres

docker exec -it 1Panel-postgresql-pIe0 sh

psql -U youshaop


GRANT ALL PRIVILEGES ON DATABASE strapi TO strapi;
GRANT ALL ON SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strapi;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strapi;

\c vendure



GRANT ALL PRIVILEGES ON DATABASE vendure TO vendure;
GRANT ALL ON SCHEMA public TO vendure;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vendure;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vendure;


ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vendure;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vendure;



pm2 start npm --name "strapi" --cwd /www/apps/strapi -- start


# 1. 进入项目目录
cd /www/apps/strapi

# 2. 拉取最新代码（含 article-draft schema 修复 + ecosystem.config.cjs）
git pull origin main

# 3. 删除旧的 PM2 进程（关键！restart 不会重新读取 cwd 配置）
pm2 delete strapi

# 4. 用 ecosystem.config.cjs 重新启动（锁定 cwd 为项目根）
pm2 start ecosystem.config.cjs
pm2 save

# 5. 查看日志确认启动成功
pm2 logs strapi --lines 50