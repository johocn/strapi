import contentTypes from './content-types';

export default {
  register({ strapi }) {
    strapi.contentTypes = {
      ...strapi.contentTypes,
      ...contentTypes,
    };
  },
  bootstrap() {},
  destroy() {},
};
