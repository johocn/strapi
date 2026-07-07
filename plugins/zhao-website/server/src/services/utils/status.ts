export const STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type ContentStatus = (typeof STATUS)[keyof typeof STATUS];

export function isValidStatus(s: string): s is ContentStatus {
  return Object.values(STATUS).includes(s as ContentStatus);
}

/**
 * 应用 status 变更：published 时设置 publishedAt
 */
export function applyStatusChange(data: any, newStatus: ContentStatus): any {
  const now = new Date().toISOString();
  if (newStatus === STATUS.PUBLISHED && !data.publishedAt) {
    return { ...data, status: newStatus, publishedAt: now };
  }
  if (newStatus === STATUS.DRAFT) {
    return { ...data, status: newStatus, publishedAt: null };
  }
  return { ...data, status: newStatus };
}
