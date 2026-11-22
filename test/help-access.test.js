const test = require('node:test');
const assert = require('node:assert/strict');
const { hasStaffHelpAccess } = require('../src/help-access');

const staffRoles = {
  staff: '100000000000000000',
  exchanger: '100000000000000001',
  markets: { inr: '100000000000000002', pp: '' },
  statuses: {
    break: '100000000000000003',
    restricted: '',
    retired: '',
    suspended: ''
  }
};

test('grants staff help to configured staff roles', () => {
  assert.equal(hasStaffHelpAccess({ roles: [staffRoles.staff] }, staffRoles), true);
  assert.equal(hasStaffHelpAccess({ roles: { cache: new Map([[staffRoles.staff, {}]]) } }, staffRoles), true);
});

test('exchanger and market roles do not grant staff help access', () => {
  assert.equal(hasStaffHelpAccess({ roles: [staffRoles.exchanger] }, staffRoles), false);
  assert.equal(hasStaffHelpAccess({ roles: [staffRoles.markets.inr] }, staffRoles), false);
});

test('does not grant staff help to regular members', () => {
  assert.equal(hasStaffHelpAccess({ roles: ['100000000000000099'] }, staffRoles), false);
  assert.equal(hasStaffHelpAccess(null, staffRoles), false);
});

test('does not treat status roles as active staff access', () => {
  const restrictedMember = { roles: [staffRoles.statuses.break] };
  assert.equal(hasStaffHelpAccess(restrictedMember, staffRoles), false);
});
