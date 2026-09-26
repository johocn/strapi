import permissions from '../server/src/permissions';
import register from '../server/src/register';

/**
 * 断言权限声明 + register 注册链路，不启动真实 Strapi 实例
 * （单测环境无数据库连接，createStrapi().load() 无法完成注册）。
 */
describe('Permissions', () => {
  test('plugin permissions are declared for zhao-studio', () => {
    const pluginActions = permissions.actions.filter(
      (action) => action.pluginName === 'zhao-studio'
    );

    expect(pluginActions.length).toBeGreaterThan(0);
    expect(pluginActions).toContainEqual(expect.objectContaining({ uid: 'read' }));
    expect(pluginActions).toContainEqual(expect.objectContaining({ uid: 'create' }));
  });

  test('register 将 actions 注册进 actionProvider', () => {
    const registerMany = jest.fn();
    const strapi: any = {
      admin: { services: { permission: { actionProvider: { registerMany } } } },
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue({ setMessages: jest.fn() }),
      }),
    };

    register({ strapi });

    expect(registerMany).toHaveBeenCalledWith(permissions.actions);
  });
});