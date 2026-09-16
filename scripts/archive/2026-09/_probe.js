process.chdir('/www/apps/strapi');
const m = require('@strapi/strapi');
console.log('typeof:', typeof m);
console.log('keys:', Object.keys(m).join(','));
if (typeof m === 'object' && m.default) console.log('default typeof:', typeof m.default);
const strapiPkg = require('@strapi/strapi/package.json');
console.log('version:', strapiPkg.version);