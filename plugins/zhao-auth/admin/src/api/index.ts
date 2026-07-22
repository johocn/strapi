// admin/src/api/index.ts
const API_BASE = '/api/zhao-auth/v1/admin';

export async function fetchMyInfo() {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to fetch me: ${res.status}`);
  return res.json();
}

export async function fetchUsers(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  const res = await fetch(`${API_BASE}/users?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json();
}

export async function fetchUserDetail(documentId: string) {
  const res = await fetch(`${API_BASE}/users/${documentId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  return res.json();
}

export async function assignRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE}/users/${userId}/roles`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`Failed to assign role: ${res.status}`);
  return res.json();
}

export async function revokeRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE}/users/${userId}/roles/${role}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to revoke role: ${res.status}`);
  return res.json();
}

export async function updateChannelScope(userId: string, scope: { all: boolean; channelIds: string[] }) {
  const res = await fetch(`${API_BASE}/users/${userId}/channel-scope`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scope),
  });
  if (!res.ok) throw new Error(`Failed to update channel scope: ${res.status}`);
  return res.json();
}

export async function fetchPermissionMatrix() {
  const res = await fetch(`${API_BASE}/permissions/matrix`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch matrix: ${res.status}`);
  return res.json();
}

export async function updateRolePermissions(role: string, permissions: string[]) {
  const res = await fetch(`${API_BASE}/permissions/roles/${role}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) throw new Error(`Failed to update role permissions: ${res.status}`);
  return res.json();
}

export async function resetRolePermissions(role: string) {
  const res = await fetch(`${API_BASE}/permissions/roles/${role}/reset`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to reset role permissions: ${res.status}`);
  return res.json();
}

export async function fetchAllActions() {
  const res = await fetch(`${API_BASE}/permissions/actions`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch actions: ${res.status}`);
  return res.json();
}

export async function fetchLogs(params: { page?: number; pageSize?: number; action?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.action) qs.set('action', params.action);
  const res = await fetch(`${API_BASE}/logs?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json();
}

export async function checkPermission(userId: number, action: string) {
  const res = await fetch(`${API_BASE}/check`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, action }),
  });
  if (!res.ok) throw new Error(`Failed to check permission: ${res.status}`);
  return res.json();
}

export async function fetchAssignableRoles() {
  const res = await fetch(`${API_BASE}/roles`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);
  return res.json();
}
