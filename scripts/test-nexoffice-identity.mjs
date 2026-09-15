import assert from 'node:assert/strict';
import {resolveNexOfficeIdentity} from '../netlify/functions/nexoffice-handoff.mjs';

const personal=resolveNexOfficeIdentity({
  id:'user-1',
  email:'owner@example.com',
  app_metadata:{},
  user_metadata:{office_id:'spoofed-office',nexoffice_role:'admin'}
});
assert.equal(personal.externalWorkspaceRef,'user-1');
assert.equal(personal.memberRole,'owner');
assert.equal(personal.sharedWorkspace,false);

const sharedOwner=resolveNexOfficeIdentity({
  id:'user-1',
  email:'owner@example.com',
  app_metadata:{nexoffice_workspace_ref:'office-123',nexoffice_role:'owner'},
  user_metadata:{}
});
assert.equal(sharedOwner.externalWorkspaceRef,'office-123');
assert.equal(sharedOwner.memberRole,'owner');
assert.equal(sharedOwner.sharedWorkspace,true);

const sharedMember=resolveNexOfficeIdentity({
  id:'user-2',
  email:'member@example.com',
  app_metadata:{organization_id:'office-123',organization_role:'member'},
  user_metadata:{}
});
assert.equal(sharedMember.externalWorkspaceRef,'office-123');
assert.equal(sharedMember.memberRole,'member');
assert.equal(sharedMember.sharedWorkspace,true);

const invalidRole=resolveNexOfficeIdentity({
  id:'user-3',
  email:'member@example.com',
  app_metadata:{office_id:'office-123',office_role:'superadmin'},
  user_metadata:{}
});
assert.equal(invalidRole.memberRole,'owner');

console.log(JSON.stringify({ok:true,cases:4}));