import { closeStudioQueues } from './utils/queue';

export default ({ strapi }: { strapi: any }) => {
  try {
    closeStudioQueues();
  } catch {
    // ignore
  }
};
