process.chdir('/www/apps/strapi');
for (const p of ['ts-node/register', '@swc/register', 'tsconfig-paths', 'typescript', 'ts-node']) {
  try { require.resolve(p); console.log('OK', p); }
  catch (e) { console.log('NO', p); }
}