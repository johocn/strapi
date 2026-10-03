// Programmatic Strapi 5 loader
async function main() {
  // Use Strapi factory
  const { createStrapi } = require('@strapi/strapi');
  const strapi = createStrapi({ distDir: require('path').join(__dirname, 'dist') });
  await strapi.load();
  
  console.log('\n===== P0 OAuth Runtime Validation =====\n');

  // 1. Verify oauth-manager service registration
  console.log('--- 1. oauth-manager service methods ---');
  try {
    const mgr = strapi.plugin('zhao-studio').service('oauth-manager');
    const methods = Object.keys(mgr).sort();
    console.log('Methods:', methods);
    const expected = ['batchRefreshExpiringTokens', 'ensureValidToken', 'getAuthorizeUrl', 'getStatus', 'handleCallback', 'revokeAuthorization'];
    const missing = expected.filter(m => !methods.includes(m));
    console.log(missing.length === 0 ? 'PASS: All 6 methods present' : 'FAIL: Missing: ' + missing);
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  // 2. Create test data
  console.log('\n--- 2. Create test data ---');
  
  let wechatPlatform, internalPlatform;
  
  const wxPlats = await strapi.documents('plugin::zhao-studio.publish-platform').findMany({
    filters: { type: 'wechat' }, limit: 1,
  });
  if (wxPlats.length === 0) {
    wechatPlatform = await strapi.documents('plugin::zhao-studio.publish-platform').create({
      data: { name: 'OAuth验证-微信', type: 'wechat', category: 'social', isActive: true },
    });
    console.log('Created wechat platform:', wechatPlatform.documentId);
  } else {
    wechatPlatform = wxPlats[0];
    console.log('Found wechat platform:', wechatPlatform.documentId);
  }

  const intPlats = await strapi.documents('plugin::zhao-studio.publish-platform').findMany({
    filters: { type: 'internal' }, limit: 1,
  });
  if (intPlats.length === 0) {
    internalPlatform = await strapi.documents('plugin::zhao-studio.publish-platform').create({
      data: { name: 'OAuth验证-内部', type: 'internal', category: 'custom', isActive: true },
    });
    console.log('Created internal platform:', internalPlatform.documentId);
  } else {
    internalPlatform = intPlats[0];
    console.log('Found internal platform:', internalPlatform.documentId);
  }

  // Create accounts
  let wechatAccount, internalAccount;
  
  const wxAccts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
    filters: { name: 'OAuth验证-微信账号' }, limit: 1,
  });
  if (wxAccts.length === 0) {
    wechatAccount = await strapi.documents('plugin::zhao-studio.publish-account').create({
      data: { name: 'OAuth验证-微信账号', platform: wechatPlatform.documentId, isActive: true },
    });
  } else {
    wechatAccount = wxAccts[0];
  }
  console.log('Wechat account:', wechatAccount.documentId, 'oauthState:', wechatAccount.oauthState);

  const intAccts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
    filters: { name: 'OAuth验证-内部账号' }, limit: 1,
  });
  if (intAccts.length === 0) {
    internalAccount = await strapi.documents('plugin::zhao-studio.publish-account').create({
      data: { name: 'OAuth验证-内部账号', platform: internalPlatform.documentId, isActive: true, config: { apiKey: 'test-key-abc' } },
    });
  } else {
    internalAccount = intAccts[0];
  }
  console.log('Internal account:', internalAccount.documentId);

  // 3. getStatus test
  console.log('\n--- 3. getStatus (wechat account) ---');
  try {
    const mgr = strapi.plugin('zhao-studio').service('oauth-manager');
    const status = await mgr.getStatus(wechatAccount.documentId);
    console.log('Result:', JSON.stringify(status));
    const ok = status.accountId === wechatAccount.documentId && status.oauthState === 'unauthorized';
    console.log(ok ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  // 4. getAuthorizeUrl rejects internal
  console.log('\n--- 4. getAuthorizeUrl rejects internal platform ---');
  try {
    const mgr = strapi.plugin('zhao-studio').service('oauth-manager');
    await mgr.getAuthorizeUrl(internalAccount.documentId);
    console.log('FAIL: Should have thrown');
  } catch (e) {
    const ok = e.message.includes('不需要 OAuth 授权');
    console.log('Error: "' + e.message + '"');
    console.log(ok ? 'PASS' : 'FAIL - wrong error');
  }

  // 5. ensureValidToken for internal returns apiKey
  console.log('\n--- 5. ensureValidToken for internal returns config.apiKey ---');
  try {
    const mgr = strapi.plugin('zhao-studio').service('oauth-manager');
    const token = await mgr.ensureValidToken(internalAccount.documentId);
    const ok = token === 'test-key-abc';
    console.log('Token: "' + token + '"');
    console.log(ok ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  // 6. revokeAuthorization
  console.log('\n--- 6. revokeAuthorization ---');
  try {
    const mgr = strapi.plugin('zhao-studio').service('oauth-manager');
    await mgr.revokeAuthorization(wechatAccount.documentId);
    const after = await mgr.getStatus(wechatAccount.documentId);
    const ok = after.oauthState === 'revoked';
    console.log('oauthState after revoke: "' + after.oauthState + '"');
    console.log(ok ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  // 7. Content type schema
  console.log('\n--- 7. Content-type schema OAuth fields ---');
  try {
    const schema = strapi.contentTypes['plugin::zhao-studio.publish-account'];
    const attrs = schema.attributes;
    const oauthAttrs = ['oauthAccessToken', 'oauthRefreshToken', 'oauthExpiresAt', 'oauthOpenId', 'oauthScope', 'oauthState', 'lastRefreshAt'];
    const found = oauthAttrs.filter(a => attrs[a]);
    const missing = oauthAttrs.filter(a => !attrs[a]);
    console.log('Found: ' + found.length + '/7 fields');
    if (missing.length > 0) console.log('Missing:', missing);
    console.log(missing.length === 0 ? 'PASS' : 'FAIL');
    
    const stateAttr = attrs['oauthState'];
    console.log('oauthState enum:', stateAttr.enum);
    console.log('oauthState default:', stateAttr.default);
    console.log('oauthState required:', stateAttr.required);
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  await strapi.destroy();
  console.log('\n===== ALL VALIDATIONS COMPLETE =====\n');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
