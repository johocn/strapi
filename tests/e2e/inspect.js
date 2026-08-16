const{Client}=require('pg');
const c=new Client({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'});
(async()=>{await c.connect();
const r=await c.query("select * from zhao_lesson_progresses limit 2");
console.log("columns:", r.fields.map(f=>f.name).join(','));
console.log("row0:", JSON.stringify(r.rows[0]));
// find user table
const u=await c.query("select table_name from information_schema.tables where table_schema='public' and table_name like '%user%' order by table_name");
console.log("user tables:", u.rows.map(x=>x.table_name).join(','));
await c.end()})().catch(e=>{console.error(e.message);process.exit(1)});