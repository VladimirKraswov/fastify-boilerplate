import { Permission, Permissions } from './permissions.js';

export const RolePerms: Record<string, Permission[]> = {
  user: [Permissions.FilesRead, Permissions.FilesWrite],
  manager: [Permissions.UsersRead, Permissions.FilesRead, Permissions.FilesWrite],
  admin: [Permissions.Admin]
};

export function expandPerms(roles: string[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) {
    for (const p of RolePerms[r] ?? []) set.add(p);
  }
  return [...set];
}

export function hasPerm(userPerms: Permission[], need: Permission | Permission[]) {
  const needs = Array.isArray(need) ? need : [need];
  if (userPerms.includes(Permissions.Admin)) return true;
  return needs.every((n) => userPerms.includes(n));
}
