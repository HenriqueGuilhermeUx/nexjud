import assert from 'node:assert/strict';
import { resolveNexOfficeIdentity } from '../netlify/functions/nexoffice-handoff.mjs';
import { buildLegalActivitySignal } from '../netlify/functions/nexoffice-legal-signals.mjs';

const owner = resolveNexOfficeIdentity({ id: 'owner-1', email: 'owner@example.com', app_metadata: {}, user_metadata: {} });
assert.deepEqual(owner, { externalWorkspaceRef: 'owner-1', externalUserSubject: 'owner-1', memberRole: 'owner', sharedWorkspace: false });

const member = resolveNexOfficeIdentity({ id: 'member-1', email: 'member@example.com', app_metadata: { nexoffice_workspace_ref: 'firm-1', nexoffice_role: 'member' }, user_metadata: { nexoffice_workspace_ref: 'spoofed', nexoffice_role: 'owner' } });
assert.equal(member.externalWorkspaceRef, 'firm-1');
assert.equal(member.memberRole, 'member');
assert.equal(member.sharedWorkspace, true);

const signal = buildLegalActivitySignal({ identity: member, counts: { strategicAnalyses: 2, drafts: 1, judgeSessions: 3, agentRuns: 4 }, now: new Date('2026-09-16T12:00:00.000Z') });
const serialized = JSON.stringify(signal);
assert.equal(signal.sourceProduct, 'nexjud');
assert.equal(signal.signalType, 'activity.summary');
assert.equal(signal.externalWorkspaceRef, 'firm-1');
assert.deepEqual(Object.keys(signal.metrics).sort(), ['agentRuns','drafts','judgeSessions','strategicAnalyses'].sort());
for (const forbidden of ['processNumber','clientName','caseId','legalText','document','documentText','precedent','jurisprudence','member-1']) assert.equal(serialized.includes(forbidden), false, `forbidden raw/canonical value leaked: ${forbidden}`);

const second = buildLegalActivitySignal({ identity: member, counts: { strategicAnalyses: 9 }, now: new Date('2026-09-16T20:00:00.000Z') });
assert.equal(second.correlationId, signal.correlationId, 'daily member signal must remain idempotent');

console.log(JSON.stringify({ ok: true, stagingSafe: true, tenantIsolation: true, roles: true, aggregateOnly: true, idempotent: true, externalEffectsRequired: false }, null, 2));
