import permissions from './permissions';

export default ({ strapi }: { strapi: any }) => {
  strapi.admin.services.permission.actionProvider.registerMany(
    permissions.actions
  );
};