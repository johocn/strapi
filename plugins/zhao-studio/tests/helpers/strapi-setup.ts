import { Strapi } from '@strapi/strapi';

let instance: Strapi;

export async function setupStrapi() {
  if (!instance) {
    instance = await Strapi().load();
  }
  return instance;
}

export async function teardownStrapi() {
  if (instance) {
    await instance.destroy();
    instance = undefined;
  }
}