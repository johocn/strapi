export function generateChannelPath(channelId: number, parentPath: string | null): string {
  if (!parentPath) {
    return `/${channelId}`;
  }
  return `${parentPath}/${channelId}`;
}

export function getChannelDepth(path: string | null): number {
  if (!path) {
    return 0;
  }
  return path.split("/").filter((p) => p).length;
}

export function parseChannelPath(path: string): number[] {
  if (!path) {
    return [];
  }
  return path.split("/").filter((p) => p).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
}

export function buildPath(parentPath: string, childId: number): string {
  const normalizedParent = parentPath.endsWith("/") ? parentPath : `${parentPath}/`;
  return `${normalizedParent}${childId}/`;
}

export function parsePathIds(path: string): number[] {
  if (!path) {
    return [];
  }
  return path.split("/").filter((p) => p && p !== "/").map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
}

export function getPathPrefix(path: string): string {
  if (!path) {
    return "/";
  }
  return path.endsWith("/") ? path : `${path}/`;
}

export async function getDescendantIdsByPath(strapi: any, path: string, includeSelf: boolean): Promise<number[]> {
  if (!path) {
    return [];
  }
  
  const prefix = getPathPrefix(path);
  const query: any = {
    path: { $startsWith: prefix },
  };
  
  if (!includeSelf) {
    const selfId = parsePathIds(path).pop();
    if (selfId) {
      query.id = { $ne: selfId };
    }
  }
  
  const descendants = await strapi.db.query("plugin::zhao-channel.channel").findMany({
    where: query,
    select: ["id"],
  });
  
  return descendants.map((d: any) => d.id);
}