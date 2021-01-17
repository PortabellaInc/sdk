export enum Role {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Guest = 'guest',
}

export enum IntegrationRole {
  Writer = 'writer',
  Reader = 'reader',
  ProjectAdmin = 'project_admin',
}

export enum Permission {
  Admin = 'admin',
  Write = 'write',
  Read = 'read',
}

export const Permissions: {[x in Role | IntegrationRole]: Permission[]} = {
  [Role.Owner]: [Permission.Admin, Permission.Write, Permission.Read],
  [Role.Admin]: [Permission.Admin, Permission.Write, Permission.Read],
  [Role.Member]: [Permission.Write, Permission.Read],
  [Role.Guest]: [Permission.Read],

  [IntegrationRole.Writer]: [Permission.Write],
  [IntegrationRole.Reader]: [Permission.Read],
  [IntegrationRole.ProjectAdmin]: [Permission.Write, Permission.Read],
};

export const isAdmin = (role: Role) => {
  return role === Role.Owner || role === Role.Admin;
};

export const hasPermission = (
  role: Role | IntegrationRole | undefined,
  perm: Permission
) => {
  if (!role) {
    return false;
  }

  return Permissions[role].includes(perm);
};
