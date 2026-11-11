import assert from 'node:assert/strict';
import {buildMiniPrompt,normalizeMiniRequest} from '../netlify/functions/nexoffice-mini.mjs';

const normalized=normalizeMiniRequest({question:' Posso cobrar multa de atraso no meu contrato? ',contextSummary:'Empresa de serviços B2B.',mode:'light_analysis',workspaceRef:'workspace-123'});
assert.equal(normalized.question,'Posso cobrar multa de atraso no meu contrato?');
assert.equal(normalized.mode,'light_analysis');
assert.equal(normalized.workspaceRef,'workspace-123');

const prompt=buildMiniPrompt(normalized);
assert.match(prompt,/NexJud Mini/);
assert.match(prompt,/Não dê parecer definitivo/);
assert.match(prompt,/NÃO possui consulta jurídica em tempo real/);
assert.match(prompt,/escalonamento recomendado/);
assert.match(prompt,/Empresa de serviços B2B/);
assert.doesNotMatch(prompt,/probabilidade de êxito.*[0-9]+%/i);

const huge=normalizeMiniRequest({question:'x'.repeat(9000),contextSummary:'y'.repeat(5000)});
assert.equal(huge.question.length,6000);
assert.equal(huge.contextSummary.length,3000);
assert.equal(huge.mode,'question');

console.log('NexJud Mini NexOffice bridge contract OK');
