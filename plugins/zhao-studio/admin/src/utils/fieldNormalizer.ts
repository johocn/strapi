// 将 Strapi v5 documentId 标准化为 id（供组件使用）
// 保留所有原始字段，仅补充 id 字段
export const normalizeRecord = <T extends { documentId?: string; id?: string }>(
  record: T
): T & { id: string } => {
  if (!record) return record;
  return { ...record, id: record.documentId || record.id };
};

export const normalizeList = <T extends { documentId?: string; id?: string }>(
  list: T[] = []
): (T & { id: string })[] => list.map(normalizeRecord);
