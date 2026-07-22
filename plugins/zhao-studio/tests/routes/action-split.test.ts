import routes from '../../server/src/routes/content-api';

const allRoutes = routes().routes;

describe('zhao-studio route action split', () => {
  const findRoute = (method: string, path: string) =>
    allRoutes.find(r => r.method === method && r.path === path);

  it('promo-channel routes use promo-channel.manage action', () => {
    const list = findRoute('GET', '/v1/admin/channels');
    const create = findRoute('POST', '/v1/admin/channels');
    const update = findRoute('PUT', '/v1/admin/channels/:id');
    const del = findRoute('DELETE', '/v1/admin/channels/:id');

    [list, create, update, del].forEach(r => {
      const permPolicy = r?.config?.policies?.find((p: any) =>
        typeof p === 'object' && p.name === 'plugin::zhao-auth.has-permission'
      );
      expect(permPolicy?.config?.action).toBe('zhao-studio.promo-channel.manage');
    });
  });

  it('ab-test start/stop use specific actions', () => {
    const start = findRoute('PUT', '/v1/admin/experiments/:id/start');
    const stop = findRoute('PUT', '/v1/admin/experiments/:id/stop');

    const startPolicy = start?.config?.policies?.find((p: any) =>
      typeof p === 'object' && p.name === 'plugin::zhao-auth.has-permission'
    );
    const stopPolicy = stop?.config?.policies?.find((p: any) =>
      typeof p === 'object' && p.name === 'plugin::zhao-auth.has-permission'
    );

    expect(startPolicy?.config?.action).toBe('zhao-studio.ab-experiment.start');
    expect(stopPolicy?.config?.action).toBe('zhao-studio.ab-experiment.stop');
  });

  it('channel-report uses channel-report.view action', () => {
    const report = findRoute('GET', '/v1/admin/channel-report');
    const policy = report?.config?.policies?.find((p: any) =>
      typeof p === 'object' && p.name === 'plugin::zhao-auth.has-permission'
    );
    expect(policy?.config?.action).toBe('zhao-studio.channel-report.view');
  });

  it('article-draft routes use article-draft.manage action', () => {
    // article-draft controller routes (handler starts with 'draft.')
    // exclude /publish and /sync sub-paths which belong to publish-record module
    const articleRoutes = allRoutes.filter(r =>
      (r.path.includes('/v1/admin/article') || r.path.includes('/v1/admin/drafts')) &&
      !r.path.includes('/publish') && !r.path.includes('/sync')
    );
    articleRoutes.forEach(r => {
      const policy = r.config?.policies?.find((p: any) =>
        typeof p === 'object' && p.name === 'plugin::zhao-auth.has-permission'
      );
      if (policy) {
        expect(policy.config.action).toBe('zhao-studio.article-draft.manage');
      }
    });
  });
});
