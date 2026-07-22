let instance: any;

export async function setupStrapi() {
  if (!instance) {
    const { createStrapi } = await import("@strapi/strapi");
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