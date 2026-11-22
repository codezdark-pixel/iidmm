function hasStaffHelpAccess(member, staffRoles) {
  const memberRoleIds = member?.roles?.cache
    ? [...member.roles.cache.keys()]
    : Array.isArray(member?.roles)
      ? member.roles
      : [];
  const configuredStaffRoleIds = [
    staffRoles.staff
  ].filter(Boolean);

  return configuredStaffRoleIds.some(roleId => memberRoleIds.includes(roleId));
}

module.exports = { hasStaffHelpAccess };
