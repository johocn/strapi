'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function up({ db }) {
  const dataPath = path.join(__dirname, '../../src/data/wealth-companies.json');
  const companies = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let inserted = 0;
  let skipped = 0;

  for (const company of companies) {
    // 查重（按 name）
    const existing = await db('wealth_companies')
      .where({ name: company.name })
      .first();

    if (existing) {
      skipped++;
      continue;
    }

    // 插入（生成 document_id）
    await db('wealth_companies').insert({
      document_id: crypto.randomUUID(),
      name: company.name,
      short_name: company.shortName,
      company_type: company.companyType,
      website: company.website,
      status: company.status,
      created_at: new Date(),
      updated_at: new Date(),
    });
    inserted++;
  }

  console.log(`[zhao-wealth] 003_seed_wealth_companies: inserted=${inserted}, skipped=${skipped}`);
}

module.exports = { up };
