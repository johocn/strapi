import { createStrapi } from "@strapi/strapi";

let instance: any;

export async function setupStrapi() {
  if (!instance) {
    instance = await createStrapi().load();
  }
  return instance;
}

export async function teardownStrapi() {
  if (instance) {
    await instance.destroy();
    instance = undefined;
  }
}