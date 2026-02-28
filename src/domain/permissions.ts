export const Permissions = {
  UsersRead: 'users:read',
  UsersWrite: 'users:write',
  FilesRead: 'files:read',
  FilesWrite: 'files:write',
  Admin: 'admin:*'
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
