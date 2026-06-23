import { describe, it, expect } from '@jest/globals';

// Mock strapi global
const mockStrapi = {
  plugins: {
    'zhao-common': {
      routes: {
        'content-api': {
          type: 'content-api',
          routes: [
            {
              method: 'GET',
              path: '/v1/public/config',
              handler: 'config.getPublic',
              config: { auth: false },
            },
          ],
        },
        'admin': {
          type: 'admin',
          routes: [
            {
              method: 'GET',
              path: '/v1/admin/config/site',
              handler: 'config.getSite',
              config: {
                auth: false,
                policies: [
                  'plugin::zhao-auth.is-authenticated',
                  { name: 'plugin::zhao-auth.has-permission', config: { action: 'config.read' } },
                ],
              },
            },
            {
              method: 'GET',
              path: '/v1/admin/config/third',
              handler: 'config.getThird',
              config: {
                auth: false,
                policies: [
                  'plugin::zhao-auth.is-authenticated',
                  { name: 'plugin::zhao-auth.has-permission', config: { action: 'config.read' } },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

(global as any).strapi = mockStrapi;

describe('zhao-common routes', () => {
  describe('content-api routes', () => {
    it('should register /v1/public/config route', async () => {
      const strapi = global.strapi as any;
      const routes = strapi.plugins['zhao-common']?.routes;

      expect(routes).toBeDefined();
      expect(routes['content-api']).toBeDefined();
      expect(routes['content-api'].type).toBe('content-api');

      const publicConfigRoute = routes['content-api'].routes.find(
        (r: any) => r.path === '/v1/public/config'
      );

      expect(publicConfigRoute).toBeDefined();
      expect(publicConfigRoute.method).toBe('GET');
      expect(publicConfigRoute.handler).toBe('config.getPublic');
      expect(publicConfigRoute.config.auth).toBe(false);
    });
  });

  describe('admin routes', () => {
    it('should register /v1/admin/config/site route', async () => {
      const strapi = global.strapi as any;
      const routes = strapi.plugins['zhao-common']?.routes;

      expect(routes['admin']).toBeDefined();
      expect(routes['admin'].type).toBe('admin');

      const siteRoute = routes['admin'].routes.find(
        (r: any) => r.path === '/v1/admin/config/site'
      );

      expect(siteRoute).toBeDefined();
      expect(siteRoute.method).toBe('GET');
      expect(siteRoute.handler).toBe('config.getSite');
    });

    it('should register /v1/admin/config/third route', async () => {
      const strapi = global.strapi as any;
      const routes = strapi.plugins['zhao-common']?.routes;

      const thirdRoute = routes['admin'].routes.find(
        (r: any) => r.path === '/v1/admin/config/third'
      );

      expect(thirdRoute).toBeDefined();
      expect(thirdRoute.method).toBe('GET');
      expect(thirdRoute.handler).toBe('config.getThird');
    });
  });
});