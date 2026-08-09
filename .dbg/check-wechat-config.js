const { Client } = require('pg')

async function main() {
  const client = new Client({
    host: '127.0.0.1', port: 5432, database: 'strapi',
    user: 'postgres', password: 'admin',
  })
  await client.connect()

  // 查 sso-oauth-config 表名
  const tblRes = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE '%oauth%'
  `)
  console.log('=== oauth 相关表 ===')
  for (const r of tblRes.rows) console.log(' ', r.table_name)

  // 尝试查询 wechat 配置
  const tables = tblRes.rows.map(r => r.table_name)
  for (const tbl of tables) {
    try {
      const res = await client.query(`SELECT * FROM ${tbl} WHERE provider = 'wechat' OR provider LIKE '%wechat%'`)
      if (res.rows.length > 0) {
        console.log(`\n=== ${tbl} (wechat 配置) ===`)
        for (const row of res.rows) {
          console.log(JSON.stringify(row, null, 2))
        }
      }
    } catch (e) { /* ignore */ }
  }

  await client.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
