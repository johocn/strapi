import { closeStudioQueues } from './utils/queue';

export default async () => {
  try {
    await closeStudioQueues();
  } catch {
    // ignore
  }
};
