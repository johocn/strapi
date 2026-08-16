const{Client}=require('pg');
const c=new Client({host:'127.0.0.1',port:5432,database:'strapi',user:'postgres',password:'admin'});
(async()=>{await c.connect();
const r=await c.query("select table_name,column_name from information_schema.columns where table_name in ('zhao_course_lessons','zhao_lesson_progresses') order by table_name,ordinal_position");
for(const x of r.rows) console.log(`${x.table_name} :: ${x.column_name}`);
await c.end()})().catch(e=>{console.error(e.message);process.exit(1)});