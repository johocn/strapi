import type { Core } from "@strapi/strapi";
import { closeRedisClient } from "./utils/redis";
import { closeBatchGrantQueue } from "./utils/queue";

const destroy = ({ strapi: _strapi }: { strapi: Core.Strapi }) => {
  closeRedisClient();
  closeBatchGrantQueue();
};

export default destroy;
