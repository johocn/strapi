import { setupStrapi, teardownStrapi } from './helpers/strapi-setup';

describe('Permissions', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await teardownStrapi();
  });

  test('plugin permissions are registered', () => {
    const actions = strapi.admin.services.permission.actionProvider.getAll();
    const pluginActions = actions.filter(
      (action: any) => action.pluginName === 'zhao-studio'
    );

    expect(pluginActions.length).toBeGreaterThan(0);
    expect(pluginActions).toContainEqual(
      expect.objectContaining({ uid: 'read' })
    );
    expect(pluginActions).toContainEqual(
      expect.objectContaining({ uid: 'create' })
    );
  });
});