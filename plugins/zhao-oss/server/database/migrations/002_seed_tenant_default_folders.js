'use strict';

const DEFAULT_FOLDERS = [
  { name: '品牌', category: 'brand' },
  { name: '文章', category: 'article' },
  { name: '产品', category: 'product' },
  { name: '案例', category: 'case' },
  { name: '合规', category: 'compliance' },
  { name: '问答', category: 'faq' },
  { name: '教程', category: 'tutorial' },
  { name: '下载', category: 'download' },
  { name: '头像', category: 'avatar' },
  { name: '其他', category: 'general' },
];

async function up({ db: knex }) {
  const sites = await knex('zhao_site_configs').select('id', 'domain', 'document_id');
  for (const site of sites) {
    const siteDomain = site.domain || `site-${site.document_id}`;
    // 为每个租户在 upload_folders 中创建分类子文件夹
    // 注意：实际 folder 创建应由 mediaService.ensureFolderByPath 处理
    // 此迁移仅做数据播种，不直接操作 upload_folders（避免 path_id 冲突）
    console.log(`[zhao-oss 002] 租户 ${siteDomain} 的默认文件夹将由 ensureSiteDefaultFolders 在 bootstrap 时创建`);
  }
}

async function down({ db: knex }) {}

module.exports = { up, down };
