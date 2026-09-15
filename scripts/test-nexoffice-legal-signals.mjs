import { buildLegalActivitySignal } from '../netlify/functions/nexoffice-legal-signals.mjs';

const assert=(value,message)=>{if(!value)throw new Error(`ASSERT: ${message}`)};
const identity={externalWorkspaceRef:'office-123',externalUserSubject:'supabase-user-sensitive-id',sharedWorkspace:true};
const now=new Date('2026-09-15T18:00:00.000Z');
const signal=buildLegalActivitySignal({identity,counts:{strategicAnalyses:4,drafts:3,judgeSessions:2,agentRuns:5},now});

assert(signal.sourceProduct==='nexjud','source is NexJud');
assert(signal.externalWorkspaceRef==='office-123','workspace ref preserved');
assert(signal.signalType==='activity.summary','activity signal type');
assert(signal.dimensions.scope==='member','shared workspace uses anonymous member scope');
assert(signal.dimensions.window==='day','daily window');
assert(signal.metrics.strategicAnalyses===4&&signal.metrics.drafts===3&&signal.metrics.judgeSessions===2&&signal.metrics.agentRuns===5,'only aggregate counts are emitted');
assert(!JSON.stringify(signal).includes(identity.externalUserSubject),'raw user subject never leaves NexJud in signal payload');
assert(!('processNumber' in signal)&&!('clientName' in signal)&&!('caseId' in signal)&&!('legalText' in signal),'no legal identifiers or text fields');
assert(signal.correlationId.startsWith('nexjud-activity-2026-09-15-'),'correlation is date scoped');
const again=buildLegalActivitySignal({identity,counts:{strategicAnalyses:9,drafts:0,judgeSessions:1,agentRuns:0},now});
assert(again.correlationId===signal.correlationId,'same member/day updates idempotently');

const solo=buildLegalActivitySignal({identity:{...identity,externalWorkspaceRef:'solo',sharedWorkspace:false},counts:{},now});
assert(solo.dimensions.scope==='workspace','single-user workspace emits workspace aggregate');
assert(Object.values(solo.metrics).every(value=>value===0),'missing counts default to zero');

console.log(JSON.stringify({ok:true,privacy:'aggregate_only',scope:signal.dimensions.scope,idempotentCorrelation:true},null,2));
